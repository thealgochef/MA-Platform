import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { notifyAdmin } from "@/lib/notifications";

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

    const { email, firmId, role } = await request.json();

    if (!email || !firmId || !role) {
      return NextResponse.json(
        { error: "email, firmId, and role are required" },
        { status: 400 }
      );
    }

    if (!["broker", "buyer"].includes(role)) {
      return NextResponse.json(
        { error: "Role must be broker or buyer" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Generate a unique invitation token
    const invitationToken = crypto.randomUUID();

    // Pre-create a user record with the invitation token
    const { data: invitedUser, error: insertError } = await adminClient
      .from("users")
      .insert({
        id: crypto.randomUUID(),
        full_name: email,
        email,
        role,
        status: "pending",
        firm_id: firmId,
        invitation_token: invitationToken,
        membership_agreement_signed: false,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to create invitation" },
        { status: 500 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const invitationLink = `${appUrl}/login?invitation=${invitationToken}`;

    // Placeholder: send invitation email
    notifyAdmin("invitation_sent", invitedUser.id);

    return NextResponse.json({
      success: true,
      invitationLink,
      invitedUserId: invitedUser.id,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
