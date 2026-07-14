import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEAL_STATUS_LABELS } from "@/lib/constants";
import { formatEngagementStageLabel } from "@/lib/engagement-stage-labels";

type RenderedChipElement = ReactElement<{
  label: string;
  sx: Record<string, unknown>;
}>;

type EngagementTableRow = {
  id: string;
  deal_id: string;
  deal_headline?: string;
  stage: string;
  industry?: string;
  last_updated: string;
};

type TestSortModel = Array<{ field: string; sort?: "asc" | "desc" | null }>;

type MockDataGridProps = {
  rows: EngagementTableRow[];
  detailColumns: Array<{ field?: string; renderCell?: (params: { row: EngagementTableRow }) => unknown }>;
  onRowClick: (row: EngagementTableRow) => void;
  sortedCount: number;
  sortModel: TestSortModel;
  onSortModelChange: (sortModel: TestSortModel) => void;
  paginationModel: { page: number; pageSize: number };
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (pageSize: number) => void;
  rowSelectionModel: unknown;
  onRowSelectionModelChange: (model: unknown) => void;
};

type MockProjectDealDrawerProps = {
  deal: {
    id: string;
    headline: string;
    geography_display?: string | null;
    description?: string | null;
    revenue_year_1?: number | null;
    revenue_year_2?: number | null;
    revenue_projection?: number | null;
    nda_type?: string | null;
    cim_sharing_preference?: string | null;
    nda_vetting_preference?: string | null;
    ioi_due_date?: string | null;
    loi_due_date?: string | null;
    has_teaser_document?: boolean;
    has_cim_document?: boolean;
    has_nda_document?: boolean;
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
      date_received?: string | null;
    } | null;
  };
  workspaceHref: string;
  onClose: () => void;
  actionButtons?: Array<{
    label: string;
    onClick: () => void;
    disabled?: boolean;
    variant?: "contained" | "outlined";
  }>;
};

const mockState = vi.hoisted(() => ({
  push: vi.fn(),
  capturedDataGridProps: [] as MockDataGridProps[],
  capturedDrawerProps: [] as MockProjectDealDrawerProps[],
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockState.push }),
}));

vi.mock("@/components/ui/DataGridTable", () => ({
  DataGridTable: (props: MockDataGridProps) => {
    mockState.capturedDataGridProps.push(props);
    return (
      <div data-testid="engagements-data-grid">
        {props.rows.map((row) => (
          <button
            key={row.id}
            type="button"
            data-testid={`engagement-row-${row.id}`}
            onClick={() => props.onRowClick(row)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                props.onRowClick(row);
              }
            }}
          >
            {row.deal_headline ?? row.id}
          </button>
        ))}
      </div>
    );
  },
}));

vi.mock("@/components/buyer/ProjectDealDrawer", () => ({
  ProjectDealDrawer: (props: MockProjectDealDrawerProps) => {
    mockState.capturedDrawerProps.push(props);
    return (
      <div data-testid="project-deal-drawer">
        <div data-testid="project-deal-drawer-actions">
          {(props.actionButtons ?? []).map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              disabled={action.disabled}
            >
              {action.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={props.onClose}>
          Close Drawer
        </button>
      </div>
    );
  },
}));

import BuyerEngagementsPage from "./page";

function mockEngagementsResponse(
  engagements: Array<Record<string, unknown>>,
  viewer: { isApprovedBuyer: boolean } = { isApprovedBuyer: true }
) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ engagements, viewer }),
    }))
  );
}

