import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const authMocks = vi.hoisted(() => ({
  requireApprovedUser: vi.fn(),
  isAuthResponse: vi.fn((value: unknown) => value instanceof Response),
}));

vi.mock("@/server/auth", () => authMocks);

import { GET, PATCH } from "@/app/api/settings/profile/route";

function createGetSupabase({
  profile,
  firm,
  signedUrl,
}: {
  profile: Record<string, unknown> | null;
  firm?: Record<string, unknown> | null;
  signedUrl?: string | null;
}) {
  const usersQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: profile,
      error: profile ? null : { message: "not found" },
    }),
  };

  const firmsQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: firm ?? null,
      error: null,
    }),
  };

  const createSignedUrl = vi.fn().mockResolvedValue({
    data: signedUrl ? { signedUrl } : null,
    error: signedUrl ? null : { message: "missing" },
  });

  return {
    from: vi.fn((table: string) => {
      if (table === "users") return usersQuery;
      if (table === "firms") return firmsQuery;
      throw new Error(`Unexpected table: ${table}`);
    }),
    storage: {
      from: vi.fn().mockReturnValue({ createSignedUrl }),
    },
    usersQuery,
    firmsQuery,
    createSignedUrl,
  };
}

function createPatchSupabase({
  profile,
  usersUpdateError = null,
  firmsUpdateError = null,
}: {
  profile: { role: string; firm_id: string | null; avatar_path: string | null } | null;
  usersUpdateError?: { message: string } | null;
  firmsUpdateError?: { message: string } | null;
}) {
  const usersSelectQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: profile, error: null }),
  };

  const usersUpdateEq = vi.fn().mockResolvedValue({ error: usersUpdateError });
  const usersUpdate = vi.fn().mockReturnValue({ eq: usersUpdateEq });

  const firmsUpdateEq = vi.fn().mockResolvedValue({ error: firmsUpdateError });
  const firmsUpdate = vi.fn().mockReturnValue({ eq: firmsUpdateEq });

  const remove = vi.fn().mockResolvedValue({ error: null });

  const usersTable = {
    ...usersSelectQuery,
    update: usersUpdate,
  };

  const firmsTable = {
    update: firmsUpdate,
  };

  return {
    from: vi.fn((table: string) => {
      if (table === "users") return usersTable;
      if (table === "firms") return firmsTable;
      throw new Error(`Unexpected table: ${table}`);
    }),
    storage: {
      from: vi.fn().mockReturnValue({ remove }),
    },
    usersUpdate,
    usersUpdateEq,
    firmsUpdate,
    firmsUpdateEq,
    remove,
  };
}

