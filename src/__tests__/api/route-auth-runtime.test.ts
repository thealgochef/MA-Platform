import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextResponse } from "next/server";

const authMocks = vi.hoisted(() => ({
  requireApprovedUser: vi.fn(),
  requireBrokerDealAccess: vi.fn(),
  isAuthResponse: vi.fn((value: unknown) => value instanceof Response),
}));

const notificationMocks = vi.hoisted(() => ({
  notifyBroker: vi.fn(),
  notifyAdmin: vi.fn(),
}));

vi.mock("@/server/auth", () => authMocks);
vi.mock("@/lib/notifications", () => notificationMocks);

import { GET as getDealDocuments } from "@/app/api/deals/[id]/documents/route";
import { GET as getDealClosure } from "@/app/api/deals/[id]/close/route";
import { GET as getIoi, POST as postIoi } from "@/app/api/deals/[id]/ioi/route";
import { GET as getLoi, POST as postLoi } from "@/app/api/deals/[id]/loi/route";

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

function createIoiGetSupabase({
  dealStatus,
  engagement,
  iois,
}: {
  dealStatus: string;
  engagement: Record<string, unknown> | null;
  iois: unknown[];
}) {
  const dealsQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: "deal-1", status: dealStatus }, error: null }),
  };

  const engagementsQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: engagement, error: null }),
  };

  const ioiQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: iois, error: null }),
  };

  return {
    supabase: {
      from: vi.fn((table: string) => {
        if (table === "deals") return dealsQuery;
        if (table === "deal_engagements") return engagementsQuery;
        if (table === "iois") return ioiQuery;
        throw new Error(`Unexpected table: ${table}`);
      }),
    },
    dealsQuery,
    engagementsQuery,
    ioiQuery,
  };
}

function createIoiPostSupabase({
  dealStatus,
  engagement,
  insertedIoi,
}: {
  dealStatus: string;
  engagement: Record<string, unknown> | null;
  insertedIoi: Record<string, unknown>;
}) {
  const tableCalls: Record<string, number> = {};

  const dealsQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: "deal-1", status: dealStatus }, error: null }),
  };

  const engagementSelectQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: engagement, error: null }),
  };

  const ioiInsertQuery = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: insertedIoi, error: null }),
  };

  const engagementUpdateQuery = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  const activityLogQuery = {
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  return {
    supabase: {
      from: vi.fn((table: string) => {
        tableCalls[table] = (tableCalls[table] ?? 0) + 1;
        if (table === "deals") return dealsQuery;
        if (table === "deal_engagements") {
          return tableCalls[table] === 1 ? engagementSelectQuery : engagementUpdateQuery;
        }
        if (table === "iois") return ioiInsertQuery;
        if (table === "deal_activity_log") return activityLogQuery;
        throw new Error(`Unexpected table: ${table}`);
      }),
    },
    dealsQuery,
    engagementSelectQuery,
    ioiInsertQuery,
  };
}

function createLoiGetSupabase({
  dealStatus,
  engagement,
  lois,
}: {
  dealStatus: string;
  engagement: Record<string, unknown> | null;
  lois: unknown[];
}) {
  const dealsQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: "deal-1", status: dealStatus }, error: null }),
  };

  const engagementsQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: engagement, error: null }),
  };

  const loiQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: lois, error: null }),
  };

  return {
    supabase: {
      from: vi.fn((table: string) => {
        if (table === "deals") return dealsQuery;
        if (table === "deal_engagements") return engagementsQuery;
        if (table === "lois") return loiQuery;
        throw new Error(`Unexpected table: ${table}`);
      }),
    },
    dealsQuery,
    engagementsQuery,
    loiQuery,
  };
}

