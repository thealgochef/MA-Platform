import { NextResponse } from "next/server";
import { projectActiveStatusUpdateSchema } from "@/lib/validators";
import { isAuthResponse, requireBuyerProjectAccess, requireRole } from "@/server/auth";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const context = await requireRole("buyer");
  if (isAuthResponse(context)) return context;

  const { supabase } = context;

  const existing = await requireBuyerProjectAccess(supabase, context.user.id, params.id, "id");
  if (isAuthResponse(existing)) return existing;

  const body = await request.json().catch(() => null);
  if (body === null) {
    return NextResponse.json({ error: "Malformed JSON" }, { status: 400 });
  }

  const parsed = projectActiveStatusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: project, error } = await supabase
    .from("buyer_projects")
    .update({ is_active: parsed.data.isActive })
    .eq("id", params.id)
    .eq("buyer_user_id", context.user.id)
    .select("id, is_active")
    .single();

  if (error || !project) {
    return NextResponse.json({ error: "Failed to update project status" }, { status: 500 });
  }

  return NextResponse.json({ project });
}
