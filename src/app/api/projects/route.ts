import { NextResponse } from "next/server";
import { projectCreateSchema } from "@/lib/validators";
import { isAuthResponse, requireRole } from "@/server/auth";
import { mapProjectDataToDb } from "@/server/projects/mappers";

export async function GET() {
  const context = await requireRole("buyer");
  if (isAuthResponse(context)) return context;
  const { supabase, user } = context;

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
  const context = await requireRole("buyer");
  if (isAuthResponse(context)) return context;
  const { supabase, user, profile } = context;

  const body = await request.json().catch(() => null);
  if (body === null) {
    return NextResponse.json({ error: "Malformed JSON" }, { status: 400 });
  }
  const parsed = projectCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  // mapProjectDataToDb saves industry, revenue, EBITDA, margin, location, and keyword criteria.
  const { data: project, error } = await supabase
    .from("buyer_projects")
    .insert({
      buyer_user_id: user.id,
      buyer_firm_id: profile.firm_id,
      ...mapProjectDataToDb(data),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }

  return NextResponse.json({ project }, { status: 201 });
}
