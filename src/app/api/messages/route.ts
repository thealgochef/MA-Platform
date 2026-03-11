import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role, status, firm_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.status !== "approved") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get all engagements where user is a participant
  // For buyers: engagements where buyer_user_id = user.id
  // For brokers: engagements on deals where user is the point_of_contact_id
  let engagements;

  if (profile.role === "buyer") {
    const { data } = await supabase
      .from("deal_engagements")
      .select(`
        id,
        stage,
        deal_id,
        buyer_user_id,
        deals!inner (
          id,
          headline,
          point_of_contact_id,
          users!deals_point_of_contact_id_fkey (
            full_name,
            firms!inner ( name )
          )
        )
      `)
      .eq("buyer_user_id", user.id)
      .not("stage", "in", '("declined")');
    engagements = data;
  } else if (profile.role === "broker") {
    const { data } = await supabase
      .from("deal_engagements")
      .select(`
        id,
        stage,
        deal_id,
        buyer_user_id,
        deals!inner (
          id,
          headline,
          point_of_contact_id
        ),
        users!deal_engagements_buyer_user_id_fkey (
          full_name,
          firms!inner ( name )
        )
      `)
      .not("stage", "in", '("declined")')
      .eq("deals.point_of_contact_id", user.id);
    engagements = data;
  } else {
    // Admin can see all
    const { data } = await supabase
      .from("deal_engagements")
      .select(`
        id,
        stage,
        deal_id,
        buyer_user_id,
        deals!inner ( id, headline, point_of_contact_id ),
        users!deal_engagements_buyer_user_id_fkey ( full_name, firms!inner ( name ) )
      `)
      .not("stage", "in", '("declined")');
    engagements = data;
  }

  if (!engagements) {
    return NextResponse.json({ threads: [] });
  }

  // For each engagement, fetch the last message for preview
  const threads = await Promise.all(
    engagements.map(async (eng: Record<string, unknown>) => {
      const { data: lastMsg } = await supabase
        .from("messages")
        .select("content, created_at, sender_id")
        .eq("engagement_id", eng.id as string)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      // Count unread messages (messages not sent by current user, after last read)
      const { count: unreadCount } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("engagement_id", eng.id as string)
        .neq("sender_id", user.id)
        .gt("created_at", lastMsg?.created_at || "1970-01-01");

      return {
        engagementId: eng.id,
        dealId: eng.deal_id,
        stage: eng.stage,
        deal: eng.deals,
        otherParty: profile.role === "buyer"
          ? (eng.deals as Record<string, unknown>)?.users
          : eng.users,
        headline: ((eng.deals as Record<string, unknown>)?.headline) || "",
        firm: profile.role === "buyer"
          ? ((eng.deals as Record<string, unknown>)?.users as Record<string, unknown>)?.firms
          : (eng.users as Record<string, unknown>)?.firms,
        lastMessage: lastMsg
          ? { content: lastMsg.content, created_at: lastMsg.created_at, sender_id: lastMsg.sender_id }
          : null,
        unread: (unreadCount || 0) > 0,
      };
    })
  );

  // Sort by most recent message (threads with messages first, then by created_at)
  threads.sort((a, b) => {
    const aTime = a.lastMessage?.created_at || "1970-01-01";
    const bTime = b.lastMessage?.created_at || "1970-01-01";
    return bTime.localeCompare(aTime);
  });

  return NextResponse.json({ threads });
}
