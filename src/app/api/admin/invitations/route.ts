import * as supabaseAdmin from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { notifyAdmin } from "@/lib/notifications";
import { adminInvitationCreateSchema } from "@/lib/validators";
import { isAuthResponse, requireRole } from "@/server/auth";

export async function POST(request: Request) {
  try {
    const context = await requireRole("admin");
    if (isAuthResponse(context)) return context;

    const body = await request.json().catch(() => null);
    const parsed = adminInvitationCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "email, firmId, and role are required" },
        { status: 400 }
      );
    }

    const { email, firmId, role } = parsed.data;

    const adminClient = supabaseAdmin.createAdminClient();

    // Generate a unique invitation token
    const invitationToken = crypto.randomUUID();

    // Store invitations separately from public.users. public.users.id is tied
    // to auth.users(id), so invitees get/keep their profile only after OAuth.
    const { data: invitation, error: insertError } = await adminClient
      .from("firm_invitations")
      .insert({
        email,
        firm_id: firmId,
        role,
        invitation_token: invitationToken,
        invited_by: context.user.id,
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
    notifyAdmin("invitation_sent", invitation.id);

    return NextResponse.json({
      success: true,
      invitationLink,
      invitationId: invitation.id,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
