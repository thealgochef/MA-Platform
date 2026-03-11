import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { projectCreateSchema } from "@/lib/validators";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role, status")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "buyer" || profile.status !== "approved") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: projects, error } = await supabase
    .from("buyer_projects")
    .select("*")
    .eq("buyer_user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }

  return NextResponse.json({ projects: projects || [] });
}

export async function POST(request: Request) {
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

  if (!profile || profile.role !== "buyer" || profile.status !== "approved") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = projectCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  const { data: project, error } = await supabase
    .from("buyer_projects")
    .insert({
      buyer_user_id: user.id,
      buyer_firm_id: profile.firm_id,
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
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }

  return NextResponse.json({ project }, { status: 201 });
}