function createEngagement(
  index: number,
  stage: "nda_pending" | "pursued" | "declined" | "ioi_submitted" | "loi_submitted" | "nda_signed",
  industry: string = "Tech"
) {
  const createdAt = `2026-01-${String(index).padStart(2, "0")}T00:00:00.000Z`;
  const ndaStatusByStage: Record<string, string> = {
    nda_pending: "pending",
    pursued: "signed",
    declined: "not_signed",
    ioi_submitted: "signed",
    loi_submitted: "signed",
    nda_signed: "signed",
  };

  return {
    id: `eng-${index}`,
    stage,
    nda_status: ndaStatusByStage[stage],
    created_at: createdAt,
    updated_at: `2026-02-${String(index).padStart(2, "0")}T00:00:00.000Z`,
    project_id: `project-${index}`,
    project_name: `Project ${index}`,
    deal: {
      id: `deal-${index}`,
      headline: `Deal ${index}`,
      description: `Description ${index}`,
      industry,
      status: "accepting_iois",
      state: null,
      region: null,
      geography: null,
      geography_display: null,
      revenue_year_1: 10,
      ebitda_year_1: 2,
      revenue_year_2: 11,
      ebitda_year_2: 3,
      revenue_year_3: null,
      ebitda_year_3: null,
      revenue_projection: 12,
      ebitda_projection: 4,
      fiscal_year_labels: null,
      nda_type: "platform",
      cim_sharing_preference: "auto",
      nda_vetting_preference: "manual",
      has_teaser_document: false,
      has_cim_document: false,
      has_nda_document: false,
      ioi_due_date: null,
      loi_due_date: null,
      published_at: null,
      closed_at: null,
      created_at: createdAt,
      date_received: createdAt,
    },
      engagement: {
        id: `eng-${index}`,
        stage,
      nda_status: ndaStatusByStage[stage],
        nda_signed_at: null,
      cim_released: stage === "nda_signed" || stage === "ioi_submitted",
      cim_released_at: null,
      cim_viewed_at: null,
      cim_downloaded_at: null,
      pass_reason: null,
      pass_reason_detail: null,
      declined_at: null,
      vetting_status: null,
      vetting_rejection_reason: null,
      date_received: createdAt,
    },
  };
}

function getLatestGridProps() {
  return mockState.capturedDataGridProps.at(-1);
}

function getDrawerActionButton(label: string) {
  return within(screen.getByTestId("project-deal-drawer-actions")).getByRole("button", { name: label });
}

