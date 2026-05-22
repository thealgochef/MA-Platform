import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ProjectDealsView from "./ProjectDealsView";

type MockDeal = {
  id: string;
  headline: string;
  industry: string;
  state: string | null;
  region: string | null;
  geography_display: string;
  status: string;
  revenue_year_3: number | null;
  ebitda_year_3: number | null;
  ioi_due_date: string | null;
  loi_due_date: string | null;
  engagement: { id: string; stage: string; nda_status: string } | null;
};

const mockPush = vi.fn();
let mockPathname = "/projects/project-1";
let mockSearchParams = new URLSearchParams();
let mockDeals: MockDeal[] = [];

const sampleDeals: MockDeal[] = [
  {
    id: "deal-1",
    headline: "Alpha Manufacturing",
    industry: "Industrial",
    state: "TX",
    region: null,
    geography_display: "state",
    status: "active",
    revenue_year_3: 1000000,
    ebitda_year_3: 100000,
    ioi_due_date: null,
    loi_due_date: null,
    engagement: null,
  },
];

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}));

vi.mock("@/components/ui/PrimaryTabs", () => ({
  PrimaryTabs: ({ onChange }: { onChange?: (event: unknown, value: unknown) => void }) => (
    <div>
      <button type="button" onClick={() => onChange?.({}, "matches")}>
        Matches tab
      </button>
      <button type="button" onClick={() => onChange?.({}, "active")}>
        Active tab
      </button>
      <button type="button" onClick={() => onChange?.({}, "archive")}>
        Archived tab
      </button>
      <button type="button" onClick={() => onChange?.({}, "unexpected-value")}>
        Invalid tab
      </button>
    </div>
  ),
}));

vi.mock("@/components/ui/ProjectDealsTable", () => ({
  ProjectDealsTable: ({
    rows,
    headlineColumn,
    detailColumns,
    onRowClick,
  }: {
    rows: MockDeal[];
    headlineColumn: {
      renderCell?: (params: {
        row: MockDeal;
        id: string;
        field: string;
        hasFocus: boolean;
        value: string;
      }) => React.ReactNode;
    };
    detailColumns?: Array<{
      field: string;
      renderCell?: (params: { row: MockDeal }) => React.ReactNode;
    }>;
    onRowClick?: (row: MockDeal) => void;
  }) => {
    const actionsColumn = detailColumns?.find((column) => column.field === "actions");
    const firstRow = rows[0];

    return (
      <div>
        <button type="button" onClick={() => firstRow && onRowClick?.(firstRow)}>
          Open first row
        </button>
        {firstRow && (
          <div role="button" tabIndex={0} onClick={() => onRowClick?.(firstRow)}>
            {headlineColumn.renderCell?.({
              row: firstRow,
              id: firstRow.id,
              field: "headline",
              hasFocus: true,
              value: firstRow.headline,
            })}
            {actionsColumn?.renderCell?.({ row: firstRow })}
          </div>
        )}
      </div>
    );
  },
}));

