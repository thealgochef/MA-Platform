import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role, status, firm_id")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("[messages] Failed to load user profile", {
      userId: user.id,
      error: profileError,
    });
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }

  if (!profile || profile.status !== "approved") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get all engagements where user is a participant
  // For buyers: engagements where buyer_user_id = user.id
  // For brokers: engagements on deals where user is the point_of_contact_id
  let engagements: Record<string, unknown>[] | null = null;
  let engagementsError: { message?: string } | null = null;

  if (profile.role === "buyer") {
    const { data, error } = await supabase
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
            firms ( name )
          )
        )
      `)
      .eq("buyer_user_id", user.id)
      .not("stage", "in", '("declined")');
    engagements = data;
    engagementsError = error;
  } else if (profile.role === "broker") {
    const { data, error } = await supabase
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
          firms ( name )
        )
      `)
      .not("stage", "in", '("declined")')
      .eq("deals.point_of_contact_id", user.id);
    engagements = data;
    engagementsError = error;
  } else {
    // Admin can see all
    const { data, error } = await supabase
      .from("deal_engagements")
      .select(`
        id,
        stage,
        deal_id,
        buyer_user_id,
        deals!inner ( id, headline, point_of_contact_id ),
        users!deal_engagements_buyer_user_id_fkey ( full_name, firms ( name ) )
      `)
      .not("stage", "in", '("declined")');
    engagements = data;
    engagementsError = error;
  }

  if (engagementsError) {
    console.error("[messages] Failed to load engagements", {
      userId: user.id,
      role: profile.role,
      error: engagementsError,
    });
    return NextResponse.json({ error: "Failed to load message threads" }, { status: 500 });
  }

  if (!engagements || engagements.length === 0) {
    return NextResponse.json({ threads: [] });
  }

  const engagementIds = engagements.map((eng) => eng.id as string);

  const [{ data: readMarkers, error: readMarkersError }, { data: allMessages, error: messagesError }] = await Promise.all([
    supabase
      .from("message_thread_reads")
      .select("engagement_id, last_read_at")
      .eq("user_id", user.id)
      .in("engagement_id", engagementIds),
    supabase
      .from("messages")
      .select("engagement_id, content, created_at, sender_id")
      .in("engagement_id", engagementIds)
      .order("created_at", { ascending: false }),
  ]);

  if (readMarkersError) {
    console.error("[messages] Failed to load thread read markers", {
      userId: user.id,
      error: readMarkersError,
    });
    return NextResponse.json({ error: "Failed to load message threads" }, { status: 500 });
  }

  if (messagesError) {
    console.error("[messages] Failed to load messages for thread list", {
      userId: user.id,
      error: messagesError,
    });
    return NextResponse.json({ error: "Failed to load message threads" }, { status: 500 });
  }

  const lastReadByEngagementId = new Map<string, string>();
  for (const marker of readMarkers || []) {
    lastReadByEngagementId.set(marker.engagement_id as string, marker.last_read_at as string);
  }

  const threadSummaryByEngagementId = new Map<
    string,
    {
      lastMessage: { content: string | null; created_at: string; sender_id: string } | null;
      unread: boolean;
    }
  >();

  for (const message of allMessages || []) {
    const engagementId = message.engagement_id as string;
    const existing = threadSummaryByEngagementId.get(engagementId);
    const createdAt = message.created_at as string;

    if (!existing) {
      threadSummaryByEngagementId.set(engagementId, {
        lastMessage: {
          content: (message.content as string | null) ?? null,
          created_at: createdAt,
          sender_id: message.sender_id as string,
        },
        unread: false,
      });
    }

    if ((message.sender_id as string) === user.id) {
      continue;
    }

    const lastReadAt = lastReadByEngagementId.get(engagementId) || "1970-01-01T00:00:00.000Z";
    if (createdAt > lastReadAt) {
      const current = threadSummaryByEngagementId.get(engagementId);
      if (current && !current.unread) {
        current.unread = true;
      }
    }
  }

  const threads = engagements.map((eng) => {
    const summary = threadSummaryByEngagementId.get(eng.id as string);

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
      lastMessage: summary?.lastMessage ?? null,
      unread: summary?.unread ?? false,
    };
  });

  // Sort by most recent message (threads with messages first, then by created_at)
  threads.sort((a, b) => {
    const aTime = a.lastMessage?.created_at || "1970-01-01";
    const bTime = b.lastMessage?.created_at || "1970-01-01";
    return bTime.localeCompare(aTime);
  });

  return NextResponse.json({ threads });
}
