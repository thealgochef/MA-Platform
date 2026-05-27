import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const authMocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  isAuthResponse: vi.fn((value: unknown) => value instanceof Response),
}));

vi.mock("@/server/auth", () => authMocks);

import { GET, PATCH } from "@/app/api/settings/notifications/route";

function createNotificationsSupabase({
  getResult,
}: {
  getResult?: { data: { preferences: Record<string, unknown> } | null; error: { code?: string; message: string } | null };
} = {}) {
  const single = vi.fn().mockResolvedValue(
    getResult ?? {
      data: { preferences: { new_message: { email: true, in_platform: true } } },
      error: null,
    }
  );

  const getQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single,
  };

  const upsert = vi.fn().mockResolvedValue({ error: null });

  const notificationPreferencesTable = {
    ...getQuery,
    upsert,
  };

  return {
    from: vi.fn((table: string) => {
      if (table === "notification_preferences") return notificationPreferencesTable;
      throw new Error(`Unexpected table: ${table}`);
    }),
    upsert,
    getQuery,
  };
}

describe("settings notifications route runtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET passes through auth response", async () => {
    const authResponse = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    authMocks.requireUser.mockResolvedValue(authResponse);

    const response = await GET();

    expect(response).toBe(authResponse);
    expect(response.status).toBe(401);
  });

  it("PATCH passes through auth response", async () => {
    const authResponse = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    authMocks.requireUser.mockResolvedValue(authResponse);

    const response = await PATCH(
      new Request("http://localhost/api/settings/notifications", {
        method: "PATCH",
        body: JSON.stringify({ preferences: {} }),
      })
    );

    expect(response).toBe(authResponse);
    expect(response.status).toBe(401);
  });

  it("GET returns empty preferences on PGRST116 no-row", async () => {
    const supabase = createNotificationsSupabase({
      getResult: {
        data: null,
        error: { code: "PGRST116", message: "no rows returned" },
      },
    });

    authMocks.requireUser.mockResolvedValue({
      supabase,
      user: { id: "user-1" },
    });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ preferences: {} });
  });

  it("GET returns 500 when preferences query fails unexpectedly", async () => {
    const supabase = createNotificationsSupabase({
      getResult: {
        data: null,
        error: { code: "XX000", message: "database unavailable" },
      },
    });

    authMocks.requireUser.mockResolvedValue({
      supabase,
      user: { id: "user-1" },
    });

    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "database unavailable" });
  });

  it("PATCH returns 400 for invalid payload", async () => {
    const supabase = createNotificationsSupabase();
    authMocks.requireUser.mockResolvedValue({
      supabase,
      user: { id: "user-1" },
    });

    const response = await PATCH(
      new Request("http://localhost/api/settings/notifications", {
        method: "PATCH",
        body: JSON.stringify({ preferences: { random_key: { email: true, in_platform: true } } }),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid preferences format" });
  });

  it("PATCH returns 400 for malformed JSON body", async () => {
    const supabase = createNotificationsSupabase();
    authMocks.requireUser.mockResolvedValue({
      supabase,
      user: { id: "user-1" },
    });

    const response = await PATCH(
      new Request("http://localhost/api/settings/notifications", {
        method: "PATCH",
        body: "{invalid",
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid preferences format" });
    expect(supabase.upsert).not.toHaveBeenCalled();
  });

  it("PATCH upserts on user_id conflict and returns success", async () => {
    const supabase = createNotificationsSupabase();
    authMocks.requireUser.mockResolvedValue({
      supabase,
      user: { id: "user-1" },
    });

    const preferences = {
      new_message: { email: true, in_platform: false },
      pending_action_reminder: { email: false, in_platform: true },
    };

    const response = await PATCH(
      new Request("http://localhost/api/settings/notifications", {
        method: "PATCH",
        body: JSON.stringify({ preferences }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(supabase.upsert).toHaveBeenCalledWith(
      {
        user_id: "user-1",
        preferences,
      },
      { onConflict: "user_id" }
    );
  });

  it("PATCH returns 500 when upsert fails", async () => {
    const supabase = createNotificationsSupabase();
    supabase.upsert.mockResolvedValueOnce({ error: { message: "write failed" } });

    authMocks.requireUser.mockResolvedValue({
      supabase,
      user: { id: "user-1" },
    });

    const response = await PATCH(
      new Request("http://localhost/api/settings/notifications", {
        method: "PATCH",
        body: JSON.stringify({
          preferences: { new_message: { email: true, in_platform: true } },
        }),
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "write failed" });
  });
});
