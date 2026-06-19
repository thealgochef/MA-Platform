import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  push: vi.fn(),
  params: { id: "deal-123" },
}));

vi.mock("next/navigation", () => ({
  useParams: () => mockState.params,
  useRouter: () => ({ push: mockState.push }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: null } })),
    },
  }),
}));

import EditDealPage from "./page";

function buildDeal(industry: string | string[] | null) {
  return {
    project_name: "Project Orion",
    headline: "Industrial carve-out",
    description: "Deal description",
    geography_display: "state",
    state: "TX",
    region: null,
    industry,
    fiscal_year_labels: null,
    revenue_year_1: null,
    ebitda_year_1: null,
    revenue_year_2: null,
    ebitda_year_2: null,
    revenue_year_3: null,
    ebitda_year_3: null,
    revenue_projection: null,
    ebitda_projection: null,
    nda_type: "platform",
    cim_sharing_preference: "auto",
    nda_vetting_preference: "auto",
    point_of_contact_id: "",
    teaser_document_path: null,
    nda_document_path: null,
    cim_document_path: null,
    ioi_due_date: "",
    loi_due_date: "",
  };
}

function getIndustrySelect() {
  const select = screen.getAllByRole("combobox").find((element) => {
    const options = (element as HTMLSelectElement).options;
    return Array.from(options).some((option) => option.value === "Industrial");
  });

  expect(select).toBeTruthy();
  return select as HTMLSelectElement;
}

describe("EditDealPage industry serialization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends industry as a single-item array when saving changes", async () => {
    const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
      const method = init?.method ?? "GET";

      if (String(input) === "/api/deals/deal-123" && method === "GET") {
        return {
          ok: true,
          json: async () => ({ deal: buildDeal("Industrial") }),
        };
      }

      if (String(input) === "/api/deals/deal-123" && method === "PATCH") {
        return {
          ok: true,
          json: async () => ({ deal: { id: "deal-123" } }),
        };
      }

      return { ok: false, json: async () => ({}) };
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<EditDealPage />);

    await screen.findByRole("button", { name: "Save Changes" });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === "PATCH");
      expect(patchCall).toBeTruthy();
    });

    const patchCall = fetchMock.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === "PATCH");
    const payload = JSON.parse(String((patchCall?.[1] as RequestInit).body));

    expect(payload.industry).toEqual(["Industrial"]);
    expect(mockState.push).toHaveBeenCalledWith("/deals/deal-123?saved=1");
  });

  it("sends industry as a single-item array when inbound industry is an array", async () => {
    const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
      const method = init?.method ?? "GET";

      if (String(input) === "/api/deals/deal-123" && method === "GET") {
        return {
          ok: true,
          json: async () => ({ deal: buildDeal(["Industrial"]) }),
        };
      }

      if (String(input) === "/api/deals/deal-123" && method === "PATCH") {
        return {
          ok: true,
          json: async () => ({ deal: { id: "deal-123" } }),
        };
      }

      return { ok: false, json: async () => ({}) };
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<EditDealPage />);

    await screen.findByRole("button", { name: "Save Changes" });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === "PATCH");
      expect(patchCall).toBeTruthy();
    });

    const patchCall = fetchMock.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === "PATCH");
    const payload = JSON.parse(String((patchCall?.[1] as RequestInit).body));

    expect(payload.industry).toEqual(["Industrial"]);
  });

  it.each([
    { label: "array", inboundIndustry: ["Industrial"], expectedValue: "Industrial" },
    { label: "string", inboundIndustry: "Healthcare", expectedValue: "Healthcare" },
    { label: "empty array", inboundIndustry: [], expectedValue: "" },
    { label: "null", inboundIndustry: null, expectedValue: "" },
  ])("uses the first selected industry when deal.industry is $label", async ({ inboundIndustry, expectedValue }) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ deal: buildDeal(inboundIndustry) }),
      }))
    );

    render(<EditDealPage />);

    await screen.findByRole("button", { name: "Save Changes" });

    const industrySelect = getIndustrySelect();
    expect(industrySelect.value).toBe(expectedValue);
  });
});