function createLoiPostSupabase({
  dealStatus,
  engagement,
  insertedLoi,
}: {
  dealStatus: string;
  engagement: Record<string, unknown> | null;
  insertedLoi: Record<string, unknown>;
}) {
  const tableCalls: Record<string, number> = {};

  const dealsQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: "deal-1", status: dealStatus }, error: null }),
  };

  const engagementSelectQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: engagement, error: null }),
  };

  const loiInsertQuery = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: insertedLoi, error: null }),
  };

  const engagementUpdateQuery = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  const activityLogQuery = {
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  return {
    supabase: {
      from: vi.fn((table: string) => {
        tableCalls[table] = (tableCalls[table] ?? 0) + 1;
        if (table === "deals") return dealsQuery;
        if (table === "deal_engagements") {
          return tableCalls[table] === 1 ? engagementSelectQuery : engagementUpdateQuery;
        }
        if (table === "lois") return loiInsertQuery;
        if (table === "deal_activity_log") return activityLogQuery;
        throw new Error(`Unexpected table: ${table}`);
      }),
    },
    dealsQuery,
    engagementSelectQuery,
    loiInsertQuery,
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

  describe("/api/deals/[id]/ioi runtime gating", () => {
    it("GET passes through auth response", async () => {
      const authResponse = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      authMocks.requireApprovedUser.mockResolvedValue(authResponse);

      const response = await getIoi(new Request("http://localhost/api/deals/deal-1/ioi"), {
        params: { id: "deal-1" },
      });

      expect(response).toBe(authResponse);
      expect(response.status).toBe(401);
    });

    it("GET returns 403 for non-buyer users", async () => {
      const supabase = { from: vi.fn() };
      authMocks.requireApprovedUser.mockResolvedValue({
        supabase,
        user: { id: "user-1" },
        profile: { role: "broker" },
      });

      const response = await getIoi(new Request("http://localhost/api/deals/deal-1/ioi"), {
        params: { id: "deal-1" },
      });

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it("GET returns 403 when buyer is authenticated but workflow gating denies access", async () => {
      const { supabase, dealsQuery, engagementsQuery, ioiQuery } = createIoiGetSupabase({
        dealStatus: "accepting_lois",
        engagement: { id: "eng-1", nda_status: "signed", cim_released: true, stage: "nda_signed" },
        iois: [],
      });

      authMocks.requireApprovedUser.mockResolvedValue({
        supabase,
        user: { id: "buyer-1" },
        profile: { role: "buyer" },
      });

      const response = await getIoi(new Request("http://localhost/api/deals/deal-1/ioi"), {
        params: { id: "deal-1" },
      });

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
      expect(dealsQuery.eq).toHaveBeenCalledWith("id", "deal-1");
      expect(engagementsQuery.eq).toHaveBeenCalledWith("deal_id", "deal-1");
      expect(engagementsQuery.eq).toHaveBeenCalledWith("buyer_user_id", "buyer-1");
      expect(ioiQuery.order).not.toHaveBeenCalled();
    });

    it("GET returns IOIs for eligible buyer and applies buyer filter", async () => {
      const iois = [{ id: "ioi-1", deal_id: "deal-1" }];
      const { supabase, ioiQuery } = createIoiGetSupabase({
        dealStatus: "accepting_iois",
        engagement: { id: "eng-1", nda_status: "signed", cim_released: true, stage: "nda_signed" },
        iois,
      });

      authMocks.requireApprovedUser.mockResolvedValue({
        supabase,
        user: { id: "buyer-1" },
        profile: { role: "buyer" },
      });

      const response = await getIoi(new Request("http://localhost/api/deals/deal-1/ioi"), {
        params: { id: "deal-1" },
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ iois });
      expect(ioiQuery.eq).toHaveBeenCalledWith("deal_id", "deal-1");
      expect(ioiQuery.eq).toHaveBeenCalledWith("buyer_user_id", "buyer-1");
      expect(ioiQuery.order).toHaveBeenCalledWith("submitted_at", { ascending: false });
    });

    it("POST returns 403 when gating fails for authenticated buyer", async () => {
      const { supabase, dealsQuery, engagementSelectQuery, ioiInsertQuery } = createIoiPostSupabase({
        dealStatus: "accepting_lois",
        engagement: { id: "eng-1", nda_status: "signed", cim_released: true, stage: "nda_signed" },
        insertedIoi: { id: "ioi-1" },
      });

      authMocks.requireApprovedUser.mockResolvedValue({
        supabase,
        user: { id: "buyer-1" },
        profile: { role: "buyer", firm_id: "buyer-firm-1" },
      });

      const request = new Request("http://localhost/api/deals/deal-1/ioi", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await postIoi(request, { params: { id: "deal-1" } });

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({ error: "IOI workflow is not available" });
      expect(dealsQuery.eq).toHaveBeenCalledWith("id", "deal-1");
      expect(engagementSelectQuery.eq).toHaveBeenCalledWith("deal_id", "deal-1");
      expect(engagementSelectQuery.eq).toHaveBeenCalledWith("buyer_user_id", "buyer-1");
      expect(ioiInsertQuery.insert).not.toHaveBeenCalled();
    });

    it("POST inserts IOI when gating allows eligible buyer", async () => {
      const { supabase, ioiInsertQuery } = createIoiPostSupabase({
        dealStatus: "accepting_iois",
        engagement: { id: "eng-1", nda_status: "signed", cim_released: true, stage: "nda_signed" },
        insertedIoi: { id: "ioi-1", deal_id: "deal-1" },
      });

      authMocks.requireApprovedUser.mockResolvedValue({
        supabase,
        user: { id: "buyer-1" },
        profile: { role: "buyer", firm_id: "buyer-firm-1" },
      });

      const request = new Request("http://localhost/api/deals/deal-1/ioi", {
        method: "POST",
        body: JSON.stringify({
          offerPrice: 100,
          multiple: 4,
          earnout: "none",
          rollover: "10%",
          cashAtClose: 90,
          timeToClose: "60 days",
          isPlatform: true,
          isAddon: false,
        }),
      });

      const response = await postIoi(request, { params: { id: "deal-1" } });

      expect(response.status).toBe(201);
      await expect(response.json()).resolves.toEqual({ ioi: { id: "ioi-1", deal_id: "deal-1" } });
      expect(ioiInsertQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          deal_id: "deal-1",
          engagement_id: "eng-1",
          buyer_user_id: "buyer-1",
          buyer_firm_id: "buyer-firm-1",
          offer_price: 100,
        })
      );
    });
  });

  describe("/api/deals/[id]/loi runtime gating", () => {
    it("GET passes through auth response", async () => {
      const authResponse = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      authMocks.requireApprovedUser.mockResolvedValue(authResponse);

      const response = await getLoi(new Request("http://localhost/api/deals/deal-1/loi"), {
        params: { id: "deal-1" },
      });

      expect(response).toBe(authResponse);
      expect(response.status).toBe(401);
    });

    it("GET returns 403 for non-buyer users", async () => {
      const supabase = { from: vi.fn() };
      authMocks.requireApprovedUser.mockResolvedValue({
        supabase,
        user: { id: "user-1" },
        profile: { role: "broker" },
      });

      const response = await getLoi(new Request("http://localhost/api/deals/deal-1/loi"), {
        params: { id: "deal-1" },
      });

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it("POST passes through auth response", async () => {
      const authResponse = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      authMocks.requireApprovedUser.mockResolvedValue(authResponse);

      const request = new Request("http://localhost/api/deals/deal-1/loi", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await postLoi(request, { params: { id: "deal-1" } });

      expect(response).toBe(authResponse);
      expect(response.status).toBe(401);
    });

    it("POST returns 403 for non-buyer users", async () => {
      const supabase = { from: vi.fn() };
      authMocks.requireApprovedUser.mockResolvedValue({
        supabase,
        user: { id: "user-1" },
        profile: { role: "broker" },
      });

      const request = new Request("http://localhost/api/deals/deal-1/loi", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await postLoi(request, { params: { id: "deal-1" } });

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it("GET returns 403 when LOI gating denies access", async () => {
      const { supabase, dealsQuery, engagementsQuery, loiQuery } = createLoiGetSupabase({
        dealStatus: "accepting_iois",
        engagement: { id: "eng-1", nda_status: "signed", stage: "ioi_submitted" },
        lois: [],
      });

      authMocks.requireApprovedUser.mockResolvedValue({
        supabase,
        user: { id: "buyer-1" },
        profile: { role: "buyer" },
      });

      const response = await getLoi(new Request("http://localhost/api/deals/deal-1/loi"), {
        params: { id: "deal-1" },
      });

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
      expect(dealsQuery.eq).toHaveBeenCalledWith("id", "deal-1");
      expect(engagementsQuery.eq).toHaveBeenCalledWith("deal_id", "deal-1");
      expect(engagementsQuery.eq).toHaveBeenCalledWith("buyer_user_id", "buyer-1");
      expect(loiQuery.order).not.toHaveBeenCalled();
    });

    it("GET returns LOIs for eligible buyer and applies buyer filter", async () => {
      const lois = [{ id: "loi-1", deal_id: "deal-1" }];
      const { supabase, loiQuery } = createLoiGetSupabase({
        dealStatus: "accepting_lois",
        engagement: { id: "eng-1", nda_status: "signed", stage: "ioi_submitted" },
        lois,
      });

      authMocks.requireApprovedUser.mockResolvedValue({
        supabase,
        user: { id: "buyer-1" },
        profile: { role: "buyer" },
      });

      const response = await getLoi(new Request("http://localhost/api/deals/deal-1/loi"), {
        params: { id: "deal-1" },
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ lois });
      expect(loiQuery.eq).toHaveBeenCalledWith("deal_id", "deal-1");
      expect(loiQuery.eq).toHaveBeenCalledWith("buyer_user_id", "buyer-1");
      expect(loiQuery.order).toHaveBeenCalledWith("submitted_at", { ascending: false });
    });

    it("POST returns 403 when LOI gating fails", async () => {
      const { supabase, dealsQuery, engagementSelectQuery, loiInsertQuery } = createLoiPostSupabase({
        dealStatus: "accepting_iois",
        engagement: { id: "eng-1", nda_status: "signed", stage: "ioi_submitted" },
        insertedLoi: { id: "loi-1" },
      });

      authMocks.requireApprovedUser.mockResolvedValue({
        supabase,
        user: { id: "buyer-1" },
        profile: { role: "buyer", firm_id: "buyer-firm-1" },
      });

      const request = new Request("http://localhost/api/deals/deal-1/loi", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await postLoi(request, { params: { id: "deal-1" } });

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({ error: "LOI workflow is not available" });
      expect(dealsQuery.eq).toHaveBeenCalledWith("id", "deal-1");
      expect(engagementSelectQuery.eq).toHaveBeenCalledWith("deal_id", "deal-1");
      expect(engagementSelectQuery.eq).toHaveBeenCalledWith("buyer_user_id", "buyer-1");
      expect(loiInsertQuery.insert).not.toHaveBeenCalled();
    });

    it("POST inserts LOI when gating allows eligible buyer", async () => {
      const { supabase, loiInsertQuery } = createLoiPostSupabase({
        dealStatus: "accepting_lois",
        engagement: { id: "eng-1", nda_status: "signed", stage: "ioi_submitted" },
        insertedLoi: { id: "loi-1", deal_id: "deal-1" },
      });

      authMocks.requireApprovedUser.mockResolvedValue({
        supabase,
        user: { id: "buyer-1" },
        profile: { role: "buyer", firm_id: "buyer-firm-1" },
      });

      const request = new Request("http://localhost/api/deals/deal-1/loi", {
        method: "POST",
        body: JSON.stringify({
          offerPrice: 100,
          multiple: 4,
          escrow: "10%",
          timing: "45 days",
          earnout: "none",
          rollover: "10%",
          workingCapitalPeg: "normal",
          cashAtClose: 90,
          isPlatform: true,
          isAddon: false,
        }),
      });

      const response = await postLoi(request, { params: { id: "deal-1" } });

      expect(response.status).toBe(201);
      await expect(response.json()).resolves.toEqual({ loi: { id: "loi-1", deal_id: "deal-1" } });
      expect(loiInsertQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          deal_id: "deal-1",
          engagement_id: "eng-1",
          buyer_user_id: "buyer-1",
          buyer_firm_id: "buyer-firm-1",
          offer_price: 100,
        })
      );
    });
  });
});
