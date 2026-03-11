import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
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

  // Check if engagement already exists
  const { data: existing } = await supabase
    .from("deal_engagements")
    .select("id, stage")
    .eq("deal_id", params.id)
    .eq("buyer_user_id", user.id)
    .single();

  if (existing) {
    // Update existing engagement to declined (reversible — buyer can pursue later)
    const { data: engagement, error } = await supabase
      .from("deal_engagements")
      .update({ stage: "declined" })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to decline deal" }, { status: 500 });
    }

    return NextResponse.json({ engagement });
  }

  // Create new engagement with declined stage
  // No reason required. Broker CANNOT see who declined.
  const { data: engagement, error } = await supabase
    .from("deal_engagements")
    .insert({
      deal_id: params.id,
      buyer_user_id: user.id,
      buyer_firm_id: profile.firm_id,
      stage: "declined",
      nda_status: "not_sent",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to decline deal" }, { status: 500 });
  }

  return NextResponse.json({ engagement }, { status: 201 });
}
