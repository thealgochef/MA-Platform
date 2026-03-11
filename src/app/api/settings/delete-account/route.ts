import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyBuyers } from "@/lib/notifications";

export async function POST(request: Request) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Require typing "DELETE" to confirm
  if (body.confirmation !== "DELETE") {
    return NextResponse.json(
      { error: "You must type DELETE to confirm account deletion" },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();

  // Get user profile
  const { data: profile } = await adminClient
    .from("users")
    .select("role, firm_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Role-specific cleanup
  if (profile.role === "broker") {
    // Terminate all active deals owned by broker's firm
    const { data: activeDeals } = await adminClient
      .from("deals")
      .select("id")
      .eq("firm_id", profile.firm_id)
      .not("status", "in", '("terminated","closed")');

    if (activeDeals && activeDeals.length > 0) {
      const dealIds = activeDeals.map((d) => d.id);

      // Terminate all deals
      await adminClient
        .from("deals")
        .update({ status: "terminated" })
        .in("id", dealIds);

      // Terminate all engagements on those deals
      await adminClient
        .from("deal_engagements")
        .update({ stage: "terminated" })
        .in("deal_id", dealIds);

      // Notify buyers for each deal
      for (const dealId of dealIds) {
        notifyBuyers("deal_terminated", dealId);
      }
    }
  } else if (profile.role === "buyer") {
    // Set all active buyer engagements to passed (no reason recorded)
    await adminClient
      .from("deal_engagements")
      .update({ stage: "passed" })
      .eq("buyer_user_id", user.id)
      .not("stage", "in", '("passed","terminated","closed","declined")');
  }

  // Check if user is the only firm member
  if (profile.firm_id) {
    const { count } = await adminClient
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("firm_id", profile.firm_id);

    if (count === 1) {
      // Sole member — delete firm (cascade will handle related records)
      await adminClient
        .from("firms")
        .delete()
        .eq("id", profile.firm_id);
    }
    // If other members exist, firm + deals persist, user is just removed
  }

  // Delete user record from public.users (cascades notification_preferences, etc.)
  await adminClient
    .from("users")
    .delete()
    .eq("id", user.id);

  // Delete auth record
  await adminClient.auth.admin.deleteUser(user.id);

  return NextResponse.json({ success: true });
}
