import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { notifyAdmin } from "@/lib/notifications";

export async function GET() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify admin role
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: applications } = await supabase
    .from("users")
    .select("*, firms(name, website)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  return NextResponse.json({ applications: applications || [] });
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId, action } = await request.json();

    if (!userId || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    const newStatus = action === "approve" ? "approved" : "rejected";

    const { error: updateError } = await adminClient
      .from("users")
      .update({ status: newStatus })
      .eq("id", userId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update user status" },
        { status: 500 }
      );
    }

    // Placeholder notification
    notifyAdmin(`user_${newStatus}`, userId);

    // Handle invitation for additional firm members
    if (action === "approve") {
      const { data: approvedUser } = await adminClient
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (approvedUser) {
        // Create notification preferences for the user
        await adminClient.from("notification_preferences").upsert({
          user_id: userId,
          preferences: {},
        });
      }
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
