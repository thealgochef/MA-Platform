import { NextResponse } from "next/server";
import { isAuthResponse, requireRole } from "@/server/auth";

export async function GET() {
  const context = await requireRole("admin");
  if (isAuthResponse(context)) return context;

  const { data: users } = await context.supabase
    .from("users")
    .select("*, firms(name)")
    .order("created_at", { ascending: false });

  return NextResponse.json({ users: users || [] });
}
