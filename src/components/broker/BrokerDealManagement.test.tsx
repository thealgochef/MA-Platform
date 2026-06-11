import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { VETTING_REJECTION_REASONS } from "@/lib/constants";

import BrokerDealManagement from "./BrokerDealManagement";

type TestDeal = {
  id: string;
  project_name: string;
  headline: string;
  description: string;
  status: string;
  industry: string;
  geography_display: string;
  state: string | null;
  region: string | null;
  revenue_year_1: number | null;
  ebitda_year_1: number | null;
  revenue_year_2: number | null;
  ebitda_year_2: number | null;
  revenue_year_3: number | null;
  ebitda_year_3: number | null;
  revenue_projection: number | null;
  ebitda_projection: number | null;
  fiscal_year_labels: Record<string, string> | null;
  nda_type: string;
  cim_sharing_preference: string;
  nda_vetting_preference: string;
  teaser_document_path: string | null;
  cim_document_path: string | null;
  nda_document_path: string | null;
  point_of_contact_id: string;
  ioi_due_date: string | null;
  loi_due_date: string | null;
  published_at: string | null;
  closed_at: string | null;
  view_count: number;
  created_at: string;
};

type TestEngagement = {
  id: string;
  stage: string;
  nda_status: string;
  vetting_status?: string | null;
  vetting_rejection_reason?: string | null;
  cim_released: boolean;
  cim_released_at?: string | null;
  cim_viewed_at: string | null;
  cim_downloaded_at: string | null;
  users: {
    id: string;
    full_name: string;
    email: string;
    buyer_type: string | null;
    firms: { id: string; name: string; website: string } | null;
  };
  firms?: { id: string; name: string } | null;
};

const mockPush = vi.fn();
const mockParams = { id: "deal-123" };

vi.mock("next/navigation", () => ({
  useParams: () => mockParams,
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

const BASE_DEAL: TestDeal = {
  id: "deal-123",
  project_name: "Project Helios",
  headline: "Industrial carve-out",
  description: "Broker managed process",
  status: "accepting_iois",
  industry: "Industrial",
  geography_display: "state",
  state: "TX",
  region: null,
  revenue_year_1: null,
  ebitda_year_1: null,
  revenue_year_2: null,
  ebitda_year_2: null,
  revenue_year_3: null,
  ebitda_year_3: null,
  revenue_projection: null,
  ebitda_projection: null,
  fiscal_year_labels: null,
  nda_type: "platform",
  cim_sharing_preference: "manual",
  nda_vetting_preference: "manual",
  teaser_document_path: null,
  cim_document_path: null,
  nda_document_path: null,
  point_of_contact_id: "user-1",
  ioi_due_date: null,
  loi_due_date: null,
  published_at: "2026-01-01T00:00:00.000Z",
  closed_at: null,
  view_count: 0,
  created_at: "2026-01-01T00:00:00.000Z",
};

function makeEngagement(overrides: Partial<TestEngagement>): TestEngagement {
  const id = overrides.id ?? "eng-1";
  return {
    id,
    stage: overrides.stage ?? "pursued",
    nda_status: overrides.nda_status ?? "not_sent",
    vetting_status: overrides.vetting_status ?? null,
    vetting_rejection_reason: overrides.vetting_rejection_reason ?? null,
    cim_released: overrides.cim_released ?? false,
    cim_released_at: overrides.cim_released_at ?? null,
    cim_viewed_at: overrides.cim_viewed_at ?? null,
    cim_downloaded_at: overrides.cim_downloaded_at ?? null,
    users: {
      id: `user-${id}`,
      full_name: overrides.users?.full_name ?? `Buyer ${id}`,
      email: overrides.users?.email ?? `${id}@example.com`,
      buyer_type: overrides.users?.buyer_type ?? "pe",
      firms: overrides.users?.firms ?? {
        id: `firm-${id}`,
        name: `Firm ${id}`,
        website: "https://example.com",
      },
    },
    firms: overrides.firms ?? null,
  };
}

function jsonResponse(payload: unknown, ok = true) {
  return {
    ok,
    json: async () => payload,
  };
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

async function renderPipelineWithFetchMock({
  deal,
  engagements,
  onActionRequest,
}: {
  deal?: Partial<TestDeal>;
  engagements: TestEngagement[];
  onActionRequest?: (url: string, init: RequestInit) => Promise<{ ok: boolean; payload: unknown }>;
}) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/deals/deal-123" && method === "GET") {
        return jsonResponse({ deal: { ...BASE_DEAL, ...deal } });
      }

      if (url === "/api/deals/deal-123/buyers" && method === "GET") {
        return jsonResponse({ engagements, iois: [], lois: [] });
      }

      if (url === "/api/deals/deal-123/documents" && method === "GET") {
        return jsonResponse({ documents: [] });
      }

      if (url === "/api/deals/deal-123/timeline" && method === "GET") {
        return jsonResponse({ activities: [] });
      }

      if (
        (url === "/api/deals/deal-123/vetting" || url === "/api/deals/deal-123/cim") &&
        method === "PATCH" &&
        onActionRequest
      ) {
        const result = await onActionRequest(url, init ?? {});
        return jsonResponse(result.payload, result.ok);
      }

      return jsonResponse({}, false);
    })
  );

  render(<BrokerDealManagement />);

  await screen.findByRole("heading", { name: "Project Helios" });
  fireEvent.click(screen.getByRole("button", { name: "Pipeline" }));
  await screen.findByRole("columnheader", { name: "Actions" });
}

