import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: activities, error } = await supabase
    .from("deal_activity_log")
    .select(`
      *,
      actor:actor_id (id, full_name, email, role)
    `)
    .eq("deal_id", params.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch timeline" }, { status: 500 });
  }

  return NextResponse.json({ activities: activities || [] });
}
