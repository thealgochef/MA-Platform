import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = ReturnType<typeof createClient>;

interface DealActivityInput {
  dealId: string;
  actorId: string;
  action: string;
  metadata?: Record<string, unknown>;
}

export async function logDealActivity(
  supabase: SupabaseServerClient,
  { dealId, actorId, action, metadata = {} }: DealActivityInput
) {
  try {
    const { error } = await supabase.from("deal_activity_log").insert({
      deal_id: dealId,
      actor_id: actorId,
      action,
      metadata,
    });

    if (error) {
      console.error("Failed to log deal activity", { dealId, actorId, action, error });
    }
  } catch (error) {
    console.error("Failed to log deal activity", { dealId, actorId, action, error });
  }
}