describe("BuyerEngagementsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.capturedDataGridProps = [];
    mockState.capturedDrawerProps = [];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders em dash for invalid last_updated and opens deal drawer on row click", async () => {
    mockEngagementsResponse([
      {
        id: "eng-1",
        stage: "pursued",
        nda_status: "signed",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "not-a-date",
        project_id: "project-1",
        project_name: "Platform Build",
        deal: {
          id: "deal/abc?x=1",
          headline: "Alpha",
          description: "Alpha description",
          industry: "Tech",
          status: "accepting_iois",
          state: "CA",
          region: null,
          geography: null,
          geography_display: "state",
          revenue_year_1: 101,
          ebitda_year_1: 11,
          revenue_year_2: 102,
          ebitda_year_2: 12,
          revenue_year_3: 103,
          ebitda_year_3: 13,
          revenue_projection: 125,
          ebitda_projection: 20,
          fiscal_year_labels: {
            year_1: "2023A",
            year_2: "2024A",
            year_3: "2025A",
            projection: "2026E",
          },
          nda_type: "custom",
          cim_sharing_preference: "manual",
          nda_vetting_preference: "auto",
          has_teaser_document: true,
          has_cim_document: true,
          has_nda_document: true,
          ioi_due_date: "2026-04-01",
          loi_due_date: "2026-05-01",
          published_at: "2026-01-15T00:00:00.000Z",
          closed_at: null,
          created_at: "2026-01-01T00:00:00.000Z",
          date_received: "2026-01-01T00:00:00.000Z",
        },
        engagement: {
          id: "eng-1",
          stage: "pursued",
          nda_status: "signed",
          nda_signed_at: "2026-01-03T10:00:00.000Z",
          cim_released: true,
          cim_released_at: "2026-01-04T10:00:00.000Z",
          cim_viewed_at: "2026-01-05T10:00:00.000Z",
          cim_downloaded_at: "2026-01-06T10:00:00.000Z",
          pass_reason: "valuation",
          pass_reason_detail: "Too expensive",
          declined_at: null,
          vetting_status: "approved",
          vetting_rejection_reason: null,
          date_received: "2026-01-01T00:00:00.000Z",
        },
      },
    ]);

    render(<BuyerEngagementsPage />);

    await screen.findByTestId("engagements-data-grid");

    const latestGridProps = getLatestGridProps();
    const lastUpdatedColumn = latestGridProps?.detailColumns.find((column) => column.field === "last_updated");
    expect(lastUpdatedColumn?.renderCell).toBeTypeOf("function");

    const renderedLastUpdated = String(
      lastUpdatedColumn?.renderCell?.({
        row: {
          id: "eng-1",
          deal_id: "deal/abc?x=1",
          stage: "pursued",
          last_updated: "not-a-date",
        },
      })
    );
    expect(renderedLastUpdated).toBe("—");

    await userEvent.click(screen.getByTestId("engagement-row-eng-1"));

    await waitFor(() => {
      expect(screen.getByTestId("project-deal-drawer")).toBeInTheDocument();
    });

    expect(mockState.push).not.toHaveBeenCalled();

    const latestDrawerProps = mockState.capturedDrawerProps.at(-1);
    expect(latestDrawerProps?.workspaceHref).toBe("/deals/deal%2Fabc%3Fx%3D1");
    expect(latestDrawerProps?.deal.id).toBe("deal/abc?x=1");
    expect(latestDrawerProps?.deal.headline).toBe("Alpha");
    expect(latestDrawerProps?.deal.engagement).toMatchObject({
      id: "eng-1",
      stage: "pursued",
      nda_status: "signed",
    });
    expect(latestDrawerProps?.deal).toMatchObject({
      description: "Alpha description",
      revenue_year_1: 101,
      revenue_year_2: 102,
      revenue_projection: 125,
      nda_type: "custom",
      cim_sharing_preference: "manual",
      nda_vetting_preference: "auto",
      ioi_due_date: "2026-04-01",
      loi_due_date: "2026-05-01",
      has_teaser_document: true,
      has_cim_document: true,
      has_nda_document: true,
    });
    expect(latestDrawerProps?.deal.engagement).toMatchObject({
      nda_signed_at: "2026-01-03T10:00:00.000Z",
      cim_released: true,
      cim_released_at: "2026-01-04T10:00:00.000Z",
      cim_viewed_at: "2026-01-05T10:00:00.000Z",
      cim_downloaded_at: "2026-01-06T10:00:00.000Z",
      pass_reason: "valuation",
      pass_reason_detail: "Too expensive",
      vetting_status: "approved",
      date_received: "2026-01-01T00:00:00.000Z",
    });
  });

  it("opens deal drawer through keyboard activation on a row", async () => {
    mockEngagementsResponse([createEngagement(1, "pursued")]);

    render(<BuyerEngagementsPage />);

    await screen.findByTestId("engagements-data-grid");

    const rowButton = screen.getByTestId("engagement-row-eng-1");
    rowButton.focus();
    expect(rowButton).toHaveFocus();

    await userEvent.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.getByTestId("project-deal-drawer")).toBeInTheDocument();
    });
  });

  it("preserves null geography_display when mapping selected deal to drawer", async () => {
    mockEngagementsResponse([createEngagement(1, "pursued")]);

    render(<BuyerEngagementsPage />);

    await screen.findByTestId("engagements-data-grid");
    await userEvent.click(screen.getByTestId("engagement-row-eng-1"));

    await waitFor(() => {
      expect(screen.getByTestId("project-deal-drawer")).toBeInTheDocument();
    });

    const latestDrawerProps = mockState.capturedDrawerProps.at(-1);
    expect(latestDrawerProps?.deal.geography_display).toBeNull();
    expect(latestDrawerProps?.deal.geography_display).not.toBe("region");
  });

  it("closes the deal drawer when close button is clicked", async () => {
    mockEngagementsResponse([createEngagement(1, "pursued")]);

    render(<BuyerEngagementsPage />);

    await screen.findByTestId("engagements-data-grid");
    await userEvent.click(screen.getByTestId("engagement-row-eng-1"));

    await waitFor(() => {
      expect(screen.getByTestId("project-deal-drawer")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Close Drawer" }));

    await waitFor(() => {
      expect(screen.queryByTestId("project-deal-drawer")).not.toBeInTheDocument();
    });
  });

  it("filters out malformed engagement records from API payload", async () => {
    mockEngagementsResponse([
      createEngagement(1, "pursued"),
      {
        id: "eng-malformed",
        stage: "pursued",
        nda_status: "signed",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-02T00:00:00.000Z",
        project_id: "project-malformed",
        project_name: "Malformed",
        deal: null,
      },
    ]);

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    render(<BuyerEngagementsPage />);

    await screen.findByTestId("engagements-data-grid");

    await waitFor(() => {
      const latestGridProps = getLatestGridProps();
      expect(latestGridProps?.sortedCount).toBe(1);
      expect(latestGridProps?.rows).toHaveLength(1);
      expect(latestGridProps?.rows[0]?.id).toBe("eng-1");
    });

    expect(warnSpy).toHaveBeenCalledWith(
      "[BuyerEngagementsPage] Ignored 1 malformed engagement record(s)."
    );
    expect(screen.queryByTestId("engagement-row-eng-malformed")).not.toBeInTheDocument();

    warnSpy.mockRestore();
  });

  it("shows stage filter buttons for present stages with formatted labels and correct counts", async () => {
    mockEngagementsResponse([
      {
        id: "eng-1",
        stage: "nda_pending",
        nda_status: "pending",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-05T00:00:00.000Z",
        project_id: "project-1",
        project_name: "Platform Build",
        deal: {
          id: "deal-1",
          headline: "Alpha",
          description: "Alpha",
          industry: "Tech",
          status: "accepting_iois",
          state: null,
          region: null,
          geography: null,
          geography_display: null,
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
          created_at: "2026-01-01T00:00:00.000Z",
          date_received: "2026-01-01T00:00:00.000Z",
        },
        engagement: {
          id: "eng-1",
          stage: "nda_pending",
          nda_status: "pending",
          nda_signed_at: null,
          cim_released: false,
          cim_released_at: null,
          cim_viewed_at: null,
          cim_downloaded_at: null,
          pass_reason: null,
          pass_reason_detail: null,
          declined_at: null,
          vetting_status: null,
          vetting_rejection_reason: null,
          date_received: "2026-01-01T00:00:00.000Z",
        },
      },
      {
        id: "eng-2",
        stage: "pursued",
        nda_status: "signed",
        created_at: "2026-01-02T00:00:00.000Z",
        updated_at: "2026-01-06T00:00:00.000Z",
        project_id: "project-2",
        project_name: "Growth",
        deal: {
          id: "deal-2",
          headline: "Beta",
          description: "Beta",
          industry: "Healthcare",
          status: "accepting_iois",
          state: null,
          region: null,
          geography: null,
          geography_display: null,
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
          created_at: "2026-01-02T00:00:00.000Z",
          date_received: "2026-01-02T00:00:00.000Z",
        },
        engagement: {
          id: "eng-2",
          stage: "pursued",
          nda_status: "signed",
          nda_signed_at: null,
          cim_released: false,
          cim_released_at: null,
          cim_viewed_at: null,
          cim_downloaded_at: null,
          pass_reason: null,
          pass_reason_detail: null,
          declined_at: null,
          vetting_status: null,
          vetting_rejection_reason: null,
          date_received: "2026-01-02T00:00:00.000Z",
        },
      },
      {
        id: "eng-3",
        stage: "nda_pending",
        nda_status: "pending",
        created_at: "2026-01-03T00:00:00.000Z",
        updated_at: "2026-01-07T00:00:00.000Z",
        project_id: "project-3",
        project_name: "Scale",
        deal: {
          id: "deal-3",
          headline: "Gamma",
          description: "Gamma",
          industry: "Industrial",
          status: "accepting_iois",
          state: null,
          region: null,
          geography: null,
          geography_display: null,
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
          created_at: "2026-01-03T00:00:00.000Z",
          date_received: "2026-01-03T00:00:00.000Z",
        },
        engagement: {
          id: "eng-3",
          stage: "nda_pending",
          nda_status: "pending",
          nda_signed_at: null,
          cim_released: false,
          cim_released_at: null,
          cim_viewed_at: null,
          cim_downloaded_at: null,
          pass_reason: null,
          pass_reason_detail: null,
          declined_at: null,
          vetting_status: null,
          vetting_rejection_reason: null,
          date_received: "2026-01-03T00:00:00.000Z",
        },
      },
    ]);

    render(<BuyerEngagementsPage />);

    await screen.findByTestId("engagements-data-grid");

    expect(screen.getByRole("button", { name: "All (3)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "NDA pending (2)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pursued (1)" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Declined/i })).not.toBeInTheDocument();
  });

  it("renders Engagement Stage and Deal Status chips with ProjectDealsView-matching label styles", async () => {
    mockEngagementsResponse([createEngagement(1, "nda_pending")]);

    render(<BuyerEngagementsPage />);

    await screen.findByTestId("engagements-data-grid");

    const latestGridProps = getLatestGridProps();
    const stageColumn = latestGridProps?.detailColumns.find((column) => column.field === "stage");
    const dealStatusColumn = latestGridProps?.detailColumns.find((column) => column.field === "deal_status");

    expect(stageColumn?.renderCell).toBeTypeOf("function");
    expect(dealStatusColumn?.renderCell).toBeTypeOf("function");

    const stageChip = stageColumn?.renderCell?.({
      row: {
        id: "eng-1",
        deal_id: "deal-1",
        stage: "nda_pending",
        last_updated: "2026-02-01T00:00:00.000Z",
      },
    }) as RenderedChipElement;

    const dealStatusChip = dealStatusColumn?.renderCell?.({
      row: {
        id: "eng-1",
        deal_id: "deal-1",
        stage: "nda_pending",
        deal_status: "accepting_iois",
        last_updated: "2026-02-01T00:00:00.000Z",
      },
    }) as RenderedChipElement;

    expect(stageChip.props.label).toBe(formatEngagementStageLabel("nda_pending"));
    expect(stageChip.props.sx).toMatchObject({
      backgroundColor: "var(--color-subtle)",
      color: "var(--color-primary)",
      fontWeight: 600,
    });

    expect(dealStatusChip.props.label).toBe(DEAL_STATUS_LABELS.accepting_iois);
    expect(dealStatusChip.props.sx).toMatchObject({
      backgroundColor: "#10B9811A",
      color: "#10B981",
      fontWeight: 600,
    });
  });

  it("filters DataGrid rows by stage, updates sortedCount, restores all rows, and resets pagination page", async () => {
    const engagements = Array.from({ length: 12 }, (_, i) =>
      createEngagement(i + 1, i % 2 === 0 ? "nda_pending" : "pursued")
    );

    mockEngagementsResponse(engagements);

    render(<BuyerEngagementsPage />);

    await screen.findByTestId("engagements-data-grid");

    await waitFor(() => {
      const latestGridProps = getLatestGridProps();
      expect(latestGridProps?.rows).toHaveLength(10);
      expect(latestGridProps?.sortedCount).toBe(12);
      expect(latestGridProps?.paginationModel.page).toBe(0);
    });

    act(() => {
      getLatestGridProps()?.onPageChange(1);
    });

    await waitFor(() => {
      expect(getLatestGridProps()?.paginationModel.page).toBe(1);
    });

    fireEvent.click(screen.getByRole("button", { name: "NDA pending (6)" }));

    await waitFor(() => {
      const latestGridProps = getLatestGridProps();
      expect(latestGridProps?.rows).toHaveLength(6);
      expect(latestGridProps?.rows.every((row) => row.stage === "nda_pending")).toBe(true);
      expect(latestGridProps?.sortedCount).toBe(6);
      expect(latestGridProps?.paginationModel.page).toBe(0);
    });

    fireEvent.click(screen.getByRole("button", { name: "All (12)" }));

    await waitFor(() => {
      const latestGridProps = getLatestGridProps();
      expect(latestGridProps?.rows).toHaveLength(10);
      expect(latestGridProps?.rows.some((row) => row.stage === "nda_pending")).toBe(true);
      expect(latestGridProps?.rows.some((row) => row.stage === "pursued")).toBe(true);
      expect(latestGridProps?.sortedCount).toBe(12);
      expect(latestGridProps?.paginationModel.page).toBe(0);
    });
  });

  it("shows an Industry button and filters DataGrid rows by selected industry", async () => {
    const engagements = Array.from({ length: 12 }, (_, i) =>
      createEngagement(i + 1, i % 2 === 0 ? "nda_pending" : "pursued", i % 2 === 0 ? "Tech" : "Healthcare")
    );

    mockEngagementsResponse(engagements);

    render(<BuyerEngagementsPage />);

    await screen.findByTestId("engagements-data-grid");

    expect(screen.getByRole("button", { name: "Industry" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Industry" }));

    expect(screen.getByRole("button", { name: "All Industries (12)" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Healthcare (6)" }));

    await waitFor(() => {
      const latestGridProps = getLatestGridProps();
      expect(latestGridProps?.rows).toHaveLength(6);
      expect(latestGridProps?.sortedCount).toBe(6);
      expect(latestGridProps?.rows.every((row) => row.industry === "Healthcare")).toBe(true);
    });
  });

  it("updates industry options from the stage-filtered set, resets stale industry filter, and resets pagination", async () => {
    const engagements = Array.from({ length: 12 }, (_, i) =>
      createEngagement(i + 1, i % 2 === 0 ? "nda_pending" : "pursued", i % 2 === 0 ? "Tech" : "Healthcare")
    );

    mockEngagementsResponse(engagements);

    render(<BuyerEngagementsPage />);

    await screen.findByTestId("engagements-data-grid");

    act(() => {
      getLatestGridProps()?.onPageChange(1);
    });

    await waitFor(() => {
      expect(getLatestGridProps()?.paginationModel.page).toBe(1);
    });

    fireEvent.click(screen.getByRole("button", { name: "Industry" }));

    expect(screen.getByRole("button", { name: "All Industries (12)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tech (6)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Healthcare (6)" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Healthcare (6)" }));

    await waitFor(() => {
      const latestGridProps = getLatestGridProps();
      expect(latestGridProps?.sortedCount).toBe(6);
      expect(latestGridProps?.paginationModel.page).toBe(0);
    });

    fireEvent.click(screen.getByRole("button", { name: "NDA pending (6)" }));

    await waitFor(() => {
      const latestGridProps = getLatestGridProps();
      expect(latestGridProps?.sortedCount).toBe(6);
      expect(latestGridProps?.rows).toHaveLength(6);
      expect(latestGridProps?.rows.every((row) => row.stage === "nda_pending")).toBe(true);
      expect(latestGridProps?.rows.every((row) => row.industry === "Tech")).toBe(true);
    });

    expect(screen.getByRole("button", { name: "All Industries (6)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tech (6)" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Healthcare (6)" })).not.toBeInTheDocument();
  });

  it("treats a literal 'all' industry value as a normal selectable option", async () => {
    mockEngagementsResponse([
      createEngagement(1, "nda_pending", "all"),
      createEngagement(2, "nda_pending", "Tech"),
    ]);

    render(<BuyerEngagementsPage />);

    await screen.findByTestId("engagements-data-grid");

    fireEvent.click(screen.getByRole("button", { name: "Industry" }));

    expect(screen.getByRole("button", { name: "All Industries (2)" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "all (1)" }));

    await waitFor(() => {
      const latestGridProps = getLatestGridProps();
      expect(latestGridProps?.sortedCount).toBe(1);
      expect(latestGridProps?.rows).toHaveLength(1);
      expect(latestGridProps?.rows[0]?.industry).toBe("all");
    });
  });

  it("resets pagination to first page when sort model changes", async () => {
    const engagements = Array.from({ length: 12 }, (_, i) =>
      createEngagement(i + 1, i % 2 === 0 ? "nda_pending" : "pursued")
    );

    mockEngagementsResponse(engagements);

    render(<BuyerEngagementsPage />);

    await screen.findByTestId("engagements-data-grid");

    act(() => {
      getLatestGridProps()?.onPageChange(1);
    });

    await waitFor(() => {
      expect(getLatestGridProps()?.paginationModel.page).toBe(1);
    });

    act(() => {
      getLatestGridProps()?.onSortModelChange([{ field: "deal_headline", sort: "asc" }]);
    });

    await waitFor(() => {
      const latestGridProps = getLatestGridProps();
      expect(latestGridProps?.paginationModel.page).toBe(0);
      expect(latestGridProps?.sortModel).toEqual([{ field: "deal_headline", sort: "asc" }]);
    });
  });

  it("hides stage filter bar when there are no engagements", async () => {
    mockEngagementsResponse([]);

    render(<BuyerEngagementsPage />);

    await screen.findByText("You haven't engaged with any deals yet.");

    expect(screen.queryByRole("button", { name: /^All \(/ })).not.toBeInTheDocument();
    expect(screen.queryByTestId("engagements-data-grid")).not.toBeInTheDocument();
  });

  it("renders formatted filter label for unknown custom stage values", async () => {
    mockEngagementsResponse([
      {
        id: "eng-custom",
        stage: "custom_stage",
        nda_status: "signed",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-02T00:00:00.000Z",
        project_id: "project-custom",
        project_name: "Custom Project",
        deal: {
          id: "deal-custom",
          headline: "Custom Deal",
          description: "Custom description",
          industry: "Tech",
          status: "accepting_iois",
          state: null,
          region: null,
          geography: null,
          geography_display: null,
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
          created_at: "2026-01-01T00:00:00.000Z",
          date_received: "2026-01-01T00:00:00.000Z",
        },
        engagement: {
          id: "eng-custom",
          stage: "custom_stage",
          nda_status: "signed",
          nda_signed_at: null,
          cim_released: false,
          cim_released_at: null,
          cim_viewed_at: null,
          cim_downloaded_at: null,
          pass_reason: null,
          pass_reason_detail: null,
          declined_at: null,
          vetting_status: null,
          vetting_rejection_reason: null,
          date_received: "2026-01-01T00:00:00.000Z",
        },
      },
    ]);

    render(<BuyerEngagementsPage />);

    await screen.findByTestId("engagements-data-grid");

    expect(screen.getByRole("button", { name: "All (1)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Custom stage (1)" })).toBeInTheDocument();
  });

  it("renders Sign NDA action for nda_pending and navigates to NDA workflow", async () => {
    mockEngagementsResponse([createEngagement(1, "nda_pending")]);

    render(<BuyerEngagementsPage />);

    await screen.findByTestId("engagements-data-grid");
    await userEvent.click(screen.getByTestId("engagement-row-eng-1"));

    expect(getDrawerActionButton("Sign NDA")).toBeInTheDocument();

    await userEvent.click(getDrawerActionButton("Sign NDA"));

    expect(mockState.push).toHaveBeenCalledWith("/deals/deal-1/nda");
  });

  it("uses declined -> pursue flow, calls pursue endpoint with projectId, and updates stage/actions", async () => {
    const initialEngagement = createEngagement(1, "declined");
    const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === "/api/buyer/engagements") {
        return {
          ok: true,
          json: async () => ({ engagements: [initialEngagement], viewer: { isApprovedBuyer: true } }),
        };
      }

      if (url === "/api/deals/deal-1/pursue") {
        expect(init?.method).toBe("POST");
        expect(init?.headers).toEqual({ "Content-Type": "application/json" });
        expect(init?.body).toBe(JSON.stringify({ projectId: "project-1" }));

        return {
          ok: true,
          json: async () => ({
            engagement: {
              ...initialEngagement.engagement,
              stage: "nda_pending",
              nda_status: "sent",
              cim_released: false,
            },
          }),
        };
      }

      return {
        ok: false,
        json: async () => ({}),
      };
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<BuyerEngagementsPage />);

    await screen.findByTestId("engagements-data-grid");
    await userEvent.click(screen.getByTestId("engagement-row-eng-1"));

    expect(getDrawerActionButton("Pursue")).toBeInTheDocument();

    await userEvent.click(getDrawerActionButton("Pursue"));

    await waitFor(() => {
      expect(getLatestGridProps()?.rows[0]?.stage).toBe("nda_pending");
    });

    await waitFor(() => {
      expect(getDrawerActionButton("Sign NDA")).toBeInTheDocument();
    });
  });

  it("renders View IOI action for ioi_submitted and navigates to IOI workflow", async () => {
    const ioiEngagement = createEngagement(1, "ioi_submitted");
    ioiEngagement.deal.status = "accepting_iois";
    ioiEngagement.engagement.cim_released = true;

    mockEngagementsResponse([ioiEngagement]);
    render(<BuyerEngagementsPage />);

    await screen.findByTestId("engagements-data-grid");
    await userEvent.click(screen.getByTestId("engagement-row-eng-1"));

    expect(getDrawerActionButton("View IOI")).toBeInTheDocument();
    await userEvent.click(getDrawerActionButton("View IOI"));
    expect(mockState.push).toHaveBeenCalledWith("/deals/deal-1/ioi");
  });

  it("renders View LOI action for loi_submitted and navigates to LOI workflow", async () => {
    const loiEngagement = createEngagement(2, "loi_submitted");
    loiEngagement.deal.status = "accepting_lois";

    mockEngagementsResponse([loiEngagement]);
    render(<BuyerEngagementsPage />);

    await screen.findByTestId("engagements-data-grid");
    await userEvent.click(screen.getByTestId("engagement-row-eng-2"));

    expect(getDrawerActionButton("View LOI")).toBeInTheDocument();
    await userEvent.click(getDrawerActionButton("View LOI"));
    expect(mockState.push).toHaveBeenCalledWith("/deals/deal-2/loi");
  });

  it("disables deal action button while async request is in flight and re-enables after completion", async () => {
    const initialEngagement = createEngagement(1, "declined");
    let resolvePursueRequest: (() => void) | null = null;
    const pursueRequest = new Promise<void>((resolve) => {
      resolvePursueRequest = resolve;
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);

        if (url === "/api/buyer/engagements") {
          return {
            ok: true,
            json: async () => ({ engagements: [initialEngagement], viewer: { isApprovedBuyer: true } }),
          };
        }

        if (url === "/api/deals/deal-1/pursue") {
          await pursueRequest;
          return {
            ok: true,
            json: async () => ({
              engagement: {
                ...initialEngagement.engagement,
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

    render(<BuyerEngagementsPage />);

    await screen.findByTestId("engagements-data-grid");
    await userEvent.click(screen.getByTestId("engagement-row-eng-1"));

    const pursueButton = getDrawerActionButton("Pursue");
    await userEvent.click(pursueButton);

    await waitFor(() => {
      expect(getDrawerActionButton("Pursue")).toBeDisabled();
    });

    resolvePursueRequest?.();

    await waitFor(() => {
      expect(getDrawerActionButton("Sign NDA")).toBeInTheDocument();
    });
  });
});