describe("ProjectDealsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/projects/project-1";
    mockSearchParams = new URLSearchParams();
    mockDeals = sampleDeals;

    vi.stubGlobal("fetch", vi.fn(async (input: string | URL) => {
      const url = String(input);

      if (url === "/api/projects/project-1") {
        return {
          ok: true,
          json: async () => ({
            project: { id: "project-1", name: "Project Orion", industry: "Industrial", location: "TX" },
          }),
        };
      }

      if (url.startsWith("/api/projects/project-1/matches")) {
        return {
          ok: true,
          json: async () => ({ deals: mockDeals, nextCursor: null }),
        };
      }

      return {
        ok: false,
        json: async () => ({}),
      };
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("routes to active, archive, and matches tabs", async () => {
    render(<ProjectDealsView projectId="project-1" />);

    await screen.findByRole("button", { name: "Open first row" });

    fireEvent.click(screen.getByRole("button", { name: "Active tab" }));
    expect(mockPush).toHaveBeenCalledWith("/projects/project-1/active");

    fireEvent.click(screen.getByRole("button", { name: "Archived tab" }));
    expect(mockPush).toHaveBeenCalledWith("/projects/project-1/archive");

    fireEvent.click(screen.getByRole("button", { name: "Matches tab" }));
    expect(mockPush).toHaveBeenCalledWith("/projects/project-1");
  });

  it("ignores invalid tab values", async () => {
    render(<ProjectDealsView projectId="project-1" />);

    await screen.findByRole("button", { name: "Open first row" });

    fireEvent.click(screen.getByRole("button", { name: "Invalid tab" }));

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("renders headline links to deal details", async () => {
    render(<ProjectDealsView projectId="project-1" />);

    const headlineLink = await screen.findByRole("link", { name: "Alpha Manufacturing" });
    expect(headlineLink).toHaveAttribute("href", "/deals/deal-1");
  });

  it("keeps row click navigation to deal detail", async () => {
    render(<ProjectDealsView projectId="project-1" />);

    fireEvent.click(await screen.findByRole("button", { name: "Open first row" }));

    expect(mockPush).toHaveBeenCalledWith("/deals/deal-1");
  });

  it("renders Sign NDA action for deals with nda_pending engagement", async () => {
    mockPathname = "/projects/project-1/active";
    mockDeals = [
      {
        ...sampleDeals[0],
        id: "deal-nda",
        headline: "NDA Target",
        engagement: {
          id: "engagement-1",
          stage: "nda_pending",
          nda_status: "pending",
        },
      },
    ];

    render(<ProjectDealsView projectId="project-1" />);

    expect(await screen.findByRole("button", { name: "Sign NDA" })).toBeInTheDocument();
  });

  it("navigates to deal NDA page when Sign NDA is clicked", async () => {
    mockPathname = "/projects/project-1/active";
    mockDeals = [
      {
        ...sampleDeals[0],
        id: "deal-nda",
        headline: "NDA Target",
        engagement: {
          id: "engagement-1",
          stage: "nda_pending",
          nda_status: "pending",
        },
      },
    ];

    render(<ProjectDealsView projectId="project-1" />);

    fireEvent.click(await screen.findByRole("button", { name: "Sign NDA" }));

    expect(mockPush).not.toHaveBeenCalledWith("/deals/deal-nda");
    expect(mockPush).toHaveBeenCalledWith("/deals/deal-nda/nda");
  });

  it("renders Submit IOI as the primary action for deals with nda_signed engagement", async () => {
    mockPathname = "/projects/project-1/active";
    mockDeals = [
      {
        ...sampleDeals[0],
        id: "deal-ioi-ready",
        headline: "IOI Ready Target",
        engagement: {
          id: "engagement-ioi-ready",
          stage: "nda_signed",
          nda_status: "signed",
        },
      },
    ];

    render(<ProjectDealsView projectId="project-1" />);

    const submitIoiButton = await screen.findByRole("button", { name: "Submit IOI" });

    expect(submitIoiButton).toBeInTheDocument();
    expect(submitIoiButton).toHaveClass("MuiButton-contained");
    expect(screen.queryByRole("button", { name: "Sign NDA" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pursue" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Decline" })).not.toBeInTheDocument();
  });

  it("navigates to deal IOI page when Submit IOI is clicked", async () => {
    mockPathname = "/projects/project-1/active";
    mockDeals = [
      {
        ...sampleDeals[0],
        id: "deal-ioi-ready",
        headline: "IOI Ready Target",
        engagement: {
          id: "engagement-ioi-ready",
          stage: "nda_signed",
          nda_status: "signed",
        },
      },
    ];

    render(<ProjectDealsView projectId="project-1" />);

    fireEvent.click(await screen.findByRole("button", { name: "Submit IOI" }));

    expect(mockPush).not.toHaveBeenCalledWith("/deals/deal-ioi-ready");
    expect(mockPush).toHaveBeenCalledWith("/deals/deal-ioi-ready/ioi");
  });

  it("shows Pursue and Decline (and not Sign NDA) when engagement is null", async () => {
    render(<ProjectDealsView projectId="project-1" />);

    expect(await screen.findByRole("button", { name: "Pursue" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Decline" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign NDA" })).not.toBeInTheDocument();
  });

  it("shows Pursue (and not Sign NDA) when engagement stage is declined", async () => {
    mockPathname = "/projects/project-1/archive";
    mockDeals = [
      {
        ...sampleDeals[0],
        id: "deal-declined",
        headline: "Declined Target",
        engagement: {
          id: "engagement-declined",
          stage: "declined",
          nda_status: "not_signed",
        },
      },
    ];

    render(<ProjectDealsView projectId="project-1" />);

    expect(await screen.findByRole("button", { name: "Pursue" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign NDA" })).not.toBeInTheDocument();
  });

  it("does not show Sign NDA for engaged non-declined stages", async () => {
    mockPathname = "/projects/project-1/active";
    mockDeals = [
      {
        ...sampleDeals[0],
        id: "deal-ioi",
        headline: "IOI Target",
        engagement: {
          id: "engagement-ioi",
          stage: "ioi_submitted",
          nda_status: "signed",
        },
      },
    ];

    render(<ProjectDealsView projectId="project-1" />);

    await screen.findByRole("button", { name: "Open first row" });
    expect(screen.queryByRole("button", { name: "Sign NDA" })).not.toBeInTheDocument();
  });

  it("renders View IOI action for deals with ioi_submitted engagement", async () => {
    mockPathname = "/projects/project-1/active";
    mockDeals = [
      {
        ...sampleDeals[0],
        id: "deal-ioi-submitted",
        headline: "IOI Submitted Target",
        engagement: {
          id: "engagement-ioi-submitted",
          stage: "ioi_submitted",
          nda_status: "signed",
        },
      },
    ];

    render(<ProjectDealsView projectId="project-1" />);

    const viewIoiButton = await screen.findByRole("button", { name: "View IOI" });

    expect(viewIoiButton).toBeInTheDocument();
    expect(viewIoiButton).toHaveClass("MuiButton-contained");
    expect(screen.queryByRole("button", { name: "Submit IOI" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign NDA" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pursue" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Decline" })).not.toBeInTheDocument();
  });

  it("navigates to deal IOI page when View IOI is clicked", async () => {
    mockPathname = "/projects/project-1/active";
    mockDeals = [
      {
        ...sampleDeals[0],
        id: "deal-ioi-submitted",
        headline: "IOI Submitted Target",
        engagement: {
          id: "engagement-ioi-submitted",
          stage: "ioi_submitted",
          nda_status: "signed",
        },
      },
    ];

    render(<ProjectDealsView projectId="project-1" />);

    fireEvent.click(await screen.findByRole("button", { name: "View IOI" }));

    expect(mockPush).not.toHaveBeenCalledWith("/deals/deal-ioi-submitted");
    expect(mockPush).toHaveBeenCalledWith("/deals/deal-ioi-submitted/ioi");
  });

  it("renders View LOI action for deals with loi_submitted engagement", async () => {
    mockPathname = "/projects/project-1/active";
    mockDeals = [
      {
        ...sampleDeals[0],
        id: "deal-loi-submitted",
        headline: "LOI Submitted Target",
        engagement: {
          id: "engagement-loi-submitted",
          stage: "loi_submitted",
          nda_status: "signed",
        },
      },
    ];

    render(<ProjectDealsView projectId="project-1" />);

    const viewLoiButton = await screen.findByRole("button", { name: "View LOI" });

    expect(viewLoiButton).toBeInTheDocument();
    expect(viewLoiButton).toHaveClass("MuiButton-contained");
    expect(screen.queryByRole("button", { name: "Submit IOI" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "View IOI" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign NDA" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pursue" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Decline" })).not.toBeInTheDocument();
  });

  it("navigates to deal LOI page when View LOI is clicked", async () => {
    mockPathname = "/projects/project-1/active";
    mockDeals = [
      {
        ...sampleDeals[0],
        id: "deal-loi-submitted",
        headline: "LOI Submitted Target",
        engagement: {
          id: "engagement-loi-submitted",
          stage: "loi_submitted",
          nda_status: "signed",
        },
      },
    ];

    render(<ProjectDealsView projectId="project-1" />);

    fireEvent.click(await screen.findByRole("button", { name: "View LOI" }));

    expect(mockPush).not.toHaveBeenCalledWith("/deals/deal-loi-submitted");
    expect(mockPush).toHaveBeenCalledWith("/deals/deal-loi-submitted/loi");
  });

  it("shows and dismisses saved banner from query param", async () => {
    mockSearchParams = new URLSearchParams("saved=1");

    render(<ProjectDealsView projectId="project-1" />);

    expect(await screen.findByText("Changes saved.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss saved confirmation" }));

    await waitFor(() => {
      expect(screen.queryByText("Changes saved.")).not.toBeInTheDocument();
    });
  });

  it("uses full-width header wrapper classes instead of max-width container classes", async () => {
    render(<ProjectDealsView projectId="project-1" />);

    const heading = await screen.findByRole("heading", { name: "Project Orion" });
    const headerContainer = heading.closest("div.w-full");

    expect(headerContainer).toHaveClass("w-full", "px-5", "sm:px-6");
    expect(headerContainer).not.toHaveClass("max-w-6xl", "mx-auto");
    expect(headerContainer).not.toHaveClass("px-4");
  });

  it("uses full-width content wrapper classes for the deals table section", async () => {
    render(<ProjectDealsView projectId="project-1" />);

    const openFirstRowButton = await screen.findByRole("button", { name: "Open first row" });
    const contentWrapper = openFirstRowButton.closest("div.w-full.px-4.pb-8");

    expect(contentWrapper).toHaveClass("w-full", "px-4", "pb-8");
    expect(contentWrapper).not.toHaveClass("max-w-6xl", "mx-auto");
  });
});
