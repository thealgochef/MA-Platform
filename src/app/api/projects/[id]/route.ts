import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { projectCreateSchema } from "@/lib/validators";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: project, error } = await supabase
    .from("buyer_projects")
    .select("*")
    .eq("id", params.id)
    .eq("buyer_user_id", user.id)
    .single();

  if (error || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ project });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership
  const { data: existing } = await supabase
    .from("buyer_projects")
    .select("id")
    .eq("id", params.id)
    .eq("buyer_user_id", user.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = projectCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  const { data: project, error } = await supabase
    .from("buyer_projects")
    .update({
      name: data.projectName,
      industry: data.industry || null,
      revenue_min: data.revenueMin || null,
      revenue_max: data.revenueMax || null,
      ebitda_min: data.ebitdaMin || null,
      ebitda_max: data.ebitdaMax || null,
      ebitda_margin: data.ebitdaMargin || null,
      location: data.location || null,
      keywords: data.keywords || [],
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
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