describe("settings profile route runtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET passes through auth response", async () => {
    const authResponse = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    authMocks.requireApprovedUser.mockResolvedValue(authResponse);

    const response = await GET();

    expect(response).toBe(authResponse);
    expect(response.status).toBe(401);
  });

  it("GET returns 404 when profile is missing", async () => {
    const supabase = createGetSupabase({ profile: null });
    authMocks.requireApprovedUser.mockResolvedValue({
      supabase,
      user: { id: "user-1" },
    });

    const response = await GET();

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Profile not found" });
  });

  it("GET returns profile, firm, and signed avatar URL when avatar exists", async () => {
    const profile = {
      id: "user-1",
      role: "buyer",
      firm_id: "firm-1",
      avatar_path: "avatars/user-1.png",
    };
    const firm = { id: "firm-1", name: "Acme Capital" };
    const supabase = createGetSupabase({
      profile,
      firm,
      signedUrl: "https://cdn.example.com/avatar-signed",
    });

    authMocks.requireApprovedUser.mockResolvedValue({
      supabase,
      user: { id: "user-1" },
    });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      profile,
      firm,
      avatar_url: "https://cdn.example.com/avatar-signed",
    });
    expect(supabase.storage.from).toHaveBeenCalledWith("profile-pictures");
    expect(supabase.createSignedUrl).toHaveBeenCalledWith("avatars/user-1.png", 60 * 60);
  });

  it("PATCH passes through auth response", async () => {
    const authResponse = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    authMocks.requireApprovedUser.mockResolvedValue(authResponse);

    const response = await PATCH(
      new Request("http://localhost/api/settings/profile", {
        method: "PATCH",
        body: JSON.stringify({ fullName: "Jane Doe" }),
      })
    );

    expect(response).toBe(authResponse);
    expect(response.status).toBe(401);
  });

  it("PATCH returns 400 for invalid JSON payload", async () => {
    const supabase = createPatchSupabase({
      profile: { role: "buyer", firm_id: "firm-1", avatar_path: null },
    });
    authMocks.requireApprovedUser.mockResolvedValue({
      supabase,
      user: { id: "user-1" },
    });

    const response = await PATCH(
      new Request("http://localhost/api/settings/profile", {
        method: "PATCH",
        body: "{invalid",
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid JSON payload" });
  });

  it("PATCH rejects buyerType for non-buyer profiles", async () => {
    const supabase = createPatchSupabase({
      profile: { role: "broker", firm_id: "firm-1", avatar_path: null },
    });
    authMocks.requireApprovedUser.mockResolvedValue({
      supabase,
      user: { id: "user-1" },
    });

    const response = await PATCH(
      new Request("http://localhost/api/settings/profile", {
        method: "PATCH",
        body: JSON.stringify({ buyerType: "pe" }),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "buyerType can only be updated by buyer users",
    });
    expect(supabase.usersUpdate).not.toHaveBeenCalled();
  });

  it("PATCH returns 400 when payload fails schema validation", async () => {
    const supabase = createPatchSupabase({
      profile: { role: "buyer", firm_id: "firm-1", avatar_path: null },
    });
    authMocks.requireApprovedUser.mockResolvedValue({
      supabase,
      user: { id: "user-1" },
    });

    const response = await PATCH(
      new Request("http://localhost/api/settings/profile", {
        method: "PATCH",
        body: JSON.stringify({ buyerType: "not_a_real_type" }),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid profile update payload",
    });
    expect(supabase.usersUpdate).not.toHaveBeenCalled();
    expect(supabase.firmsUpdate).not.toHaveBeenCalled();
  });

  it("PATCH returns 404 when profile is missing", async () => {
    const supabase = createPatchSupabase({ profile: null });
    authMocks.requireApprovedUser.mockResolvedValue({
      supabase,
      user: { id: "user-1" },
    });

    const response = await PATCH(
      new Request("http://localhost/api/settings/profile", {
        method: "PATCH",
        body: JSON.stringify({ fullName: "Jane Doe" }),
      })
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Profile not found" });
  });

  it("PATCH returns 500 when users update fails", async () => {
    const supabase = createPatchSupabase({
      profile: { role: "buyer", firm_id: "firm-1", avatar_path: null },
      usersUpdateError: { message: "users update failed" },
    });
    authMocks.requireApprovedUser.mockResolvedValue({
      supabase,
      user: { id: "user-1" },
    });

    const response = await PATCH(
      new Request("http://localhost/api/settings/profile", {
        method: "PATCH",
        body: JSON.stringify({ fullName: "Jane Doe" }),
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "users update failed" });
    expect(supabase.firmsUpdate).not.toHaveBeenCalled();
  });

  it("PATCH returns 500 when firms update fails", async () => {
    const supabase = createPatchSupabase({
      profile: { role: "buyer", firm_id: "firm-1", avatar_path: null },
      firmsUpdateError: { message: "firms update failed" },
    });
    authMocks.requireApprovedUser.mockResolvedValue({
      supabase,
      user: { id: "user-1" },
    });

    const response = await PATCH(
      new Request("http://localhost/api/settings/profile", {
        method: "PATCH",
        body: JSON.stringify({ firmName: "Acme Capital" }),
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "firms update failed" });
  });

  it("PATCH removes existing avatar file when avatarPath is null", async () => {
    const supabase = createPatchSupabase({
      profile: { role: "buyer", firm_id: "firm-1", avatar_path: "avatars/old.png" },
    });
    authMocks.requireApprovedUser.mockResolvedValue({
      supabase,
      user: { id: "user-1" },
    });

    const response = await PATCH(
      new Request("http://localhost/api/settings/profile", {
        method: "PATCH",
        body: JSON.stringify({ avatarPath: null }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(supabase.usersUpdate).toHaveBeenCalledWith({ avatar_path: null });
    expect(supabase.remove).toHaveBeenCalledWith(["avatars/old.png"]);
  });

  it("PATCH updates users and firms mappings on valid payload", async () => {
    const supabase = createPatchSupabase({
      profile: { role: "buyer", firm_id: "firm-1", avatar_path: null },
    });
    authMocks.requireApprovedUser.mockResolvedValue({
      supabase,
      user: { id: "user-1" },
    });

    const response = await PATCH(
      new Request("http://localhost/api/settings/profile", {
        method: "PATCH",
        body: JSON.stringify({
          fullName: "Jane Doe",
          title: "Principal",
          avatarPath: "avatars/new.png",
          phone: "555-1234",
          linkedIn: "https://linkedin.com/in/jane",
          location: "Austin, TX",
          industryFocus: ["Technology"],
          licenseCredentials: "Series 7",
          dealTypes: "Control",
          buyerType: "family_office",
          aum: "$500M",
          firmName: "Acme Capital",
          description: "Lower middle market investor",
          website: "https://acme.example",
          firmLocation: "Austin, TX",
          firmIndustryFocus: ["Technology"],
        }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });

    expect(supabase.usersUpdate).toHaveBeenCalledWith({
      full_name: "Jane Doe",
      title: "Principal",
      avatar_path: "avatars/new.png",
      phone: "555-1234",
      linkedin: "https://linkedin.com/in/jane",
      location: "Austin, TX",
      industry_focus: ["Technology"],
      license_credentials: "Series 7",
      deal_types: "Control",
      buyer_type: "family_office",
      aum: "$500M",
    });
    expect(supabase.usersUpdateEq).toHaveBeenCalledWith("id", "user-1");

    expect(supabase.firmsUpdate).toHaveBeenCalledWith({
      name: "Acme Capital",
      description: "Lower middle market investor",
      website: "https://acme.example",
      location: "Austin, TX",
      industry_focus: ["Technology"],
    });
    expect(supabase.firmsUpdateEq).toHaveBeenCalledWith("id", "firm-1");
  });
});
