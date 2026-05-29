import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const authMocks = vi.hoisted(() => ({
  requireApprovedUser: vi.fn(),
  isAuthResponse: vi.fn((value: unknown) => value instanceof Response),
}));

const adminMocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
}));

const notificationMocks = vi.hoisted(() => ({
  notifyBuyers: vi.fn(),
}));

vi.mock("@/server/auth", () => authMocks);
vi.mock("@/lib/supabase/admin", () => adminMocks);
vi.mock("@/lib/notifications", () => notificationMocks);

import { POST } from "@/app/api/settings/delete-account/route";

function createAdminClientStub({
  activeDeals = [],
  firmMemberCount = 1,
  activeDealsSelectError = null,
  dealsTerminateError = null,
  engagementsTerminateError = null,
  buyerEngagementsUpdateError = null,
  usersCountError = null,
  firmDeleteError = null,
  usersDeleteError = null,
  authDeleteError = null,
}: {
  activeDeals?: Array<{ id: string }>;
  firmMemberCount?: number;
  activeDealsSelectError?: { message: string } | null;
  dealsTerminateError?: { message: string } | null;
  engagementsTerminateError?: { message: string } | null;
  buyerEngagementsUpdateError?: { message: string } | null;
  usersCountError?: { message: string } | null;
  firmDeleteError?: { message: string } | null;
  usersDeleteError?: { message: string } | null;
  authDeleteError?: { message: string } | null;
} = {}) {
  const dealsSelectNot = vi.fn().mockResolvedValue({
    data: activeDeals,
    error: activeDealsSelectError,
  });
  const dealsSelectEq = vi.fn().mockReturnValue({
    not: dealsSelectNot,
  });
  const dealsUpdateIn = vi.fn().mockResolvedValue({ error: dealsTerminateError });
  const dealsUpdate = vi.fn().mockReturnValue({ in: dealsUpdateIn });

  const engagementsUpdateIn = vi.fn().mockResolvedValue({ error: engagementsTerminateError });
  const engagementsUpdateEq = vi.fn().mockReturnThis();
  const engagementsUpdateNot = vi.fn().mockResolvedValue({ error: buyerEngagementsUpdateError });
  const engagementsUpdate = vi.fn().mockReturnValue({
    in: engagementsUpdateIn,
    eq: engagementsUpdateEq,
    not: engagementsUpdateNot,
  });

  const firmsDeleteEq = vi.fn().mockResolvedValue({ error: firmDeleteError });
  const firmsDelete = vi.fn().mockReturnValue({ eq: firmsDeleteEq });

  const usersCountEq = vi.fn().mockResolvedValue({
    count: firmMemberCount,
    error: usersCountError,
  });
  const usersCountSelect = vi.fn().mockReturnValue({ eq: usersCountEq });

  const usersDeleteEq = vi.fn().mockResolvedValue({ error: usersDeleteError });
  const usersDelete = vi.fn().mockReturnValue({ eq: usersDeleteEq });

  let usersFromCalls = 0;

  const client = {
    from: vi.fn((table: string) => {
      if (table === "deals") {
        return {
            select: vi.fn().mockReturnValue({
            eq: dealsSelectEq,
            }),
            update: dealsUpdate,
          };
      }

      if (table === "deal_engagements") {
        return {
          update: engagementsUpdate,
        };
      }

      if (table === "users") {
        usersFromCalls += 1;
        if (usersFromCalls === 1) {
          return { select: usersCountSelect };
        }
        return { delete: usersDelete };
      }

      if (table === "firms") {
        return { delete: firmsDelete };
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
    auth: {
      admin: {
        deleteUser: vi.fn().mockResolvedValue({ error: authDeleteError }),
      },
    },
    dealsSelectEq,
    dealsUpdate,
    dealsUpdateIn,
    dealsSelectNot,
    engagementsUpdate,
    engagementsUpdateIn,
    engagementsUpdateEq,
    engagementsUpdateNot,
    usersCountSelect,
    usersCountEq,
    usersDelete,
    usersDeleteEq,
    firmsDelete,
    firmsDeleteEq,
  };

  return client;
}

describe("settings delete-account route runtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes through auth response", async () => {
    const authResponse = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    authMocks.requireApprovedUser.mockResolvedValue(authResponse);

    const response = await POST(
      new Request("http://localhost/api/settings/delete-account", {
        method: "POST",
        body: JSON.stringify({ confirmation: "DELETE" }),
      })
    );

    expect(response).toBe(authResponse);
    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid confirmation payload", async () => {
    authMocks.requireApprovedUser.mockResolvedValue({
      user: { id: "user-1" },
      profile: { role: "buyer", firm_id: "firm-1" },
    });

    const response = await POST(
      new Request("http://localhost/api/settings/delete-account", {
        method: "POST",
        body: JSON.stringify({ confirmation: "NOPE" }),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "You must type DELETE to confirm account deletion",
    });
    expect(adminMocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid JSON body", async () => {
    authMocks.requireApprovedUser.mockResolvedValue({
      user: { id: "user-1" },
      profile: { role: "buyer", firm_id: "firm-1" },
    });

    const response = await POST(
      new Request("http://localhost/api/settings/delete-account", {
        method: "POST",
        body: "{invalid",
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "You must type DELETE to confirm account deletion",
    });
    expect(adminMocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("broker flow terminates active deals/engagements and notifies buyers", async () => {
    const adminClient = createAdminClientStub({
      activeDeals: [{ id: "deal-1" }, { id: "deal-2" }],
      firmMemberCount: 2,
    });
    adminMocks.createAdminClient.mockReturnValue(adminClient);

    authMocks.requireApprovedUser.mockResolvedValue({
      user: { id: "broker-1" },
      profile: { role: "broker", firm_id: "firm-1" },
    });

    const response = await POST(
      new Request("http://localhost/api/settings/delete-account", {
        method: "POST",
        body: JSON.stringify({ confirmation: "DELETE" }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(adminClient.dealsSelectEq).toHaveBeenCalledWith("firm_id", "firm-1");
    expect(adminClient.dealsUpdate).toHaveBeenCalledWith({ status: "terminated" });
    expect(adminClient.dealsUpdateIn).toHaveBeenCalledWith("id", ["deal-1", "deal-2"]);
    expect(adminClient.engagementsUpdate).toHaveBeenCalledWith({ stage: "terminated" });
    expect(adminClient.engagementsUpdateIn).toHaveBeenCalledWith("deal_id", ["deal-1", "deal-2"]);
    expect(notificationMocks.notifyBuyers).toHaveBeenCalledTimes(2);
    expect(notificationMocks.notifyBuyers).toHaveBeenNthCalledWith(1, "deal_terminated", "deal-1");
    expect(notificationMocks.notifyBuyers).toHaveBeenNthCalledWith(2, "deal_terminated", "deal-2");
  });

  it("buyer flow marks active engagements passed", async () => {
    const adminClient = createAdminClientStub({ firmMemberCount: 2 });
    adminMocks.createAdminClient.mockReturnValue(adminClient);

    authMocks.requireApprovedUser.mockResolvedValue({
      user: { id: "buyer-1" },
      profile: { role: "buyer", firm_id: "firm-1" },
    });

    const response = await POST(
      new Request("http://localhost/api/settings/delete-account", {
        method: "POST",
        body: JSON.stringify({ confirmation: "DELETE" }),
      })
    );

    expect(response.status).toBe(200);
    expect(adminClient.engagementsUpdate).toHaveBeenCalledWith({ stage: "passed" });
    expect(adminClient.engagementsUpdateEq).toHaveBeenCalledWith("buyer_user_id", "buyer-1");
    expect(adminClient.engagementsUpdateNot).toHaveBeenCalledWith(
      "stage",
      "in",
      '("passed","terminated","closed","declined")'
    );
    expect(notificationMocks.notifyBuyers).not.toHaveBeenCalled();
  });

  it("returns 500 when broker deal termination update fails", async () => {
    const adminClient = createAdminClientStub({
      activeDeals: [{ id: "deal-1" }],
      firmMemberCount: 2,
      dealsTerminateError: { message: "deal update failed" },
    });
    adminMocks.createAdminClient.mockReturnValue(adminClient);

    authMocks.requireApprovedUser.mockResolvedValue({
      user: { id: "broker-1" },
      profile: { role: "broker", firm_id: "firm-1" },
    });

    const response = await POST(
      new Request("http://localhost/api/settings/delete-account", {
        method: "POST",
        body: JSON.stringify({ confirmation: "DELETE" }),
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Failed to terminate active deals during account deletion",
    });
    expect(adminClient.dealsUpdate).toHaveBeenCalledWith({ status: "terminated" });
    expect(adminClient.dealsUpdateIn).toHaveBeenCalledWith("id", ["deal-1"]);
    expect(adminClient.engagementsUpdateIn).not.toHaveBeenCalled();
    expect(adminClient.usersDeleteEq).not.toHaveBeenCalled();
    expect(adminClient.auth.admin.deleteUser).not.toHaveBeenCalled();
    expect(notificationMocks.notifyBuyers).not.toHaveBeenCalled();
  });

  it("returns 500 when broker engagement termination update fails", async () => {
    const adminClient = createAdminClientStub({
      activeDeals: [{ id: "deal-1" }],
      firmMemberCount: 2,
      engagementsTerminateError: { message: "engagement update failed" },
    });
    adminMocks.createAdminClient.mockReturnValue(adminClient);

    authMocks.requireApprovedUser.mockResolvedValue({
      user: { id: "broker-1" },
      profile: { role: "broker", firm_id: "firm-1" },
    });

    const response = await POST(
      new Request("http://localhost/api/settings/delete-account", {
        method: "POST",
        body: JSON.stringify({ confirmation: "DELETE" }),
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Failed to terminate deal engagements during account deletion",
    });
    expect(adminClient.dealsUpdate).toHaveBeenCalledWith({ status: "terminated" });
    expect(adminClient.dealsUpdateIn).toHaveBeenCalledWith("id", ["deal-1"]);
    expect(adminClient.engagementsUpdate).toHaveBeenCalledWith({ stage: "terminated" });
    expect(adminClient.engagementsUpdateIn).toHaveBeenCalledWith("deal_id", ["deal-1"]);
    expect(adminClient.usersDeleteEq).not.toHaveBeenCalled();
    expect(adminClient.auth.admin.deleteUser).not.toHaveBeenCalled();
    expect(notificationMocks.notifyBuyers).not.toHaveBeenCalled();
  });

  it("returns 500 when public user delete fails", async () => {
    const adminClient = createAdminClientStub({
      firmMemberCount: 2,
      usersDeleteError: { message: "user delete failed" },
    });
    adminMocks.createAdminClient.mockReturnValue(adminClient);

    authMocks.requireApprovedUser.mockResolvedValue({
      user: { id: "user-1" },
      profile: { role: "buyer", firm_id: "firm-1" },
    });

    const response = await POST(
      new Request("http://localhost/api/settings/delete-account", {
        method: "POST",
        body: JSON.stringify({ confirmation: "DELETE" }),
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Failed to delete user profile during account deletion",
    });
    expect(adminClient.usersDeleteEq).toHaveBeenCalledWith("id", "user-1");
    expect(adminClient.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it("returns 500 when auth admin user delete fails", async () => {
    const adminClient = createAdminClientStub({
      firmMemberCount: 2,
      authDeleteError: { message: "auth delete failed" },
    });
    adminMocks.createAdminClient.mockReturnValue(adminClient);

    authMocks.requireApprovedUser.mockResolvedValue({
      user: { id: "user-1" },
      profile: { role: "buyer", firm_id: "firm-1" },
    });

    const response = await POST(
      new Request("http://localhost/api/settings/delete-account", {
        method: "POST",
        body: JSON.stringify({ confirmation: "DELETE" }),
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Failed to delete auth account during account deletion",
    });
    expect(adminClient.usersDeleteEq).toHaveBeenCalledWith("id", "user-1");
    expect(adminClient.auth.admin.deleteUser).toHaveBeenCalledWith("user-1");
  });

  it("returns 500 when loading broker active deals fails", async () => {
    const adminClient = createAdminClientStub({
      activeDealsSelectError: { message: "select failed" },
    });
    adminMocks.createAdminClient.mockReturnValue(adminClient);

    authMocks.requireApprovedUser.mockResolvedValue({
      user: { id: "broker-1" },
      profile: { role: "broker", firm_id: "firm-1" },
    });

    const response = await POST(
      new Request("http://localhost/api/settings/delete-account", {
        method: "POST",
        body: JSON.stringify({ confirmation: "DELETE" }),
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Failed to load active deals for account deletion",
    });
    expect(adminClient.dealsUpdate).not.toHaveBeenCalled();
    expect(adminClient.usersDeleteEq).not.toHaveBeenCalled();
    expect(adminClient.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it("returns 500 when buyer engagement cleanup fails", async () => {
    const adminClient = createAdminClientStub({
      buyerEngagementsUpdateError: { message: "engagement update failed" },
    });
    adminMocks.createAdminClient.mockReturnValue(adminClient);

    authMocks.requireApprovedUser.mockResolvedValue({
      user: { id: "buyer-1" },
      profile: { role: "buyer", firm_id: "firm-1" },
    });

    const response = await POST(
      new Request("http://localhost/api/settings/delete-account", {
        method: "POST",
        body: JSON.stringify({ confirmation: "DELETE" }),
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Failed to update buyer engagements during account deletion",
    });
    expect(adminClient.usersDeleteEq).not.toHaveBeenCalled();
    expect(adminClient.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it("returns 500 when firm member count lookup fails", async () => {
    const adminClient = createAdminClientStub({
      usersCountError: { message: "count failed" },
    });
    adminMocks.createAdminClient.mockReturnValue(adminClient);

    authMocks.requireApprovedUser.mockResolvedValue({
      user: { id: "buyer-1" },
      profile: { role: "buyer", firm_id: "firm-1" },
    });

    const response = await POST(
      new Request("http://localhost/api/settings/delete-account", {
        method: "POST",
        body: JSON.stringify({ confirmation: "DELETE" }),
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Failed to verify firm membership during account deletion",
    });
    expect(adminClient.usersDeleteEq).not.toHaveBeenCalled();
    expect(adminClient.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it("returns 500 when deleting sole-member firm fails", async () => {
    const adminClient = createAdminClientStub({
      firmMemberCount: 1,
      firmDeleteError: { message: "firm delete failed" },
    });
    adminMocks.createAdminClient.mockReturnValue(adminClient);

    authMocks.requireApprovedUser.mockResolvedValue({
      user: { id: "user-1" },
      profile: { role: "buyer", firm_id: "firm-1" },
    });

    const response = await POST(
      new Request("http://localhost/api/settings/delete-account", {
        method: "POST",
        body: JSON.stringify({ confirmation: "DELETE" }),
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Failed to delete firm during account deletion",
    });
    expect(adminClient.firmsDeleteEq).toHaveBeenCalledWith("id", "firm-1");
    expect(adminClient.usersDeleteEq).not.toHaveBeenCalled();
    expect(adminClient.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it("deletes user/auth records and deletes firm only when user is sole member", async () => {
    const soleMemberAdminClient = createAdminClientStub({ firmMemberCount: 1 });
    adminMocks.createAdminClient.mockReturnValueOnce(soleMemberAdminClient);
    authMocks.requireApprovedUser.mockResolvedValue({
      user: { id: "user-1" },
      profile: { role: "buyer", firm_id: "firm-1" },
    });

    const firstResponse = await POST(
      new Request("http://localhost/api/settings/delete-account", {
        method: "POST",
        body: JSON.stringify({ confirmation: "DELETE" }),
      })
    );

    expect(firstResponse.status).toBe(200);
    expect(soleMemberAdminClient.firmsDelete).toHaveBeenCalled();
    expect(soleMemberAdminClient.firmsDeleteEq).toHaveBeenCalledWith("id", "firm-1");
    expect(soleMemberAdminClient.usersDeleteEq).toHaveBeenCalledWith("id", "user-1");
    expect(soleMemberAdminClient.auth.admin.deleteUser).toHaveBeenCalledWith("user-1");

    const nonSoleMemberAdminClient = createAdminClientStub({ firmMemberCount: 2 });
    adminMocks.createAdminClient.mockReturnValueOnce(nonSoleMemberAdminClient);

    const secondResponse = await POST(
      new Request("http://localhost/api/settings/delete-account", {
        method: "POST",
        body: JSON.stringify({ confirmation: "DELETE" }),
      })
    );

    expect(secondResponse.status).toBe(200);
    expect(nonSoleMemberAdminClient.firmsDelete).not.toHaveBeenCalled();
    expect(nonSoleMemberAdminClient.usersDeleteEq).toHaveBeenCalledWith("id", "user-1");
    expect(nonSoleMemberAdminClient.auth.admin.deleteUser).toHaveBeenCalledWith("user-1");
  });
});
