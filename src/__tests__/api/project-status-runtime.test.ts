import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const authMocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  requireBuyerProjectAccess: vi.fn(),
  isAuthResponse: vi.fn((value: unknown) => value instanceof Response),
}));

vi.mock("@/server/auth", () => authMocks);

import { PATCH } from "@/app/api/projects/[id]/status/route";

function createStatusSupabase({
  project,
  error,
}: {
  project?: { id: string; is_active: boolean } | null;
  error?: { message: string } | null;
}) {
  const single = vi.fn().mockResolvedValue({
    data: project ?? { id: "project-1", is_active: false },
    error: error ?? null,
  });
  const select = vi.fn().mockReturnValue({ single });
  let eqCallCount = 0;
  const eq = vi.fn(() => {
    eqCallCount += 1;
    return eqCallCount === 1 ? { eq, select } : { select };
  });
  const update = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ update });

  return {
    from,
    update,
    eq,
    select,
    single,
  };
}

describe("PATCH /api/projects/[id]/status runtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes through auth response", async () => {
    const authResponse = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    authMocks.requireRole.mockResolvedValue(authResponse);

    const response = await PATCH(new Request("http://localhost/api/projects/project-1/status", { method: "PATCH" }), {
      params: { id: "project-1" },
    });

    expect(response).toBe(authResponse);
    expect(response.status).toBe(401);
    expect(authMocks.requireRole).toHaveBeenCalledWith("buyer");
    expect(authMocks.requireBuyerProjectAccess).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed JSON", async () => {
    const supabase = createStatusSupabase({});
    authMocks.requireRole.mockResolvedValue({
      supabase,
      user: { id: "buyer-1" },
      profile: { role: "buyer" },
    });
    authMocks.requireBuyerProjectAccess.mockResolvedValue({ id: "project-1" });

    const response = await PATCH(
      new Request("http://localhost/api/projects/project-1/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "{ bad json",
      }),
      { params: { id: "project-1" } }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Malformed JSON" });
  });

  it("returns 400 for invalid body", async () => {
    const supabase = createStatusSupabase({});
    authMocks.requireRole.mockResolvedValue({
      supabase,
      user: { id: "buyer-1" },
      profile: { role: "buyer" },
    });
    authMocks.requireBuyerProjectAccess.mockResolvedValue({ id: "project-1" });

    const response = await PATCH(
      new Request("http://localhost/api/projects/project-1/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: "yes" }),
      }),
      { params: { id: "project-1" } }
    );

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload).toHaveProperty("error");
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("returns not found response from buyer ownership helper", async () => {
    const supabase = createStatusSupabase({});
    const notFoundResponse = NextResponse.json({ error: "Project not found" }, { status: 404 });

    authMocks.requireRole.mockResolvedValue({
      supabase,
      user: { id: "buyer-1" },
      profile: { role: "buyer" },
    });
    authMocks.requireBuyerProjectAccess.mockResolvedValue(notFoundResponse);

    const response = await PATCH(
      new Request("http://localhost/api/projects/project-1/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      }),
      { params: { id: "project-1" } }
    );

    expect(response).toBe(notFoundResponse);
    expect(response.status).toBe(404);
    expect(authMocks.requireBuyerProjectAccess).toHaveBeenCalledWith(supabase, "buyer-1", "project-1", "id");
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("updates project status and returns updated project", async () => {
    const supabase = createStatusSupabase({
      project: { id: "project-1", is_active: false },
    });
    authMocks.requireRole.mockResolvedValue({
      supabase,
      user: { id: "buyer-1" },
      profile: { role: "buyer" },
    });
    authMocks.requireBuyerProjectAccess.mockResolvedValue({ id: "project-1" });

    const response = await PATCH(
      new Request("http://localhost/api/projects/project-1/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      }),
      { params: { id: "project-1" } }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      project: { id: "project-1", is_active: false },
    });
    expect(supabase.from).toHaveBeenCalledWith("buyer_projects");
    expect(supabase.update).toHaveBeenCalledWith({ is_active: false });
    expect(supabase.eq).toHaveBeenCalledWith("id", "project-1");
    expect(supabase.eq).toHaveBeenCalledWith("buyer_user_id", "buyer-1");
    expect(supabase.select).toHaveBeenCalledWith("id, is_active");
  });

  it("returns 500 when update query fails", async () => {
    const supabase = createStatusSupabase({
      project: null,
      error: { message: "update failed" },
    });
    authMocks.requireRole.mockResolvedValue({
      supabase,
      user: { id: "buyer-1" },
      profile: { role: "buyer" },
    });
    authMocks.requireBuyerProjectAccess.mockResolvedValue({ id: "project-1" });

    const response = await PATCH(
      new Request("http://localhost/api/projects/project-1/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      }),
      { params: { id: "project-1" } }
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Failed to update project status" });
  });
});