function getRowForBuyer(buyerName: string) {
  const buyerCell = screen.getByText(buyerName);
  const row = buyerCell.closest("tr");
  expect(row).toBeTruthy();
  return row as HTMLTableRowElement;
}

describe("BrokerDealManagement pipeline manual actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders an Actions column and row placeholder when no actions are available", async () => {
    await renderPipelineWithFetchMock({
      engagements: [
        makeEngagement({
          id: "no-actions",
          users: {
            id: "user-no-actions",
            full_name: "No Actions Buyer",
            email: "no-actions@example.com",
            buyer_type: "pe",
            firms: { id: "firm-no-actions", name: "No Actions Firm", website: "https://example.com" },
          },
          nda_status: "sent",
          vetting_status: "approved",
          cim_released: true,
        }),
      ],
    });

    expect(screen.getByRole("columnheader", { name: "Actions" })).toBeInTheDocument();
    const row = getRowForBuyer("No Actions Buyer");
    expect(within(row).getByText("—")).toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: /Approve NDA vetting/i })).not.toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: /Reject NDA vetting/i })).not.toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: /Release CIM/i })).not.toBeInTheDocument();
  });

  it("shows Approve and Reject only for pending review rows when NDA vetting is manual", async () => {
    await renderPipelineWithFetchMock({
      deal: { nda_vetting_preference: "manual" },
      engagements: [
        makeEngagement({
          id: "vetting-allowed",
          users: {
            id: "user-vetting-allowed",
            full_name: "Manual Vetting Buyer",
            email: "manual-vetting@example.com",
            buyer_type: "pe",
            firms: { id: "firm-vetting-allowed", name: "Manual Vetting Firm", website: "https://example.com" },
          },
          nda_status: "pending_review",
          vetting_status: "pending",
        }),
        makeEngagement({
          id: "vetting-denied",
          users: {
            id: "user-vetting-denied",
            full_name: "Already Approved Buyer",
            email: "approved@example.com",
            buyer_type: "pe",
            firms: { id: "firm-vetting-denied", name: "Approved Firm", website: "https://example.com" },
          },
          nda_status: "pending_review",
          vetting_status: "approved",
        }),
      ],
    });

    const eligibleRow = getRowForBuyer("Manual Vetting Buyer");
    expect(within(eligibleRow).getByRole("button", { name: /Approve NDA vetting for Manual Vetting Buyer/i })).toBeInTheDocument();
    expect(within(eligibleRow).getByRole("button", { name: /Reject NDA vetting for Manual Vetting Buyer/i })).toBeInTheDocument();

    const ineligibleRow = getRowForBuyer("Already Approved Buyer");
    expect(within(ineligibleRow).queryByRole("button", { name: /Approve NDA vetting/i })).not.toBeInTheDocument();
    expect(within(ineligibleRow).queryByRole("button", { name: /Reject NDA vetting/i })).not.toBeInTheDocument();
    expect(within(ineligibleRow).getByText("—", { selector: "span" })).toBeInTheDocument();
  });

  it("shows Release CIM only when manual sharing is enabled and row is signed but unreleased", async () => {
    await renderPipelineWithFetchMock({
      deal: { cim_sharing_preference: "manual" },
      engagements: [
        makeEngagement({
          id: "release-allowed",
          users: {
            id: "user-release-allowed",
            full_name: "Release Eligible Buyer",
            email: "release-eligible@example.com",
            buyer_type: "pe",
            firms: { id: "firm-release-allowed", name: "Release Firm", website: "https://example.com" },
          },
          nda_status: "signed",
          cim_released: false,
        }),
        makeEngagement({
          id: "release-denied",
          users: {
            id: "user-release-denied",
            full_name: "Already Released Buyer",
            email: "already-released@example.com",
            buyer_type: "pe",
            firms: { id: "firm-release-denied", name: "Released Firm", website: "https://example.com" },
          },
          nda_status: "signed",
          cim_released: true,
        }),
      ],
    });

    const eligibleRow = getRowForBuyer("Release Eligible Buyer");
    expect(within(eligibleRow).getByRole("button", { name: /Release CIM to Release Eligible Buyer/i })).toBeInTheDocument();

    const ineligibleRow = getRowForBuyer("Already Released Buyer");
    expect(within(ineligibleRow).queryByRole("button", { name: /Release CIM/i })).not.toBeInTheDocument();
    expect(within(ineligibleRow).getByText("—")).toBeInTheDocument();
  });

  it("constrains rejection reasons to configured values and sends selected reason in reject request", async () => {
    const actionSpy = vi.fn(async () => ({ ok: true, payload: {} }));

    await renderPipelineWithFetchMock({
      engagements: [
        makeEngagement({
          id: "reject-row",
          users: {
            id: "user-reject-row",
            full_name: "Rejectable Buyer",
            email: "rejectable@example.com",
            buyer_type: "pe",
            firms: { id: "firm-reject-row", name: "Reject Firm", website: "https://example.com" },
          },
          nda_status: "pending_review",
          vetting_status: "pending",
        }),
      ],
      onActionRequest: actionSpy,
    });

    const row = getRowForBuyer("Rejectable Buyer");
    const reasonSelect = within(row).getByRole("combobox", {
      name: /Select NDA rejection reason for Rejectable Buyer/i,
    });

    const optionValues = within(reasonSelect)
      .getAllByRole("option")
      .map((option) => (option as HTMLOptionElement).value);

    expect(optionValues).toEqual([...VETTING_REJECTION_REASONS]);

    fireEvent.change(reasonSelect, { target: { value: VETTING_REJECTION_REASONS[2] } });
    fireEvent.click(within(row).getByRole("button", { name: /Reject NDA vetting for Rejectable Buyer/i }));

    await waitFor(() => {
      expect(actionSpy).toHaveBeenCalledWith(
        "/api/deals/deal-123/vetting",
        expect.objectContaining({
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    const requestBody = JSON.parse(String(actionSpy.mock.calls[0][1].body));
    expect(requestBody).toEqual({
      engagementId: "reject-row",
      action: "reject",
      reason: VETTING_REJECTION_REASONS[2],
    });
    expect(VETTING_REJECTION_REASONS).toContain(requestBody.reason);
  });

  it("calls approve and release endpoints with expected method and body", async () => {
    const actionSpy = vi.fn(async () => ({ ok: true, payload: {} }));

    await renderPipelineWithFetchMock({
      engagements: [
        makeEngagement({
          id: "approve-row",
          users: {
            id: "user-approve-row",
            full_name: "Approve Buyer",
            email: "approve@example.com",
            buyer_type: "pe",
            firms: { id: "firm-approve-row", name: "Approve Firm", website: "https://example.com" },
          },
          nda_status: "pending_review",
          vetting_status: "pending",
        }),
        makeEngagement({
          id: "release-row",
          users: {
            id: "user-release-row",
            full_name: "Release Buyer",
            email: "release@example.com",
            buyer_type: "pe",
            firms: { id: "firm-release-row", name: "Release Firm", website: "https://example.com" },
          },
          nda_status: "signed",
          cim_released: false,
        }),
      ],
      onActionRequest: actionSpy,
    });

    fireEvent.click(screen.getByRole("button", { name: /Approve NDA vetting for Approve Buyer/i }));
    fireEvent.click(screen.getByRole("button", { name: /Release CIM to Release Buyer/i }));

    await waitFor(() => {
      expect(actionSpy).toHaveBeenCalledTimes(2);
    });

    const approveCall = actionSpy.mock.calls.find(([url]) => url === "/api/deals/deal-123/vetting");
    const releaseCall = actionSpy.mock.calls.find(([url]) => url === "/api/deals/deal-123/cim");

    expect(approveCall).toBeTruthy();
    expect(releaseCall).toBeTruthy();

    expect(JSON.parse(String(approveCall?.[1].body))).toEqual({
      engagementId: "approve-row",
      action: "approve",
    });
    expect(approveCall?.[1].method).toBe("PATCH");

    expect(JSON.parse(String(releaseCall?.[1].body))).toEqual({ engagementId: "release-row" });
    expect(releaseCall?.[1].method).toBe("PATCH");
  });

  it("disables controls during row action loading and surfaces API errors", async () => {
    let resolveReject!: (result: { ok: boolean; payload: unknown }) => void;
    const rejectResponse = new Promise<{ ok: boolean; payload: unknown }>((resolve) => {
      resolveReject = resolve;
    });

    await renderPipelineWithFetchMock({
      engagements: [
        makeEngagement({
          id: "loading-row",
          users: {
            id: "user-loading-row",
            full_name: "Loading Buyer",
            email: "loading@example.com",
            buyer_type: "pe",
            firms: { id: "firm-loading-row", name: "Loading Firm", website: "https://example.com" },
          },
          nda_status: "pending_review",
          vetting_status: "pending",
        }),
      ],
      onActionRequest: async () => rejectResponse,
    });

    const row = getRowForBuyer("Loading Buyer");
    const approveButton = within(row).getByRole("button", { name: /Approve NDA vetting for Loading Buyer/i });
    const rejectButton = within(row).getByRole("button", { name: /Reject NDA vetting for Loading Buyer/i });
    const reasonSelect = within(row).getByRole("combobox", { name: /Select NDA rejection reason for Loading Buyer/i });

    fireEvent.click(rejectButton);

    await waitFor(() => {
      expect(approveButton).toBeDisabled();
      expect(rejectButton).toBeDisabled();
      expect(reasonSelect).toBeDisabled();
      expect(rejectButton).toHaveTextContent("Rejecting...");
    });

    resolveReject({ ok: false, payload: { error: "Vetting action failed for this buyer" } });

    await waitFor(() => {
      expect(within(row).getByRole("alert")).toHaveTextContent("Unable to reject NDA vetting. Please try again.");
    });

    expect(within(row).queryByText("Vetting action failed for this buyer")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(within(row).getByRole("button", { name: /Reject NDA vetting for Loading Buyer/i })).toBeEnabled();
      expect(within(row).getByRole("button", { name: /Approve NDA vetting for Loading Buyer/i })).toBeEnabled();
      expect(within(row).getByRole("combobox", { name: /Select NDA rejection reason for Loading Buyer/i })).toBeEnabled();
    });
  });

  it("keeps latest pipeline and timeline data when refresh responses resolve out of order", async () => {
    const staleBuyersRefresh = deferred<{ ok: boolean; payload: unknown }>();
    const latestBuyersRefresh = deferred<{ ok: boolean; payload: unknown }>();
    const staleTimelineRefresh = deferred<{ ok: boolean; payload: unknown }>();
    const latestTimelineRefresh = deferred<{ ok: boolean; payload: unknown }>();

    const initialEngagements = [
      makeEngagement({
        id: "eng-1",
        users: {
          id: "user-eng-1",
          full_name: "Buyer One",
          email: "buyer-one@example.com",
          buyer_type: "pe",
          firms: { id: "firm-eng-1", name: "Firm One", website: "https://example.com" },
        },
        nda_status: "pending_review",
        vetting_status: "pending",
      }),
      makeEngagement({
        id: "eng-2",
        users: {
          id: "user-eng-2",
          full_name: "Buyer Two",
          email: "buyer-two@example.com",
          buyer_type: "pe",
          firms: { id: "firm-eng-2", name: "Firm Two", website: "https://example.com" },
        },
        nda_status: "pending_review",
        vetting_status: "pending",
      }),
    ];

    const staleEngagements = [
      makeEngagement({
        id: "eng-1",
        users: {
          id: "user-eng-1",
          full_name: "Stale Buyer One",
          email: "stale-one@example.com",
          buyer_type: "pe",
          firms: { id: "firm-eng-1", name: "Firm One", website: "https://example.com" },
        },
        nda_status: "pending_review",
        vetting_status: "pending",
      }),
      makeEngagement({
        id: "eng-2",
        users: {
          id: "user-eng-2",
          full_name: "Stale Buyer Two",
          email: "stale-two@example.com",
          buyer_type: "pe",
          firms: { id: "firm-eng-2", name: "Firm Two", website: "https://example.com" },
        },
        nda_status: "pending_review",
        vetting_status: "pending",
      }),
    ];

    const latestEngagements = [
      makeEngagement({
        id: "eng-1",
        users: {
          id: "user-eng-1",
          full_name: "Latest Buyer One",
          email: "latest-one@example.com",
          buyer_type: "pe",
          firms: { id: "firm-eng-1", name: "Firm One", website: "https://example.com" },
        },
        nda_status: "signed",
        vetting_status: "approved",
      }),
      makeEngagement({
        id: "eng-2",
        users: {
          id: "user-eng-2",
          full_name: "Latest Buyer Two",
          email: "latest-two@example.com",
          buyer_type: "pe",
          firms: { id: "firm-eng-2", name: "Firm Two", website: "https://example.com" },
        },
        nda_status: "signed",
        vetting_status: "approved",
      }),
    ];

    let buyerFetchCount = 0;
    let timelineFetchCount = 0;

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (url === "/api/deals/deal-123" && method === "GET") {
          return jsonResponse({ deal: { ...BASE_DEAL } });
        }

        if (url === "/api/deals/deal-123/buyers" && method === "GET") {
          buyerFetchCount += 1;

          if (buyerFetchCount === 1) {
            return jsonResponse({ engagements: initialEngagements, iois: [], lois: [] });
          }

          if (buyerFetchCount === 2) {
            const staleResult = await staleBuyersRefresh.promise;
            return jsonResponse(staleResult.payload, staleResult.ok);
          }

          const latestResult = await latestBuyersRefresh.promise;
          return jsonResponse(latestResult.payload, latestResult.ok);
        }

        if (url === "/api/deals/deal-123/timeline" && method === "GET") {
          timelineFetchCount += 1;

          if (timelineFetchCount === 1) {
            return jsonResponse({ activities: [] });
          }

          if (timelineFetchCount === 2) {
            const staleResult = await staleTimelineRefresh.promise;
            return jsonResponse(staleResult.payload, staleResult.ok);
          }

          const latestResult = await latestTimelineRefresh.promise;
          return jsonResponse(latestResult.payload, latestResult.ok);
        }

        if (url === "/api/deals/deal-123/documents" && method === "GET") {
          return jsonResponse({ documents: [] });
        }

        if (url === "/api/deals/deal-123/vetting" && method === "PATCH") {
          return jsonResponse({});
        }

        return jsonResponse({}, false);
      })
    );

    render(<BrokerDealManagement />);

    await screen.findByRole("heading", { name: "Project Helios" });
    fireEvent.click(screen.getByRole("button", { name: "Pipeline" }));

    fireEvent.click(screen.getByRole("button", { name: /Approve NDA vetting for Buyer One/i }));
    fireEvent.click(screen.getByRole("button", { name: /Approve NDA vetting for Buyer Two/i }));

    latestBuyersRefresh.resolve({ ok: true, payload: { engagements: latestEngagements, iois: [], lois: [] } });
    latestTimelineRefresh.resolve({
      ok: true,
      payload: {
        activities: [
          {
            id: "activity-latest",
            action: "latest_refresh",
            metadata: {},
            created_at: "2026-01-02T00:00:00.000Z",
            actor: { full_name: "Latest Broker", role: "broker" },
          },
        ],
      },
    });

    await screen.findByText("Latest Buyer One");

    staleBuyersRefresh.resolve({ ok: true, payload: { engagements: staleEngagements, iois: [], lois: [] } });
    staleTimelineRefresh.resolve({
      ok: true,
      payload: {
        activities: [
          {
            id: "activity-stale",
            action: "stale_refresh",
            metadata: {},
            created_at: "2026-01-02T00:00:00.000Z",
            actor: { full_name: "Stale Broker", role: "broker" },
          },
        ],
      },
    });

    await waitFor(() => {
      expect(screen.getByText("Latest Buyer One")).toBeInTheDocument();
      expect(screen.queryByText("Stale Buyer One")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Timeline" }));

    await waitFor(() => {
      expect(screen.getByText(/latest refresh/i)).toBeInTheDocument();
      expect(screen.queryByText(/stale refresh/i)).not.toBeInTheDocument();
    });
  });

  it("shows a distinct initial load error for non-404 deal fetch failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (url === "/api/deals/deal-123" && method === "GET") {
          return jsonResponse({ error: "Unable to load deal details right now." }, false);
        }

        return jsonResponse({}, false);
      })
    );

    render(<BrokerDealManagement />);

    const errorBanner = await screen.findByRole("alert");
    expect(errorBanner).toHaveTextContent("Failed to load this deal. Please try again.");
    expect(screen.queryByText("Unable to load deal details right now.")).not.toBeInTheDocument();
    expect(screen.queryByText("Deal not found.")).not.toBeInTheDocument();
  });

  it("sanitizes delete errors and does not render raw backend messages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (url === "/api/deals/deal-123" && method === "GET") {
          return jsonResponse({ deal: { ...BASE_DEAL } });
        }

        if (url === "/api/deals/deal-123/buyers" && method === "GET") {
          return jsonResponse({ engagements: [], iois: [], lois: [] });
        }

        if (url === "/api/deals/deal-123/documents" && method === "GET") {
          return jsonResponse({ documents: [] });
        }

        if (url === "/api/deals/deal-123/timeline" && method === "GET") {
          return jsonResponse({ activities: [] });
        }

        if (url === "/api/deals/deal-123" && method === "DELETE") {
          return jsonResponse({ error: "sensitive backend detail: relation xyz" }, false);
        }

        return jsonResponse({}, false);
      })
    );

    render(<BrokerDealManagement />);

    await screen.findByRole("heading", { name: "Project Helios" });
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, delete" }));

    await waitFor(() => {
      expect(screen.getByText("Failed to delete this deal. Please try again.")).toBeInTheDocument();
    });

    expect(screen.queryByText("sensitive backend detail: relation xyz")).not.toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
