import { NextResponse } from "next/server";
import { projectCreateSchema } from "@/lib/validators";
import { isAuthResponse, requireBuyerProjectAccess, requireRole } from "@/server/auth";
import { mapProjectDataToDb } from "@/server/projects/mappers";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const context = await requireRole("buyer");
  if (isAuthResponse(context)) return context;

  const project = await requireBuyerProjectAccess(context.supabase, context.user.id, params.id);
  if (isAuthResponse(project)) return project;

  return NextResponse.json({ project });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const context = await requireRole("buyer");
  if (isAuthResponse(context)) return context;
  const { supabase } = context;

  // Verify ownership
  const existing = await requireBuyerProjectAccess(supabase, context.user.id, params.id, "id");
  if (isAuthResponse(existing)) return existing;

  const body = await request.json().catch(() => null);
  if (body === null) {
    return NextResponse.json({ error: "Malformed JSON" }, { status: 400 });
  }
  const parsed = projectCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  const { data: project, error } = await supabase
    .from("buyer_projects")
    .update({
      ...mapProjectDataToDb(data),
    })
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }

  return NextResponse.json({ project });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const context = await requireRole("buyer");
  if (isAuthResponse(context)) return context;
  const { supabase, user } = context;

  const { error } = await supabase
    .from("buyer_projects")
    .delete()
    .eq("id", params.id)
    .eq("buyer_user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
