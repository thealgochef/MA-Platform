import { NextResponse } from "next/server";
import { settingsNotificationsUpdateSchema } from "@/lib/validators";
import { isAuthResponse, requireUser } from "@/server/auth";

export async function GET() {
  const context = await requireUser();
  if (isAuthResponse(context)) return context;
  const { supabase, user } = context;

  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return existing preferences or empty defaults
  return NextResponse.json({
    preferences: data?.preferences ?? {},
  });
}

export async function PATCH(request: Request) {
  const context = await requireUser();
  if (isAuthResponse(context)) return context;
  const { supabase, user } = context;

  const body = await request.json().catch(() => null);
  const parsed = settingsNotificationsUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid preferences format" },
      { status: 400 }
    );
  }

  const { preferences } = parsed.data;

  // Upsert notification preferences
  const { error } = await supabase
    .from("notification_preferences")
    .upsert(
      {
        user_id: user.id,
        preferences,
      },
      { onConflict: "user_id" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
