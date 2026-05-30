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
  profileError = null,
  firm,
  signedUrl,
}: {
  profile: Record<string, unknown> | null;
  profileError?: { message: string } | null;
  firm?: Record<string, unknown> | null;
  signedUrl?: string | null;
}) {
  const usersQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: profile,
      error: profileError,
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
  usersUpdateErrors,
  firmsUpdateError = null,
  userSelectError = null,
}: {
   profile: {
     role: string;
     firm_id: string | null;
     avatar_path: string | null;
    full_name?: string | null;
    title?: string | null;
    phone?: string | null;
    linkedin?: string | null;
    location?: string | null;
    industry_focus?: string[] | null;
    license_credentials?: string | null;
     deal_types?: string | null;
     buyer_type?: string | null;
      accreditation?: string | null;
     aum?: string | null;
   } | null;
  usersUpdateErrors?: Array<{ message: string } | null>;
  firmsUpdateError?: { message: string } | null;
  userSelectError?: { message: string } | null;
}) {
  const usersSelectQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: profile, error: userSelectError }),
  };

  const usersUpdateEq = vi.fn();
  if (usersUpdateErrors && usersUpdateErrors.length > 0) {
    for (const error of usersUpdateErrors) {
      usersUpdateEq.mockResolvedValueOnce({ error });
    }
  } else {
    usersUpdateEq.mockResolvedValue({ error: null });
  }
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
    const supabase = createGetSupabase({ profile: null, profileError: null });
    authMocks.requireApprovedUser.mockResolvedValue({
      supabase,
      user: { id: "user-1" },
    });

    const response = await GET();

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Profile not found" });
  });

  it("GET returns 500 when loading profile fails", async () => {
    const supabase = createGetSupabase({
      profile: null,
      profileError: { message: "query failed" },
    });
    authMocks.requireApprovedUser.mockResolvedValue({
      supabase,
      user: { id: "user-1" },
    });

    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Failed to load profile" });
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
      profile: {
        ...profile,
        avatar_url: "https://cdn.example.com/avatar-signed",
        avatarUrl: "https://cdn.example.com/avatar-signed",
      },
      firm,
      avatar_url: "https://cdn.example.com/avatar-signed",
      avatarUrl: "https://cdn.example.com/avatar-signed",
    });
    expect(supabase.usersQuery.select).toHaveBeenCalledWith(
      "role, full_name, title, avatar_path, location, industry_focus, license_credentials, deal_types, buyer_type, accreditation, aum, phone, linkedin, firm_id"
    );
    expect(supabase.firmsQuery.select).toHaveBeenCalledWith(
      "name, description, website, location, team_members_requested"
    );
    expect(supabase.storage.from).toHaveBeenCalledWith("profile-pictures");
    expect(supabase.createSignedUrl).toHaveBeenCalledWith("avatars/user-1.png", 60 * 60);
  });

  it("GET returns both avatar URL key variants as null when no avatar path exists", async () => {
    const profile = {
      id: "user-1",
      role: "buyer",
      firm_id: "firm-1",
      avatar_path: null,
    };
    const firm = { id: "firm-1", name: "Acme Capital" };
    const supabase = createGetSupabase({
      profile,
      firm,
      signedUrl: null,
    });

    authMocks.requireApprovedUser.mockResolvedValue({
      supabase,
      user: { id: "user-1" },
    });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      profile: {
        ...profile,
        avatar_url: null,
        avatarUrl: null,
      },
      firm,
      avatar_url: null,
      avatarUrl: null,
    });
    expect(supabase.createSignedUrl).not.toHaveBeenCalled();
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

  it("PATCH rejects accreditation for non-buyer profiles", async () => {
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
        body: JSON.stringify({ accreditation: "income" }),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "accreditation can only be updated by buyer users",
    });
    expect(supabase.usersUpdate).not.toHaveBeenCalled();
  });

  it("PATCH rejects aum for non-buyer profiles", async () => {
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
        body: JSON.stringify({ aum: "$500M" }),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "aum can only be updated by buyer users",
    });
    expect(supabase.usersUpdate).not.toHaveBeenCalled();
  });

  it("PATCH rejects licenseCredentials for non-broker profiles", async () => {
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
        body: JSON.stringify({ licenseCredentials: "Series 7" }),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "licenseCredentials can only be updated by broker users",
    });
    expect(supabase.usersUpdate).not.toHaveBeenCalled();
  });

  it("PATCH rejects dealTypes for non-broker profiles", async () => {
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
        body: JSON.stringify({ dealTypes: "Control" }),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "dealTypes can only be updated by broker users",
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
      usersUpdateErrors: [{ message: "users update failed" }],
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
    await expect(response.json()).resolves.toEqual({ error: "Failed to update profile" });
    expect(supabase.firmsUpdate).not.toHaveBeenCalled();
  });

  it("PATCH returns 500 when firms update fails", async () => {
    const supabase = createPatchSupabase({
      profile: {
        role: "buyer",
        firm_id: "firm-1",
        avatar_path: null,
        full_name: "Existing Name",
      },
      firmsUpdateError: { message: "firms update failed" },
    });
    authMocks.requireApprovedUser.mockResolvedValue({
      supabase,
      user: { id: "user-1" },
    });

    const response = await PATCH(
      new Request("http://localhost/api/settings/profile", {
        method: "PATCH",
        body: JSON.stringify({ fullName: "Updated Name", firmName: "Acme Capital" }),
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Failed to update firm. User profile changes were rolled back.",
    });
    expect(supabase.usersUpdate).toHaveBeenCalledTimes(2);
    expect(supabase.usersUpdate).toHaveBeenNthCalledWith(1, { full_name: "Updated Name" });
    expect(supabase.usersUpdate).toHaveBeenNthCalledWith(2, { full_name: "Existing Name" });
  });

  it("PATCH returns firm error without rollback note when no user update was attempted", async () => {
    const supabase = createPatchSupabase({
      profile: {
        role: "buyer",
        firm_id: "firm-1",
        avatar_path: null,
      },
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
    await expect(response.json()).resolves.toEqual({
      error: "Failed to update firm",
    });
    expect(supabase.usersUpdate).not.toHaveBeenCalled();
    expect(supabase.firmsUpdate).toHaveBeenCalledWith({ name: "Acme Capital" });
  });

  it("PATCH returns 500 when firm update fails and rollback also fails", async () => {
    const supabase = createPatchSupabase({
      profile: {
        role: "buyer",
        firm_id: "firm-1",
        avatar_path: null,
        full_name: "Existing Name",
      },
      usersUpdateErrors: [null, { message: "rollback failed" }],
      firmsUpdateError: { message: "firms update failed" },
    });
    authMocks.requireApprovedUser.mockResolvedValue({
      supabase,
      user: { id: "user-1" },
    });

    const response = await PATCH(
      new Request("http://localhost/api/settings/profile", {
        method: "PATCH",
        body: JSON.stringify({ fullName: "Updated Name", firmName: "Acme Capital" }),
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Failed to update firm and failed to rollback user profile changes",
    });
    expect(supabase.usersUpdate).toHaveBeenCalledTimes(2);
  });

  it("PATCH rejects avatarPath that is not scoped to current user", async () => {
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
        body: JSON.stringify({ avatarPath: "user-2/avatar" }),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "avatarPath must be a safe storage object path scoped to the current user",
    });
    expect(supabase.usersUpdate).not.toHaveBeenCalled();
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

  it("PATCH updates users and firms mappings for valid buyer payload", async () => {
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
          avatarPath: "user-1/avatar",
          phone: "555-1234",
          linkedIn: "https://linkedin.com/in/jane",
          location: "Austin, TX",
          industryFocus: ["Technology"],
          buyerType: "family_office",
          accreditation: "income",
          aum: "$500M",
          firmName: "Acme Capital",
          description: "Lower middle market investor",
          website: "https://acme.example",
          firmLocation: "Austin, TX",
          otherMembers: "Alex Smith, Jamie Lee",
          firmIndustryFocus: ["Technology"],
        }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });

    expect(supabase.usersUpdate).toHaveBeenCalledWith({
      full_name: "Jane Doe",
      title: "Principal",
      avatar_path: "user-1/avatar",
      phone: "555-1234",
      linkedin: "https://linkedin.com/in/jane",
      location: "Austin, TX",
      industry_focus: ["Technology"],
      buyer_type: "family_office",
      accreditation: "income",
      aum: "$500M",
    });
    expect(supabase.usersUpdateEq).toHaveBeenCalledWith("id", "user-1");

    expect(supabase.firmsUpdate).toHaveBeenCalledWith({
      name: "Acme Capital",
      description: "Lower middle market investor",
      website: "https://acme.example",
      location: "Austin, TX",
      team_members_requested: "Alex Smith, Jamie Lee",
      industry_focus: ["Technology"],
    });
    expect(supabase.firmsUpdateEq).toHaveBeenCalledWith("id", "firm-1");
  });

  it("PATCH updates users and firms mappings for valid broker payload", async () => {
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
        body: JSON.stringify({
          fullName: "Jane Doe",
          title: "Managing Director",
          avatarPath: "user-1/avatar",
          phone: "555-1234",
          linkedIn: "https://linkedin.com/in/jane",
          location: "Austin, TX",
          industryFocus: ["Technology"],
          licenseCredentials: "Series 7",
          dealTypes: "Control",
          firmName: "Acme Advisory",
          description: "Lower middle market sell-side advisor",
          website: "https://advisory.example",
          firmLocation: "Austin, TX",
          otherMembers: "Alex Smith, Jamie Lee",
          firmIndustryFocus: ["Technology"],
        }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });

    expect(supabase.usersUpdate).toHaveBeenCalledWith({
      full_name: "Jane Doe",
      title: "Managing Director",
      avatar_path: "user-1/avatar",
      phone: "555-1234",
      linkedin: "https://linkedin.com/in/jane",
      location: "Austin, TX",
      industry_focus: ["Technology"],
      license_credentials: "Series 7",
      deal_types: "Control",
    });
    expect(supabase.usersUpdateEq).toHaveBeenCalledWith("id", "user-1");

    expect(supabase.firmsUpdate).toHaveBeenCalledWith({
      name: "Acme Advisory",
      description: "Lower middle market sell-side advisor",
      website: "https://advisory.example",
      location: "Austin, TX",
      team_members_requested: "Alex Smith, Jamie Lee",
      industry_focus: ["Technology"],
    });
    expect(supabase.firmsUpdateEq).toHaveBeenCalledWith("id", "firm-1");
  });
});
