import * as supabaseAdmin from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { notifyAdmin } from "@/lib/notifications";
import { adminApplicationsActionSchema } from "@/lib/validators";
import { isAuthResponse, requireRole } from "@/server/auth";

export async function GET() {
  const context = await requireRole("admin");
  if (isAuthResponse(context)) return context;

  const { data: applications } = await context.supabase
    .from("users")
    .select("*, firms(name, website)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  return NextResponse.json({ applications: applications || [] });
}

export async function POST(request: Request) {
  try {
    const context = await requireRole("admin");
    if (isAuthResponse(context)) return context;

    const body = await request.json().catch(() => null);
    const parsed = adminApplicationsActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    const { userId, action } = parsed.data;

    const adminClient = supabaseAdmin.createAdminClient();

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
