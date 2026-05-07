import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { User, UserRole } from "@/types";

type SupabaseServerClient = ReturnType<typeof createClient>;
type AuthUser = Awaited<ReturnType<SupabaseServerClient["auth"]["getUser"]>>["data"]["user"];

export type ApiProfile = User & Record<string, unknown>;

export interface UserContext {
  supabase: SupabaseServerClient;
  user: NonNullable<AuthUser>;
}

export interface ApprovedUserContext extends UserContext {
  profile: ApiProfile;
}

export function isAuthResponse<T>(result: T | NextResponse): result is NextResponse {
  return result instanceof Response;
}

export async function requireUser(): Promise<UserContext | NextResponse> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return { supabase, user };
}

export async function requireApprovedUser(): Promise<ApprovedUserContext | NextResponse> {
  const context = await requireUser();

  if (isAuthResponse(context)) {
    return context;
  }

  const { data: profile, error } = await context.supabase
    .from("users")
    .select("*")
    .eq("id", context.user.id)
    .single();

  if (error || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 403 });
  }

  if (profile.status !== "approved") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return { ...context, profile: profile as ApiProfile };
}

export async function requireRole(
  roleOrRoles: UserRole | UserRole[]
): Promise<ApprovedUserContext | NextResponse> {
  const context = await requireApprovedUser();

  if (isAuthResponse(context)) {
    return context;
  }

  const allowedRoles = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];

  if (!allowedRoles.includes(context.profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return context;
}

export async function requireBuyerProjectAccess(
  supabase: SupabaseServerClient,
  userId: string,
  projectId: string,
  select = "*"
) {
  const { data: project, error } = await supabase
    .from("buyer_projects")
    .select(select)
    .eq("id", projectId)
    .eq("buyer_user_id", userId)
    .single();

  if (error || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return project;
}

export async function requireBrokerDealAccess(
  supabase: SupabaseServerClient,
  profile: Pick<ApiProfile, "firm_id">,
  dealId: string,
  select = "*"
) {
  if (!profile.firm_id) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  const { data: deal, error } = await supabase
    .from("deals")
    .select(select)
    .eq("id", dealId)
    .eq("firm_id", profile.firm_id)
    .single();

  if (error || !deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  return deal;
}
