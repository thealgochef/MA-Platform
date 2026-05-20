import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextResponse } from "next/server";

const authMocks = vi.hoisted(() => ({
  requireApprovedUser: vi.fn(),
  requireBrokerDealAccess: vi.fn(),
  isAuthResponse: vi.fn((value: unknown) => value instanceof Response),
}));

vi.mock("@/server/auth", () => authMocks);

import { GET as getDealDocuments } from "@/app/api/deals/[id]/documents/route";
import { GET as getDealClosure } from "@/app/api/deals/[id]/close/route";

type QueryResult<T> = { data: T | null; error: unknown };

function createDocumentsSupabase(result: QueryResult<unknown[]>) {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(result),
  };

  return {
    supabase: {
      from: vi.fn().mockReturnValue(query),
    },
    query,
  };
}

function createClosureSupabase(result: QueryResult<Record<string, unknown>>) {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
  };

  return {
    supabase: {
      from: vi.fn().mockReturnValue(query),
    },
    query,
  };
}

describe("runtime route auth tests for hardened GET endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/deals/[id]/documents", () => {
    it("passes through auth response when requireApprovedUser returns a NextResponse", async () => {
      const authResponse = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      authMocks.requireApprovedUser.mockResolvedValue(authResponse);

      const response = await getDealDocuments(new Request("http://localhost/api/deals/deal-1/documents"), {
        params: { id: "deal-1" },
      });

      expect(response).toBe(authResponse);
      expect(response.status).toBe(401);
      expect(authMocks.requireApprovedUser).toHaveBeenCalledTimes(1);
      expect(authMocks.requireBrokerDealAccess).not.toHaveBeenCalled();
    });

    it("returns 403 for approved buyer", async () => {
      const { supabase } = createDocumentsSupabase({ data: [], error: null });
      authMocks.requireApprovedUser.mockResolvedValue({
        supabase,
        profile: { role: "buyer" },
      });

      const response = await getDealDocuments(new Request("http://localhost/api/deals/deal-1/documents"), {
        params: { id: "deal-1" },
      });

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it("broker path calls requireBrokerDealAccess and returns its auth response", async () => {
      const { supabase } = createDocumentsSupabase({ data: [], error: null });
      const brokerAuthResponse = NextResponse.json({ error: "Not found" }, { status: 404 });

      authMocks.requireApprovedUser.mockResolvedValue({
        supabase,
        profile: { role: "broker", firm_id: "firm-1" },
      });
      authMocks.requireBrokerDealAccess.mockResolvedValue(brokerAuthResponse);

      const response = await getDealDocuments(new Request("http://localhost/api/deals/deal-1/documents"), {
        params: { id: "deal-1" },
      });

      expect(authMocks.requireBrokerDealAccess).toHaveBeenCalledWith(
        supabase,
        expect.objectContaining({ role: "broker" }),
        "deal-1",
        "id"
      );
      expect(response).toBe(brokerAuthResponse);
      expect(response.status).toBe(404);
    });

    it("broker success returns 200 with documents payload", async () => {
      const documents = [{ id: "doc-1", file_name: "teaser.pdf" }];
      const { supabase, query } = createDocumentsSupabase({ data: documents, error: null });

      authMocks.requireApprovedUser.mockResolvedValue({
        supabase,
        profile: { role: "broker", firm_id: "firm-1" },
      });
      authMocks.requireBrokerDealAccess.mockResolvedValue({ id: "deal-1" });

      const response = await getDealDocuments(new Request("http://localhost/api/deals/deal-1/documents"), {
        params: { id: "deal-1" },
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ documents });
      expect(authMocks.requireBrokerDealAccess).toHaveBeenCalledWith(
        supabase,
        expect.objectContaining({ role: "broker" }),
        "deal-1",
        "id"
      );
      expect(query.eq).toHaveBeenCalledWith("deal_id", "deal-1");
      expect(query.order).toHaveBeenCalledWith("created_at", { ascending: false });
    });

    it("admin query failure returns 500", async () => {
      const { supabase } = createDocumentsSupabase({
        data: null,
        error: { message: "db exploded" },
      });

      authMocks.requireApprovedUser.mockResolvedValue({
        supabase,
        profile: { role: "admin" },
      });

      const response = await getDealDocuments(new Request("http://localhost/api/deals/deal-1/documents"), {
        params: { id: "deal-1" },
      });

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({ error: "Failed to fetch documents" });
    });
  });

  describe("GET /api/deals/[id]/close", () => {
    it("passes through auth response when requireApprovedUser returns NextResponse", async () => {
      const authResponse = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      authMocks.requireApprovedUser.mockResolvedValue(authResponse);

      const response = await getDealClosure(new Request("http://localhost/api/deals/deal-1/close"), {
        params: { id: "deal-1" },
      });

      expect(response).toBe(authResponse);
      expect(response.status).toBe(401);
      expect(authMocks.requireApprovedUser).toHaveBeenCalledTimes(1);
    });

    it("buyer success applies buyer scope filter and returns 200 with closure", async () => {
      const closure = { id: "closure-1", deal_id: "deal-1" };
      const { supabase, query } = createClosureSupabase({ data: closure, error: null });

      authMocks.requireApprovedUser.mockResolvedValue({
        supabase,
        user: { id: "buyer-1" },
        profile: { role: "buyer" },
      });

      const response = await getDealClosure(new Request("http://localhost/api/deals/deal-1/close"), {
        params: { id: "deal-1" },
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ closure });
      expect(query.eq).toHaveBeenCalledWith("deal_id", "deal-1");
      expect(query.eq).toHaveBeenCalledWith("buyer_user_id", "buyer-1");
    });

    it("buyer no-row detection returns 404 when message contains no rows", async () => {
      const { supabase } = createClosureSupabase({
        data: null,
        error: { code: "PGRST116", message: "JSON object requested, but no rows returned", details: "result absent" },
      });

      authMocks.requireApprovedUser.mockResolvedValue({
        supabase,
        user: { id: "buyer-1" },
        profile: { role: "buyer" },
      });

      const response = await getDealClosure(new Request("http://localhost/api/deals/deal-1/close"), {
        params: { id: "deal-1" },
      });

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({ error: "No closure record found" });
    });

    it("buyer no-row detection returns 404 when details contain 0 rows", async () => {
      const { supabase } = createClosureSupabase({
        data: null,
        error: { code: "PGRST116", message: "result shape mismatch", details: "The result contains 0 rows" },
      });

      authMocks.requireApprovedUser.mockResolvedValue({
        supabase,
        user: { id: "buyer-1" },
        profile: { role: "buyer" },
      });

      const response = await getDealClosure(new Request("http://localhost/api/deals/deal-1/close"), {
        params: { id: "deal-1" },
      });

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({ error: "No closure record found" });
    });

    it("PGRST116 non-no-row error returns 500 and logs closure fetch failure", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
      const { supabase } = createClosureSupabase({
        data: null,
        error: { code: "PGRST116", message: "JSON object requested, multiple rows returned", details: "Results contain 2 rows" },
      });

      authMocks.requireApprovedUser.mockResolvedValue({
        supabase,
        user: { id: "buyer-1" },
        profile: { role: "buyer" },
      });

      const response = await getDealClosure(new Request("http://localhost/api/deals/deal-1/close"), {
        params: { id: "deal-1" },
      });

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({ error: "Failed to fetch closure record" });
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("broker without firm_id returns 404", async () => {
      const { supabase, query } = createClosureSupabase({ data: null, error: null });

      authMocks.requireApprovedUser.mockResolvedValue({
        supabase,
        user: { id: "broker-1" },
        profile: { role: "broker", firm_id: null },
      });

      const response = await getDealClosure(new Request("http://localhost/api/deals/deal-1/close"), {
        params: { id: "deal-1" },
      });

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({ error: "No closure record found" });
      expect(query.eq).toHaveBeenCalledWith("deal_id", "deal-1");
      expect(query.eq).not.toHaveBeenCalledWith("broker_firm_id", expect.anything());
      expect(query.single).not.toHaveBeenCalled();
    });

    it("broker non-no-row DB error returns 500 and applies broker firm filter", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
      const { supabase, query } = createClosureSupabase({
        data: null,
        error: { code: "XX000", message: "connection dropped", details: null },
      });

      authMocks.requireApprovedUser.mockResolvedValue({
        supabase,
        user: { id: "broker-1" },
        profile: { role: "broker", firm_id: "firm-1" },
      });

      const response = await getDealClosure(new Request("http://localhost/api/deals/deal-1/close"), {
        params: { id: "deal-1" },
      });

      expect(query.eq).toHaveBeenCalledWith("broker_firm_id", "firm-1");
      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({ error: "Failed to fetch closure record" });
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("non-admin unknown role returns 404", async () => {
      const { supabase, query } = createClosureSupabase({ data: null, error: null });

      authMocks.requireApprovedUser.mockResolvedValue({
        supabase,
        user: { id: "user-1" },
        profile: { role: "analyst" },
      });

      const response = await getDealClosure(new Request("http://localhost/api/deals/deal-1/close"), {
        params: { id: "deal-1" },
      });

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({ error: "No closure record found" });
      expect(query.single).not.toHaveBeenCalled();
    });

    it("admin success returns 200", async () => {
      const closure = { id: "closure-1", deal_id: "deal-1", enterprise_value: 1000000 };
      const { supabase, query } = createClosureSupabase({ data: closure, error: null });

      authMocks.requireApprovedUser.mockResolvedValue({
        supabase,
        user: { id: "admin-1" },
        profile: { role: "admin" },
      });

      const response = await getDealClosure(new Request("http://localhost/api/deals/deal-1/close"), {
        params: { id: "deal-1" },
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ closure });
      expect(query.eq).toHaveBeenCalledTimes(1);
      expect(query.eq).toHaveBeenCalledWith("deal_id", "deal-1");
    });

    it("returns 404 when query succeeds but closure row is null", async () => {
      const { supabase, query } = createClosureSupabase({ data: null, error: null });

      authMocks.requireApprovedUser.mockResolvedValue({
        supabase,
        user: { id: "admin-1" },
        profile: { role: "admin" },
      });

      const response = await getDealClosure(new Request("http://localhost/api/deals/deal-1/close"), {
        params: { id: "deal-1" },
      });

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({ error: "No closure record found" });
      expect(query.single).toHaveBeenCalledTimes(1);
    });
  });
});
