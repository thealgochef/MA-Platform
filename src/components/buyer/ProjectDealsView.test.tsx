import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ProjectDealsView, { getProjectDealsRouteForTabChange } from "./ProjectDealsView";

type MockDeal = {
  id: string;
  headline: string;
  date_received?: string | null;
  description?: string | null;
  industry: string;
  state: string | null;
  region: string | null;
  geography_display: string;
  status: string;
  revenue_year_1?: number | null;
  ebitda_year_1?: number | null;
  revenue_year_2?: number | null;
  ebitda_year_2?: number | null;
  revenue_year_3: number | null;
  ebitda_year_3: number | null;
  revenue_projection?: number | null;
  ebitda_projection?: number | null;
  fiscal_year_labels?: Record<string, string> | null;
  nda_type?: string | null;
  cim_sharing_preference?: string | null;
  nda_vetting_preference?: string | null;
  has_teaser_document?: boolean;
  has_cim_document?: boolean;
  has_nda_document?: boolean;
  ioi_due_date: string | null;
  loi_due_date: string | null;
  published_at?: string | null;
  closed_at?: string | null;
  engagement: {
    id: string;
    stage: string;
    nda_status: string;
    nda_signed_at?: string | null;
    cim_released?: boolean | null;
    cim_released_at?: string | null;
    cim_viewed_at?: string | null;
    cim_downloaded_at?: string | null;
    pass_reason?: string | null;
    pass_reason_detail?: string | null;
    declined_at?: string | null;
    vetting_status?: string | null;
    vetting_rejection_reason?: string | null;
  } | null;
};

const mockPush = vi.fn();
let mockPathname = "/projects/project-1";
let mockSearchParams = new URLSearchParams();
let mockDeals: MockDeal[] = [];

const sampleDeals: MockDeal[] = [
  {
    id: "deal-1",
    headline: "Alpha Manufacturing",
    description: "Precision manufacturing platform with recurring aerospace customers.",
    industry: "Industrial",
    state: "TX",
    region: null,
    geography_display: "state",
    status: "active",
    revenue_year_1: 800000,
    ebitda_year_1: 80000,
    revenue_year_2: 900000,
    ebitda_year_2: 90000,
    revenue_year_3: 1000000,
    ebitda_year_3: 100000,
    revenue_projection: 1200000,
    ebitda_projection: 125000,
    fiscal_year_labels: { year_1: "FY2022", year_2: "FY2023", year_3: "FY2024", projection: "FY2025E" },
    nda_type: "custom",
    cim_sharing_preference: "manual",
    nda_vetting_preference: "auto",
    has_teaser_document: true,
    has_cim_document: false,
    has_nda_document: false,
    ioi_due_date: null,
    loi_due_date: null,
    published_at: "2025-01-15",
    closed_at: null,
    engagement: null,
  },
];

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}));

