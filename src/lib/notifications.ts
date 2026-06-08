import { createAdminClient } from "@/lib/supabase/admin";

type NotificationPreferencesValue = {
  email?: boolean;
  in_platform?: boolean;
};

const EVENT_KEY_NORMALIZATION: Record<string, string> = {
  deal_closure_buyer_reported: "deal_close_reported",
  vetting_rejected: "nda_rejected",
};

const normalizeEventKey = (event: string) => EVENT_KEY_NORMALIZATION[event] ?? event;

const getInPlatformEligibilityByUser = async (userIds: string[], event: string) => {
  if (userIds.length === 0) {
    return new Map<string, boolean>();
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("notification_preferences")
    .select("user_id, preferences")
    .in("user_id", userIds);

  if (error) {
    throw error;
  }

  const map = new Map<string, boolean>();
  for (const userId of userIds) {
    map.set(userId, true);
  }

  for (const row of data || []) {
    const preferences = (row.preferences || {}) as Record<string, NotificationPreferencesValue>;
    const eventPreference = preferences[event];

    if (eventPreference && eventPreference.in_platform === false) {
      map.set(row.user_id as string, false);
    }
  }

  return map;
};

async function notifyAdminAsync(event: string, userId: string) {
  const normalizedEvent = normalizeEventKey(event);
  const adminClient = createAdminClient();

  const { data: admins, error: adminsError } = await adminClient
    .from("users")
    .select("id")
    .eq("role", "admin")
    .eq("status", "approved");

  if (adminsError) {
    throw adminsError;
  }

  const rows = (admins || []).map((admin) => ({
    user_id: admin.id,
    event: normalizedEvent,
    metadata: { reference_id: userId },
  }));

  if (rows.length === 0) {
    return;
  }

  const { error: insertError } = await adminClient.from("notifications").insert(rows);

  if (insertError) {
    throw insertError;
  }
}

async function notifyBrokerAsync(event: string, dealId: string, engagementId?: string) {
  const normalizedEvent = normalizeEventKey(event);
  const adminClient = createAdminClient();

  if (engagementId) {
    const { data: engagement, error: engagementError } = await adminClient
      .from("deal_engagements")
      .select("id")
      .eq("id", engagementId)
      .eq("deal_id", dealId)
      .maybeSingle();

    if (engagementError) {
      throw engagementError;
    }

    if (!engagement) {
      return;
    }
  }

  const { data: deal, error: dealError } = await adminClient
    .from("deals")
    .select("point_of_contact_id")
    .eq("id", dealId)
    .single();

  if (dealError) {
    throw dealError;
  }

  const brokerUserId = deal?.point_of_contact_id as string | undefined;
  if (!brokerUserId) {
    return;
  }

  const { data: broker, error: brokerError } = await adminClient
    .from("users")
    .select("id")
    .eq("id", brokerUserId)
    .eq("role", "broker")
    .eq("status", "approved")
    .maybeSingle();

  if (brokerError) {
    throw brokerError;
  }

  if (!broker) {
    return;
  }

  const eligibility = await getInPlatformEligibilityByUser([brokerUserId], normalizedEvent);
  if (!eligibility.get(brokerUserId)) {
    return;
  }

  const { error: insertError } = await adminClient.from("notifications").insert({
    user_id: brokerUserId,
    event: normalizedEvent,
    deal_id: dealId,
    engagement_id: engagementId ?? null,
    metadata: {},
  });

  if (insertError) {
    throw insertError;
  }
}

async function notifyBuyerAsync(event: string, dealId: string, buyerUserId: string) {
  const normalizedEvent = normalizeEventKey(event);
  const adminClient = createAdminClient();

  const { data: buyer, error: buyerError } = await adminClient
    .from("users")
    .select("id")
    .eq("id", buyerUserId)
    .eq("role", "buyer")
    .eq("status", "approved")
    .maybeSingle();

  if (buyerError) {
    throw buyerError;
  }

  if (!buyer) {
    return;
  }

  const { data: engagement, error: engagementError } = await adminClient
    .from("deal_engagements")
    .select("id")
    .eq("deal_id", dealId)
    .eq("buyer_user_id", buyerUserId)
    .maybeSingle();

  if (engagementError) {
    throw engagementError;
  }

  if (!engagement) {
    return;
  }

  const eligibility = await getInPlatformEligibilityByUser([buyerUserId], normalizedEvent);
  if (!eligibility.get(buyerUserId)) {
    return;
  }

  const { error: insertError } = await adminClient.from("notifications").insert({
    user_id: buyerUserId,
    event: normalizedEvent,
    deal_id: dealId,
    metadata: {},
  });

  if (insertError) {
    throw insertError;
  }
}

async function notifyBuyersAsync(event: string, dealId: string) {
  const normalizedEvent = normalizeEventKey(event);
  const adminClient = createAdminClient();

  const { data: engagements, error: engagementsError } = await adminClient
    .from("deal_engagements")
    .select("buyer_user_id")
    .eq("deal_id", dealId);

  if (engagementsError) {
    throw engagementsError;
  }

  const buyerUserIds = Array.from(
    new Set((engagements || []).map((engagement) => engagement.buyer_user_id as string).filter(Boolean))
  );

  if (buyerUserIds.length === 0) {
    return;
  }

  const { data: approvedBuyers, error: approvedBuyersError } = await adminClient
    .from("users")
    .select("id")
    .in("id", buyerUserIds)
    .eq("role", "buyer")
    .eq("status", "approved");

  if (approvedBuyersError) {
    throw approvedBuyersError;
  }

  const approvedBuyerUserIds = (approvedBuyers || []).map((buyer) => buyer.id as string);

  if (approvedBuyerUserIds.length === 0) {
    return;
  }

  const eligibility = await getInPlatformEligibilityByUser(approvedBuyerUserIds, normalizedEvent);
  const rows = approvedBuyerUserIds
    .filter((buyerUserId) => eligibility.get(buyerUserId))
    .map((buyerUserId) => ({
      user_id: buyerUserId,
      event: normalizedEvent,
      deal_id: dealId,
      metadata: {},
    }));

  if (rows.length === 0) {
    return;
  }

  const { error: insertError } = await adminClient.from("notifications").insert(rows);

  if (insertError) {
    throw insertError;
  }
}

export function notifyAdmin(event: string, userId: string) {
  void notifyAdminAsync(event, userId).catch((error) => {
    console.error("[notifications] Failed to notify admins", { event, userId, error });
  });
}

export function notifyBroker(event: string, dealId: string, engagementId?: string) {
  void notifyBrokerAsync(event, dealId, engagementId).catch((error) => {
    console.error("[notifications] Failed to notify broker", { event, dealId, engagementId, error });
  });
}

export function notifyBuyer(event: string, dealId: string, buyerUserId: string) {
  void notifyBuyerAsync(event, dealId, buyerUserId).catch((error) => {
    console.error("[notifications] Failed to notify buyer", { event, dealId, buyerUserId, error });
  });
}

export function notifyBuyers(event: string, dealId: string) {
  void notifyBuyersAsync(event, dealId).catch((error) => {
    console.error("[notifications] Failed to notify buyers", { event, dealId, error });
  });
}