vi.mock("@/components/ui/ProjectDealsTable", () => ({
  ProjectDealsTable: ({
    rows,
    headlineColumn,
    detailColumns,
    onSortModelChange,
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
    onSortModelChange?: (model: Array<{ field: string; sort: "asc" | "desc" }>) => void;
    onRowClick?: (row: MockDeal, trigger?: HTMLElement | null) => void;
  }) => {
    const actionsColumn = detailColumns?.find((column) => column.field === "actions");
    const dateReceivedColumn = detailColumns?.find((column) => column.field === "date_received");
    const firstRow = rows[0];

    return (
      <div>
        <button type="button" onClick={() => onSortModelChange?.([{ field: "date_received", sort: "asc" }])}>
          Sort by date received asc
        </button>
        <button type="button" onClick={() => onSortModelChange?.([{ field: "date_received", sort: "desc" }])}>
          Sort by date received desc
        </button>
        <ol data-testid="row-order">
          {rows.map((row) => (
            <li key={row.id}>{row.headline}</li>
          ))}
        </ol>
        <button type="button" onClick={(event) => firstRow && onRowClick?.(firstRow, event.currentTarget)}>
          Open first row
        </button>
        {firstRow && (
          <div role="button" tabIndex={0} onClick={(event) => onRowClick?.(firstRow, event.currentTarget)}>
            {headlineColumn.renderCell?.({
              row: firstRow,
              id: firstRow.id,
              field: "headline",
              hasFocus: true,
                value: firstRow.headline,
              })}
            <div data-testid="table-actions">{actionsColumn?.renderCell?.({ row: firstRow })}</div>
            <div data-testid="date-received-cell">{dateReceivedColumn?.renderCell?.({ row: firstRow })}</div>
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

      if (url === "/api/deals/deal-1/pursue") {
        return {
          ok: true,
          json: async () => ({
            engagement: {
              id: "engagement-deal-1",
              stage: "nda_pending",
              nda_status: "sent",
            },
          }),
        };
      }

      if (url === "/api/deals/deal-1/decline") {
        return {
          ok: true,
          json: async () => ({
            engagement: {
              id: "engagement-deal-1",
              stage: "declined",
              nda_status: "not_signed",
            },
          }),
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

  it("routes to active and archive tabs", async () => {
    render(<ProjectDealsView projectId="project-1" />);

    await screen.findByRole("button", { name: "Open first row" });

    fireEvent.click(screen.getByRole("tab", { name: "Active" }));
    expect(mockPush).toHaveBeenCalledWith("/projects/project-1/active");

    fireEvent.click(screen.getByRole("tab", { name: "Archived" }));
    expect(mockPush).toHaveBeenCalledWith("/projects/project-1/archive");
  });

  it("routes back to matches tab", async () => {
    mockPathname = "/projects/project-1/active";

    render(<ProjectDealsView projectId="project-1" />);

    await screen.findByRole("tab", { name: "Matches" });

    fireEvent.click(screen.getByRole("tab", { name: "Matches" }));
    expect(mockPush).toHaveBeenCalledWith("/projects/project-1");
  });

  it("applies negative bottom margin to primary tabs to align with header border", async () => {
    render(<ProjectDealsView projectId="project-1" />);

    await screen.findByRole("button", { name: "Open first row" });

    const tabsRoot = screen.getByTestId("project-deals-primary-tabs");

    expect(tabsRoot).toHaveClass("-mb-px");
  });

  it("returns null for invalid tab values in tab-change route guard", () => {
    expect(getProjectDealsRouteForTabChange("project-1", "unexpected")).toBeNull();
    expect(getProjectDealsRouteForTabChange("project-1", null)).toBeNull();
  });

  it("opens the deal drawer from the headline", async () => {
    render(<ProjectDealsView projectId="project-1" />);

    fireEvent.click(await screen.findByRole("button", { name: "Alpha Manufacturing" }));

    expect(screen.getByRole("dialog", { name: /Alpha Manufacturing/ })).toBeInTheDocument();
    expect(screen.getByText("Industrial")).toBeInTheDocument();
    expect(screen.getByText("TX")).toBeInTheDocument();
  });

  it("renders the drawer headline as a buyer workspace link", async () => {
    render(<ProjectDealsView projectId="project-1" />);

    fireEvent.click(await screen.findByRole("button", { name: "Alpha Manufacturing" }));

    const dialog = screen.getByRole("dialog", { name: /Alpha Manufacturing/ });
    const headline = within(dialog).getByRole("heading", { name: /Alpha Manufacturing/ });
    const headlineLink = within(dialog).getByRole("link", { name: "Alpha Manufacturing" });

    expect(headline).toContainElement(headlineLink);
    expect(headlineLink).toHaveAttribute("href", "/deals/deal-1");
    expect(within(dialog).queryByRole("link", { name: "Open buyer deal workspace" })).not.toBeInTheDocument();
  });

  it("renders expanded broker-provided deal information in the drawer", async () => {
    mockPathname = "/projects/project-1/active";
    mockDeals = [
      {
        ...sampleDeals[0],
        engagement: {
          id: "engagement-1",
          stage: "nda_signed",
          nda_status: "signed",
          nda_signed_at: "2025-02-01",
          cim_released: true,
          cim_released_at: "2025-02-02",
          cim_viewed_at: "2025-02-03",
          vetting_status: "approved",
        },
        has_cim_document: true,
        has_nda_document: true,
      },
    ];

    render(<ProjectDealsView projectId="project-1" />);

    fireEvent.click(await screen.findByRole("button", { name: "Open first row" }));

    expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByText("Precision manufacturing platform with recurring aerospace customers.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Financials" })).toBeInTheDocument();
    expect(screen.getByText("FY2024")).toBeInTheDocument();
    expect(screen.getByText("FY2025E")).toBeInTheDocument();
    expect(screen.getByText("$1,000,000")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "NDA and CIM Process" })).toBeInTheDocument();
    expect(screen.getByText("Custom NDA")).toBeInTheDocument();
    expect(screen.getByText("Auto-send NDA when buyer pursues")).toBeInTheDocument();
    expect(screen.getByText("Broker manually releases CIM")).toBeInTheDocument();
    expect(screen.getAllByText("Available").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Engagement" })).toBeInTheDocument();
    expect(screen.getByText("Viewed")).toBeInTheDocument();
    expect(within(screen.getByRole("tabpanel")).getByText("Feb 1, 2025")).toBeInTheDocument();
  });

  it("does not expose raw storage paths or show gated documents before buyer access", async () => {
    render(<ProjectDealsView projectId="project-1" />);

    fireEvent.click(await screen.findByRole("button", { name: "Open first row" }));

    const activePanel = screen.getByRole("tabpanel");

    expect(screen.queryByText("deal-1/teaser.pdf")).not.toBeInTheDocument();
    expect(screen.queryByText("deal-1/cim.pdf")).not.toBeInTheDocument();
    expect(screen.queryByText("deal-1/nda.pdf")).not.toBeInTheDocument();
    expect(within(activePanel).getByText("Available")).toBeInTheDocument();
    expect(within(activePanel).getAllByText("Not yet available")).toHaveLength(2);
  });

  it("renders safe fallback values for missing expanded drawer information", async () => {
    mockDeals = [
      {
        ...sampleDeals[0],
        headline: "Sparse Services",
        description: "   ",
        state: null,
        geography_display: "state",
        revenue_year_1: null,
        ebitda_year_1: null,
        revenue_year_2: null,
        ebitda_year_2: null,
        revenue_year_3: null,
        ebitda_year_3: null,
        revenue_projection: null,
        ebitda_projection: null,
        fiscal_year_labels: null,
        nda_type: null,
        cim_sharing_preference: null,
        nda_vetting_preference: null,
        has_teaser_document: false,
        has_cim_document: false,
        has_nda_document: false,
        ioi_due_date: null,
        loi_due_date: null,
        published_at: null,
        closed_at: null,
        engagement: null,
      },
    ];

    render(<ProjectDealsView projectId="project-1" />);

    fireEvent.click(await screen.findByRole("button", { name: "Open first row" }));

    const activePanel = screen.getByRole("tabpanel");

    expect(screen.getByRole("dialog", { name: /Sparse Services/ })).toBeInTheDocument();
    expect(screen.getByText("Not yet engaged")).toBeInTheDocument();
    expect(screen.getByText("No business description provided.")).toBeInTheDocument();
    expect(screen.getByText("Year 1")).toBeInTheDocument();
    expect(screen.getByText("Projection")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(8);
    expect(within(activePanel).getByText("Not available")).toBeInTheDocument();
    expect(within(activePanel).getByText("Not yet available")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Timeline" })).not.toBeInTheDocument();
  });

  it("opens the deal drawer instead of navigating on row click", async () => {
    render(<ProjectDealsView projectId="project-1" />);

    fireEvent.click(await screen.findByRole("button", { name: "Open first row" }));

    expect(screen.getByRole("dialog", { name: /Alpha Manufacturing/ })).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalledWith("/deals/deal-1");
  });

  it("dismisses the deal drawer from the close control", async () => {
    render(<ProjectDealsView projectId="project-1" />);

    fireEvent.click(await screen.findByRole("button", { name: "Open first row" }));
    expect(screen.getByRole("dialog", { name: /Alpha Manufacturing/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /Alpha Manufacturing/ })).not.toBeInTheDocument();
    });
  });

  it("dismisses the deal drawer with Escape", async () => {
    render(<ProjectDealsView projectId="project-1" />);

    fireEvent.click(await screen.findByRole("button", { name: "Open first row" }));
    expect(screen.getByRole("dialog", { name: /Alpha Manufacturing/ })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /Alpha Manufacturing/ })).not.toBeInTheDocument();
    });
  });

  it("dismisses the deal drawer from the backdrop", async () => {
    render(<ProjectDealsView projectId="project-1" />);

    fireEvent.click(await screen.findByRole("button", { name: "Open first row" }));
    expect(screen.getByRole("dialog", { name: /Alpha Manufacturing/ })).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("deal-drawer-backdrop"));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /Alpha Manufacturing/ })).not.toBeInTheDocument();
    });
  });

  it("moves focus into the deal drawer, traps tab focus, and restores focus on close", async () => {
    render(<ProjectDealsView projectId="project-1" />);

    const trigger = await screen.findByRole("button", { name: "Open first row" });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = await screen.findByRole("dialog", { name: /Alpha Manufacturing/ });
    const closeButton = await screen.findByRole("button", { name: "Close" });
    await waitFor(() => {
      expect(closeButton).toHaveFocus();
    });

    const focusableElements = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        [
          "a[href]",
          "button:not([disabled])",
          "textarea:not([disabled])",
          "input:not([disabled])",
          "select:not([disabled])",
          '[tabindex]:not([tabindex="-1"])',
        ].join(", ")
      )
    ).filter(
      (element) =>
        !element.hasAttribute("disabled") &&
        !element.closest("[hidden]") &&
        !element.closest('[aria-hidden="true"]')
    );

    expect(focusableElements.length).toBeGreaterThan(1);

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    fireEvent.focus(firstFocusable);
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(dialog).toContainElement(document.activeElement as HTMLElement);

    fireEvent.focus(lastFocusable);
    fireEvent.keyDown(window, { key: "Tab" });
    expect(dialog).toContainElement(document.activeElement as HTMLElement);

    expect(dialog).toContainElement(document.activeElement as HTMLElement);

    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /Alpha Manufacturing/ })).not.toBeInTheDocument();
    });
    expect(trigger).toHaveFocus();
  });

  it("renders and switches drawer Details/Events/Files tabs with partitioned panel content", async () => {
    render(<ProjectDealsView projectId="project-1" />);

    fireEvent.click(await screen.findByRole("button", { name: "Open first row" }));

    const detailsTab = screen.getByRole("tab", { name: "Details" });
    const eventsTab = screen.getByRole("tab", { name: "Events" });
    const filesTab = screen.getByRole("tab", { name: "Files" });

    expect(detailsTab).toBeInTheDocument();
    expect(eventsTab).toBeInTheDocument();
    expect(filesTab).toBeInTheDocument();

    const drawerTabsRoot = screen.getByTestId("deal-drawer-primary-tabs");
    expect(drawerTabsRoot).toHaveClass("deal-drawer-primary-tabs", "w-full");
    expect(drawerTabsRoot).toHaveAttribute("data-full-width-intent", "true");
    expect(drawerTabsRoot).toContainElement(detailsTab);
    expect(drawerTabsRoot).toContainElement(eventsTab);
    expect(drawerTabsRoot).toContainElement(filesTab);
    expect(detailsTab).toHaveAttribute("aria-selected", "true");

    const detailsPanelId = detailsTab.getAttribute("aria-controls");
    const eventsPanelId = eventsTab.getAttribute("aria-controls");
    const filesPanelId = filesTab.getAttribute("aria-controls");

    expect(detailsPanelId).toBeTruthy();
    expect(eventsPanelId).toBeTruthy();
    expect(filesPanelId).toBeTruthy();

    const detailsPanel = document.getElementById(detailsPanelId as string);
    const eventsPanel = document.getElementById(eventsPanelId as string);
    const filesPanel = document.getElementById(filesPanelId as string);

    expect(detailsPanel).toBeInTheDocument();
    expect(eventsPanel).toBeInTheDocument();
    expect(filesPanel).toBeInTheDocument();
    expect(detailsPanel).toHaveAttribute("role", "tabpanel");
    expect(eventsPanel).toHaveAttribute("role", "tabpanel");
    expect(filesPanel).toHaveAttribute("role", "tabpanel");
    expect(detailsPanel).toHaveAttribute("aria-labelledby", detailsTab.getAttribute("id"));
    expect(eventsPanel).toHaveAttribute("aria-labelledby", eventsTab.getAttribute("id"));
    expect(filesPanel).toHaveAttribute("aria-labelledby", filesTab.getAttribute("id"));
    expect(detailsPanel).not.toHaveAttribute("hidden");
    expect(eventsPanel).toHaveAttribute("hidden");
    expect(filesPanel).toHaveAttribute("hidden");
    expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument();
    expect(within(detailsPanel as HTMLElement).queryByText("Current deal status")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Files" })).not.toBeInTheDocument();

    fireEvent.click(eventsTab);

    await waitFor(() => {
      expect(eventsTab).toHaveAttribute("aria-selected", "true");
    });

    expect(detailsPanel).toHaveAttribute("hidden");
    expect(eventsPanel).not.toHaveAttribute("hidden");
    expect(filesPanel).toHaveAttribute("hidden");
    expect(within(eventsPanel as HTMLElement).getByRole("heading", { name: "Timeline" })).toBeInTheDocument();
    expect(screen.getByText("Current deal status")).toBeInTheDocument();
    expect(screen.getByText(/No active engagement/i)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Overview" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Files" })).not.toBeInTheDocument();

    fireEvent.click(filesTab);

    await waitFor(() => {
      expect(filesTab).toHaveAttribute("aria-selected", "true");
    });

    expect(detailsPanel).toHaveAttribute("hidden");
    expect(eventsPanel).toHaveAttribute("hidden");
    expect(filesPanel).not.toHaveAttribute("hidden");
    expect(screen.getByRole("heading", { name: "Files" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Overview" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Financials" })).not.toBeInTheDocument();
    expect(within(filesPanel as HTMLElement).queryByText("Current deal status")).not.toBeInTheDocument();
  });

  it("orders updates chronologically and omits placeholder timestamps", async () => {
    mockPathname = "/projects/project-1/active";
    mockDeals = [
      {
        ...sampleDeals[0],
        engagement: {
          id: "engagement-updates-order",
          stage: "nda_signed",
          nda_status: "signed",
          nda_signed_at: "2025-02-01",
          cim_released: true,
          cim_released_at: "2025-02-02",
          cim_viewed_at: "2025-02-04",
          cim_downloaded_at: "2025-02-03",
        },
      },
    ];

    render(<ProjectDealsView projectId="project-1" />);

    fireEvent.click(await screen.findByRole("button", { name: "Open first row" }));
    const eventsTab = screen.getByRole("tab", { name: "Events" });
    fireEvent.click(eventsTab);

    const eventsPanelId = eventsTab.getAttribute("aria-controls");
    expect(eventsPanelId).toBeTruthy();

    const eventsPanel = document.getElementById(eventsPanelId as string);
    expect(eventsPanel).toBeInTheDocument();

    const cimViewed = within(eventsPanel as HTMLElement).getByText("CIM viewed");
    const cimDownloaded = within(eventsPanel as HTMLElement).getByText("CIM downloaded");
    const cimReleased = within(eventsPanel as HTMLElement).getByText("CIM released");
    const ndaSigned = within(eventsPanel as HTMLElement).getByText("NDA signed");
    const dealPublished = within(eventsPanel as HTMLElement).getByText("Deal published");

    expect(cimViewed.compareDocumentPosition(cimDownloaded) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(cimDownloaded.compareDocumentPosition(cimReleased) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(cimReleased.compareDocumentPosition(ndaSigned) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(ndaSigned.compareDocumentPosition(dealPublished) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    expect(within(eventsPanel as HTMLElement).queryByText("—")).not.toBeInTheDocument();
  });

  it("does not duplicate closed status updates for closed deals", async () => {
    mockDeals = [
      {
        ...sampleDeals[0],
        status: "closed",
        closed_at: "2025-03-01",
      },
    ];

    render(<ProjectDealsView projectId="project-1" />);

    fireEvent.click(await screen.findByRole("button", { name: "Open first row" }));
    const eventsTab = screen.getByRole("tab", { name: "Events" });
    fireEvent.click(eventsTab);

    const eventsPanelId = eventsTab.getAttribute("aria-controls");
    expect(eventsPanelId).toBeTruthy();

    const eventsPanel = document.getElementById(eventsPanelId as string);
    expect(eventsPanel).toBeInTheDocument();

    expect(within(eventsPanel as HTMLElement).queryByText("Current deal status")).not.toBeInTheDocument();
    expect(within(eventsPanel as HTMLElement).getByText("Deal closed")).toBeInTheDocument();
  });

  it("keeps drawer tabs in the sticky header above tab panel content", async () => {
    render(<ProjectDealsView projectId="project-1" />);

    fireEvent.click(await screen.findByRole("button", { name: "Open first row" }));

    const tabList = screen.getByRole("tablist", { name: "Deal drawer sections" });
    const activePanel = screen.getByRole("tabpanel");
    const stickyHeader = tabList.closest("div.sticky");

    expect(stickyHeader).toBeInTheDocument();
    expect(stickyHeader).toHaveClass("border-b", "border-border-color");
    expect(stickyHeader).not.toContainElement(activePanel);
    expect(stickyHeader?.nextElementSibling).toContainElement(activePanel);
  });

  it("renders pinned drawer footer actions with unengaged parity", async () => {
    render(<ProjectDealsView projectId="project-1" />);

    fireEvent.click(await screen.findByRole("button", { name: "Open first row" }));

    const drawerFooter = screen.getByTestId("deal-drawer-footer");
    const pursueButton = within(drawerFooter).getByRole("button", { name: "Pursue" });
    const declineButton = within(drawerFooter).getByRole("button", { name: "Decline" });
    const actionRow = pursueButton.closest("div.flex");

    expect(drawerFooter).toBeInTheDocument();
    expect(drawerFooter).toHaveClass("sticky", "bottom-0", "border-t", "border-border-color");
    expect(pursueButton).toBeInTheDocument();
    expect(declineButton).toBeInTheDocument();
    expect(actionRow).toHaveClass("justify-center");
    expect(within(drawerFooter).queryByRole("button", { name: "Sign NDA" })).not.toBeInTheDocument();
  });

  it("runs drawer Decline action and transitions footer to single Pursue action", async () => {
    render(<ProjectDealsView projectId="project-1" />);

    fireEvent.click(await screen.findByRole("button", { name: "Open first row" }));

    const drawerFooter = screen.getByTestId("deal-drawer-footer");
    const declineButton = within(drawerFooter).getByRole("button", { name: "Decline" });
    const footerActions = within(drawerFooter).getAllByRole("button");

    expect(footerActions).toHaveLength(2);
    expect(footerActions[0]).toHaveAccessibleName("Pursue");
    expect(footerActions[1]).toHaveAccessibleName("Decline");

    fireEvent.click(declineButton);

    await waitFor(() => {
      expect(within(drawerFooter).getByRole("button", { name: "Pursue" })).toBeInTheDocument();
    });

    expect(within(drawerFooter).queryByRole("button", { name: "Decline" })).not.toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalledWith("/deals/deal-1");
  });

  it("disables drawer footer actions while action request is loading", async () => {
    let pursueRequestResolve!: () => void;
    const pursueRequest = new Promise<void>((resolve) => {
      pursueRequestResolve = resolve;
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
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
            json: async () => ({ deals: sampleDeals, nextCursor: null }),
          };
        }

        if (url === "/api/deals/deal-1/pursue") {
          await pursueRequest;
          return {
            ok: true,
            json: async () => ({
              engagement: {
                id: "engagement-deal-1",
                stage: "nda_pending",
                nda_status: "sent",
              },
            }),
          };
        }

        return {
          ok: false,
          json: async () => ({}),
        };
      })
    );

    render(<ProjectDealsView projectId="project-1" />);

    fireEvent.click(await screen.findByRole("button", { name: "Open first row" }));

    const drawerFooter = screen.getByTestId("deal-drawer-footer");
    const pursueButton = within(drawerFooter).getByRole("button", { name: "Pursue" });
    const declineButton = within(drawerFooter).getByRole("button", { name: "Decline" });

    fireEvent.click(pursueButton);

    await waitFor(() => {
      expect(pursueButton).toBeDisabled();
      expect(declineButton).toBeDisabled();
    });

    pursueRequestResolve();

    await waitFor(() => {
      expect(within(drawerFooter).getByRole("button", { name: "Sign NDA" })).toBeInTheDocument();
    });
  });

  it("shows no-action drawer footer state when no table actions are available", async () => {
    mockPathname = "/projects/project-1/archive";
    mockDeals = [
      {
        ...sampleDeals[0],
        id: "deal-passed",
        headline: "Passed Target",
        engagement: {
          id: "engagement-passed",
          stage: "passed",
          nda_status: "not_signed",
        },
      },
    ];

    render(<ProjectDealsView projectId="project-1" />);

    fireEvent.click(await screen.findByRole("button", { name: "Open first row" }));

    const drawerFooter = screen.getByTestId("deal-drawer-footer");
    expect(within(drawerFooter).getByText("No actions available.")).toBeInTheDocument();
    expect(within(drawerFooter).queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows status-driven action labels in the drawer footer", async () => {
    mockPathname = "/projects/project-1/active";
    mockDeals = [
      {
        ...sampleDeals[0],
        id: "deal-nda",
        headline: "NDA Target",
        engagement: {
          id: "engagement-nda",
          stage: "nda_pending",
          nda_status: "pending",
        },
      },
    ];

    const { unmount } = render(<ProjectDealsView projectId="project-1" />);

    fireEvent.click(await screen.findByRole("button", { name: "Open first row" }));
    expect(within(screen.getByTestId("deal-drawer-footer")).getByRole("button", { name: "Sign NDA" })).toBeInTheDocument();

    unmount();

    mockDeals = [
      {
        ...sampleDeals[0],
        id: "deal-ioi-ready",
        headline: "IOI Ready Target",
        status: "accepting_iois",
        engagement: {
          id: "engagement-ioi-ready",
          stage: "nda_signed",
          nda_status: "signed",
          cim_released: true,
        },
      },
    ];

    render(<ProjectDealsView projectId="project-1" />);

    fireEvent.click(await screen.findByRole("button", { name: "Open first row" }));
    expect(within(screen.getByTestId("deal-drawer-footer")).getByRole("button", { name: "Submit IOI" })).toBeInTheDocument();
  });

  it("executes footer primary action behavior from engagement status", async () => {
    mockPathname = "/projects/project-1/active";
    mockDeals = [
      {
        ...sampleDeals[0],
        id: "deal-nda",
        headline: "NDA Target",
        engagement: {
          id: "engagement-nda",
          stage: "nda_pending",
          nda_status: "pending",
        },
      },
    ];

    render(<ProjectDealsView projectId="project-1" />);

    fireEvent.click(await screen.findByRole("button", { name: "Open first row" }));
    fireEvent.click(within(screen.getByTestId("deal-drawer-footer")).getByRole("button", { name: "Sign NDA" }));

    expect(mockPush).toHaveBeenCalledWith("/deals/deal-nda/nda");
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
        status: "accepting_iois",
        engagement: {
          id: "engagement-ioi-ready",
          stage: "nda_signed",
          nda_status: "signed",
          cim_released: true,
        },
      },
    ];

    render(<ProjectDealsView projectId="project-1" />);

    const submitIoiButton = await screen.findByRole("button", { name: "Submit IOI" });

    expect(submitIoiButton).toBeInTheDocument();
    expect(submitIoiButton).toBeEnabled();
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
        status: "accepting_iois",
        engagement: {
          id: "engagement-ioi-ready",
          stage: "nda_signed",
          nda_status: "signed",
          cim_released: true,
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

  it("renders View IOI action in both table and drawer only when status is accepting_iois", async () => {
    mockPathname = "/projects/project-1/active";
    mockDeals = [
      {
        ...sampleDeals[0],
        id: "deal-ioi-submitted",
        headline: "IOI Submitted Target",
        status: "accepting_iois",
        engagement: {
          id: "engagement-ioi-submitted",
          stage: "ioi_submitted",
          nda_status: "signed",
          cim_released: true,
        },
      },
    ];

    render(<ProjectDealsView projectId="project-1" />);

    const tableActions = await screen.findByTestId("table-actions");
    const tableViewIoiButton = within(tableActions).getByRole("button", { name: "View IOI" });

    expect(tableViewIoiButton).toBeInTheDocument();
    expect(tableViewIoiButton).toBeEnabled();

    fireEvent.click(await screen.findByRole("button", { name: "Open first row" }));

    const drawerFooter = screen.getByTestId("deal-drawer-footer");
    const drawerViewIoiButton = within(drawerFooter).getByRole("button", { name: "View IOI" });

    expect(drawerViewIoiButton).toBeInTheDocument();
    expect(drawerViewIoiButton).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Submit IOI" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign NDA" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pursue" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Decline" })).not.toBeInTheDocument();
  });

  it("does not render View IOI when status is not accepting_iois in table or drawer", async () => {
    mockPathname = "/projects/project-1/active";
    mockDeals = [
      {
        ...sampleDeals[0],
        id: "deal-ioi-submitted-active",
        headline: "IOI Submitted Active Target",
        status: "active",
        engagement: {
          id: "engagement-ioi-submitted-active",
          stage: "ioi_submitted",
          nda_status: "signed",
          cim_released: true,
        },
      },
    ];

    render(<ProjectDealsView projectId="project-1" />);

    const tableActions = await screen.findByTestId("table-actions");
    expect(within(tableActions).queryByRole("button", { name: "View IOI" })).not.toBeInTheDocument();

    fireEvent.click(await screen.findByRole("button", { name: "Open first row" }));

    const drawerFooter = screen.getByTestId("deal-drawer-footer");
    expect(within(drawerFooter).queryByRole("button", { name: "View IOI" })).not.toBeInTheDocument();
  });

  it("navigates to deal IOI page when View IOI is clicked", async () => {
    mockPathname = "/projects/project-1/active";
    mockDeals = [
      {
        ...sampleDeals[0],
        id: "deal-ioi-submitted",
        headline: "IOI Submitted Target",
        status: "accepting_iois",
        engagement: {
          id: "engagement-ioi-submitted",
          stage: "ioi_submitted",
          nda_status: "signed",
          cim_released: true,
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
        status: "accepting_lois",
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
    expect(viewLoiButton).toBeEnabled();
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
        status: "accepting_lois",
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

  it("renders Submit LOI action for ioi_submitted deals when status is accepting_lois in table and drawer", async () => {
    mockPathname = "/projects/project-1/active";
    mockDeals = [
      {
        ...sampleDeals[0],
        id: "deal-ioi-ready-for-loi",
        headline: "IOI Ready For LOI Target",
        status: "accepting_lois",
        engagement: {
          id: "engagement-ioi-ready-for-loi",
          stage: "ioi_submitted",
          nda_status: "signed",
          cim_released: true,
        },
      },
    ];

    render(<ProjectDealsView projectId="project-1" />);

    const tableActions = await screen.findByTestId("table-actions");
    const tableSubmitLoiButton = within(tableActions).getByRole("button", { name: "Submit LOI" });

    expect(tableSubmitLoiButton).toBeInTheDocument();
    expect(tableSubmitLoiButton).toBeEnabled();
    expect(within(tableActions).queryByRole("button", { name: "View IOI" })).not.toBeInTheDocument();

    fireEvent.click(await screen.findByRole("button", { name: "Open first row" }));

    const drawerFooter = screen.getByTestId("deal-drawer-footer");
    const drawerSubmitLoiButton = within(drawerFooter).getByRole("button", { name: "Submit LOI" });

    expect(drawerSubmitLoiButton).toBeInTheDocument();
    expect(drawerSubmitLoiButton).toBeEnabled();
    expect(within(drawerFooter).queryByRole("button", { name: "View IOI" })).not.toBeInTheDocument();
    expect(within(drawerFooter).queryByRole("button", { name: "Sign NDA" })).not.toBeInTheDocument();
    expect(within(drawerFooter).queryByRole("button", { name: "Pursue" })).not.toBeInTheDocument();
    expect(within(drawerFooter).queryByRole("button", { name: "Decline" })).not.toBeInTheDocument();
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

  it("renders date received in mm/dd/yyyy format when provided", async () => {
    mockDeals = [
      {
        ...sampleDeals[0],
        date_received: "2025-03-15T00:00:00.000Z",
      },
    ];

    render(<ProjectDealsView projectId="project-1" />);

    expect(await screen.findByTestId("date-received-cell")).toHaveTextContent("03/15/2025");
  });

  it("renders an em dash when date received is missing or invalid", async () => {
    mockDeals = [
      {
        ...sampleDeals[0],
        date_received: null,
      },
    ];

    const { unmount } = render(<ProjectDealsView projectId="project-1" />);

    expect(await screen.findByTestId("date-received-cell")).toHaveTextContent("—");

    unmount();

    mockDeals = [
      {
        ...sampleDeals[0],
        date_received: "not-a-real-date",
      },
    ];

    render(<ProjectDealsView projectId="project-1" />);

    expect(await screen.findByTestId("date-received-cell")).toHaveTextContent("—");
  });

  it("sorts rows by date received in chronological order", async () => {
    mockDeals = [
      {
        ...sampleDeals[0],
        id: "deal-new",
        headline: "Newest Deal",
        date_received: "2025-03-20",
      },
      {
        ...sampleDeals[0],
        id: "deal-old",
        headline: "Oldest Deal",
        date_received: "2025-01-05",
      },
      {
        ...sampleDeals[0],
        id: "deal-mid",
        headline: "Middle Deal",
        date_received: "2025-02-10",
      },
    ];

    render(<ProjectDealsView projectId="project-1" />);

    await screen.findByRole("button", { name: "Open first row" });

    fireEvent.click(screen.getByRole("button", { name: "Sort by date received asc" }));

    await waitFor(() => {
      expect(within(screen.getByTestId("row-order")).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
        "Oldest Deal",
        "Middle Deal",
        "Newest Deal",
      ]);
    });
  });

  it("sorts rows by date received in reverse chronological order", async () => {
    mockDeals = [
      {
        ...sampleDeals[0],
        id: "deal-new",
        headline: "Newest Deal",
        date_received: "2025-03-20",
      },
      {
        ...sampleDeals[0],
        id: "deal-old",
        headline: "Oldest Deal",
        date_received: "2025-01-05",
      },
      {
        ...sampleDeals[0],
        id: "deal-mid",
        headline: "Middle Deal",
        date_received: "2025-02-10",
      },
    ];

    render(<ProjectDealsView projectId="project-1" />);

    await screen.findByRole("button", { name: "Open first row" });

    fireEvent.click(screen.getByRole("button", { name: "Sort by date received desc" }));

    await waitFor(() => {
      expect(within(screen.getByTestId("row-order")).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
        "Newest Deal",
        "Middle Deal",
        "Oldest Deal",
      ]);
    });
  });

  it("places null or invalid date received values after valid dates for both sort directions", async () => {
    mockDeals = [
      {
        ...sampleDeals[0],
        id: "deal-valid-early",
        headline: "Valid Early Deal",
        date_received: "2025-01-05",
      },
      {
        ...sampleDeals[0],
        id: "deal-null",
        headline: "Null Date Deal",
        date_received: null,
      },
      {
        ...sampleDeals[0],
        id: "deal-invalid",
        headline: "Invalid Date Deal",
        date_received: "not-a-real-date",
      },
      {
        ...sampleDeals[0],
        id: "deal-valid-late",
        headline: "Valid Late Deal",
        date_received: "2025-03-20",
      },
    ];

    render(<ProjectDealsView projectId="project-1" />);

    await screen.findByRole("button", { name: "Open first row" });

    fireEvent.click(screen.getByRole("button", { name: "Sort by date received asc" }));

    await waitFor(() => {
      expect(within(screen.getByTestId("row-order")).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
        "Valid Early Deal",
        "Valid Late Deal",
        "Null Date Deal",
        "Invalid Date Deal",
      ]);
    });

    fireEvent.click(screen.getByRole("button", { name: "Sort by date received desc" }));

    await waitFor(() => {
      expect(within(screen.getByTestId("row-order")).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
        "Valid Late Deal",
        "Valid Early Deal",
        "Null Date Deal",
        "Invalid Date Deal",
      ]);
    });
  });
});
