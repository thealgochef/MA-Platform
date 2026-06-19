import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type ProjectRow = { id: string; name: string };
type TestSortModel = Array<{ field: string; sort?: "asc" | "desc" | null }>;
type ProjectStatusChipProps = {
  isActive: boolean | null | undefined;
  clickable?: boolean;
  onClick?: (event: {
    preventDefault: () => void;
    stopPropagation: () => void;
    currentTarget: EventTarget & HTMLElement;
  }) => void;
};

type MockDataGridProps = {
  rows: ProjectRow[];
  detailColumns: unknown[];
  onRowClick: (row: ProjectRow) => void;
  sortedCount: number;
  sortModel: TestSortModel;
  onSortModelChange: (sortModel: TestSortModel) => void;
  paginationModel: { page: number; pageSize: number };
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (pageSize: number) => void;
  rowSelectionModel: unknown;
  onRowSelectionModelChange: (model: unknown) => void;
};

type GridColumnWithValueGetter = {
  field?: string;
  headerName?: string;
  valueGetter?: (_value: unknown, row: Record<string, unknown>) => unknown;
  renderCell?: (params: { value?: unknown; row: Record<string, unknown> }) => unknown;
};

const US_MM_DD_YYYY_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "2-digit",
  day: "2-digit",
  year: "numeric",
});

function getExpectedUsDate(value: string): string {
  return US_MM_DD_YYYY_FORMATTER.format(new Date(value));
}

const mockState = vi.hoisted(() => ({
  push: vi.fn(),
  capturedDataGridProps: [] as MockDataGridProps[],
  capturedStatusChipProps: [] as ProjectStatusChipProps[],
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockState.push }),
}));

vi.mock("@mui/material", () => ({
  Menu: ({ open, children }: { open?: boolean; children: ReactNode }) => (
    open ? <div data-testid="status-menu">{children}</div> : null
  ),
  MenuItem: ({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/ProjectStatusChip", () => ({
  getProjectStatusLabel: (isActive: boolean | null | undefined) => {
    if (isActive === true) {
      return "Active";
    }

    if (isActive === false) {
      return "Inactive";
    }

    return "—";
  },
  ProjectStatusChip: ({ isActive, clickable = false, onClick }: ProjectStatusChipProps) => {
    mockState.capturedStatusChipProps.push({ isActive, clickable, onClick });

    const statusLabel = isActive === true ? "Active" : isActive === false ? "Inactive" : "—";

    return (
      <button
        type="button"
        data-testid="project-status-chip"
        onClick={(event) => {
          if (!clickable || !onClick) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();
          onClick(event);
        }}
      >
        {statusLabel}
      </button>
    );
  },
}));

vi.mock("@/components/ui/DataGridTable", () => ({
  DataGridTable: (props: MockDataGridProps) => {
    const requiredProps: Array<keyof MockDataGridProps> = [
      "rows",
      "detailColumns",
      "onRowClick",
      "sortedCount",
      "sortModel",
      "onSortModelChange",
      "paginationModel",
      "onPageChange",
      "onRowsPerPageChange",
      "rowSelectionModel",
      "onRowSelectionModelChange",
    ];

    for (const propName of requiredProps) {
      if (props[propName] === undefined) {
        throw new Error(`Missing required DataGridTable prop: ${propName}`);
      }
    }

    mockState.capturedDataGridProps.push(props);

    return (
      <div data-testid="projects-data-grid">
        <p data-testid="grid-row-count">Rows: {props.rows.length}</p>
        <p data-testid="grid-row-names">{props.rows.map((row) => row.name).join(",")}</p>
        <button type="button" onClick={() => props.onSortModelChange([{ field: "name", sort: "asc" }])}>
          Sort by name ascending
        </button>
        <button type="button" onClick={() => props.onSortModelChange([{ field: "status", sort: "asc" }])}>
          Sort by status ascending
        </button>
        <button type="button" onClick={() => props.onPageChange(1)}>
          Go to page 2
        </button>
        <button type="button" onClick={() => props.onRowsPerPageChange(2)}>
          Set rows per page to 2
        </button>
        <button type="button" onClick={() => props.onRowsPerPageChange(3)}>
          Set rows per page to 3
        </button>
        <button
          type="button"
          onClick={() =>
            props.onRowSelectionModelChange({
              type: "include",
              ids: new Set(props.rows[0] ? [props.rows[0].id] : []),
            })
          }
        >
          Select first row
        </button>
        <button type="button" onClick={() => props.onRowClick(props.rows[0])} disabled={props.rows.length === 0}>
          Open first project row
        </button>
      </div>
    );
  },
}));

import ProjectsPage from "./page";

function mockProjectsResponse(projects: Array<Record<string, unknown>>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ projects }),
    }))
  );
}

function getLatestGridProps() {
  return mockState.capturedDataGridProps.at(-1);
}

describe("ProjectsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.capturedDataGridProps = [];
    mockState.capturedStatusChipProps = [];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows loading state before projects request resolves", async () => {
    let resolveFetch: ((value: { ok: boolean; json: () => Promise<{ projects: [] }> }) => void) | null = null;
    const deferredFetch = new Promise<{ ok: boolean; json: () => Promise<{ projects: [] }> }>((resolve) => {
      resolveFetch = resolve;
    });

    vi.stubGlobal("fetch", vi.fn(() => deferredFetch));

    render(<ProjectsPage />);

    expect(screen.getByText("Loading projects...")).toBeInTheDocument();

    resolveFetch?.({
      ok: true,
      json: async () => ({ projects: [] }),
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading projects...")).not.toBeInTheDocument();
    });
  });

  it("renders DataGridTable with fetched projects and navigates on row click", async () => {
    const projects = [
      {
        id: "project-1",
        name: "Project Orion",
        is_active: true,
        industry: "Industrial",
        revenue_min: null,
        revenue_max: null,
        ebitda_min: null,
        ebitda_max: null,
        location: "TX",
        keywords: [],
        created_at: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "project-2",
        name: "Project Atlas",
        is_active: false,
        industry: "Healthcare",
        revenue_min: null,
        revenue_max: null,
        ebitda_min: null,
        ebitda_max: null,
        location: "CA",
        keywords: [],
        created_at: "2026-01-02T00:00:00.000Z",
      },
    ];

    mockProjectsResponse(projects);

    render(<ProjectsPage />);

    expect(await screen.findByTestId("projects-data-grid")).toBeInTheDocument();
    expect(screen.getByTestId("grid-row-count")).toHaveTextContent("Rows: 2");
    expect(fetch).toHaveBeenCalledWith("/api/projects");

    const latestGridProps = getLatestGridProps();
    expect(latestGridProps?.rows).toEqual(projects);
    expect(Array.isArray(latestGridProps?.detailColumns)).toBe(true);
    expect(latestGridProps?.detailColumns.length).toBeGreaterThan(0);
    expect(latestGridProps?.sortedCount).toBe(projects.length);
    expect(latestGridProps?.sortModel).toEqual([]);
    expect(latestGridProps?.paginationModel).toEqual({ page: 0, pageSize: 10 });
    expect(latestGridProps?.rowSelectionModel).toEqual({ type: "include", ids: new Set() });
    expect(latestGridProps?.onRowClick).toBeTypeOf("function");
    expect(latestGridProps?.onSortModelChange).toBeTypeOf("function");
    expect(latestGridProps?.onPageChange).toBeTypeOf("function");
    expect(latestGridProps?.onRowsPerPageChange).toBeTypeOf("function");
    expect(latestGridProps?.onRowSelectionModelChange).toBeTypeOf("function");

    const columnHeaders = (latestGridProps?.detailColumns as Array<{ headerName?: string }> | undefined)?.map(
      (column) => column.headerName
    );
    expect(columnHeaders).toContain("Project Name");
    expect(columnHeaders).toContain("Status");
    const projectNameColumnIndex = columnHeaders?.indexOf("Project Name") ?? -1;
    expect(projectNameColumnIndex).toBeGreaterThanOrEqual(0);
    expect(columnHeaders?.[projectNameColumnIndex + 1]).toBe("Status");

    fireEvent.click(screen.getByRole("button", { name: "Select first row" }));

    await waitFor(() => {
      const updatedGridProps = getLatestGridProps();
      expect(updatedGridProps?.rowSelectionModel).toEqual({ type: "include", ids: new Set(["project-1"]) });
    });

    fireEvent.click(screen.getByRole("button", { name: "Open first project row" }));

    expect(mockState.push).toHaveBeenCalledWith("/projects/project-1");
  });

  it("uses ProjectDealsView-aligned width wrappers for header and content containers", async () => {
    const projects = [
      {
        id: "project-1",
        name: "Project Orion",
        industry: "Industrial",
        revenue_min: null,
        revenue_max: null,
        ebitda_min: null,
        ebitda_max: null,
        location: "TX",
        keywords: [],
        created_at: "2026-01-01T00:00:00.000Z",
      },
    ];

    mockProjectsResponse(projects);

    render(<ProjectsPage />);

    const heading = await screen.findByRole("heading", { name: "Acquisition Projects" });
    const dataGrid = await screen.findByTestId("projects-data-grid");

    const headerWrapper = heading.closest("div")?.parentElement;
    const contentWrapper = dataGrid.parentElement?.parentElement;

    expect(headerWrapper).toBeTruthy();
    expect(contentWrapper).toBeTruthy();

    expect(headerWrapper).toHaveClass("w-full", "px-5", "sm:px-6");
    expect(headerWrapper).not.toHaveClass("max-w-7xl", "max-w-6xl");
    expect(headerWrapper).not.toHaveClass("mx-auto");

    expect(contentWrapper).toHaveClass("w-full", "px-4", "pb-8");
    expect(contentWrapper).not.toHaveClass("max-w-7xl", "max-w-6xl");
    expect(contentWrapper).not.toHaveClass("mx-auto");
  });

  it("integrates sorting and pagination callbacks with displayed rows", async () => {
    const projects = [
      { id: "project-1", name: "Project Zulu", created_at: "2026-01-01T00:00:00.000Z" },
      { id: "project-2", name: "Project Alpha", created_at: "2026-01-02T00:00:00.000Z" },
      { id: "project-3", name: "Project Mike", created_at: "2026-01-03T00:00:00.000Z" },
      { id: "project-4", name: "Project Bravo", created_at: "2026-01-04T00:00:00.000Z" },
    ];

    mockProjectsResponse(projects);

    render(<ProjectsPage />);

    expect(await screen.findByTestId("projects-data-grid")).toBeInTheDocument();
    expect(screen.getByTestId("grid-row-names")).toHaveTextContent(
      "Project Zulu,Project Alpha,Project Mike,Project Bravo"
    );
    expect(getLatestGridProps()?.detailColumns.length).toBeGreaterThan(0);
    expect(getLatestGridProps()?.sortedCount).toBe(projects.length);

    fireEvent.click(screen.getByRole("button", { name: "Sort by name ascending" }));

    await waitFor(() => {
      expect(screen.getByTestId("grid-row-names")).toHaveTextContent(
        "Project Alpha,Project Bravo,Project Mike,Project Zulu"
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Set rows per page to 2" }));

    await waitFor(() => {
      expect(screen.getByTestId("grid-row-names")).toHaveTextContent("Project Alpha,Project Bravo");
      expect(getLatestGridProps()?.paginationModel).toEqual({ page: 0, pageSize: 2 });
      expect(getLatestGridProps()?.sortedCount).toBe(projects.length);
    });

    fireEvent.click(screen.getByRole("button", { name: "Go to page 2" }));

    await waitFor(() => {
      expect(screen.getByTestId("grid-row-names")).toHaveTextContent("Project Mike,Project Zulu");
      expect(getLatestGridProps()?.paginationModel).toEqual({ page: 1, pageSize: 2 });
      expect(getLatestGridProps()?.sortedCount).toBe(projects.length);
    });

    fireEvent.click(screen.getByRole("button", { name: "Set rows per page to 3" }));

    await waitFor(() => {
      expect(screen.getByTestId("grid-row-names")).toHaveTextContent("Project Alpha,Project Bravo,Project Mike");
      expect(getLatestGridProps()?.paginationModel).toEqual({ page: 0, pageSize: 3 });
      expect(getLatestGridProps()?.sortedCount).toBe(projects.length);
    });
  });

  it("formats Created column values as deterministic MM/DD/YYYY", async () => {
    const projects = [
      {
        id: "project-1",
        name: "Project Orion",
        industry: "Industrial",
        revenue_min: null,
        revenue_max: null,
        ebitda_min: null,
        ebitda_max: null,
        location: "TX",
        keywords: [],
        created_at: "2026-01-02T00:00:00.000Z",
      },
    ];

    mockProjectsResponse(projects);

    render(<ProjectsPage />);

    await screen.findByTestId("projects-data-grid");

    const latestGridProps = getLatestGridProps();
    const createdColumn = latestGridProps?.detailColumns.find(
      (column: { field?: string }) => column.field === "created_at"
    ) as { renderCell?: (params: { row: { created_at: string } }) => unknown } | undefined;

    expect(createdColumn).toBeTruthy();
    expect(createdColumn?.renderCell).toBeTypeOf("function");

    const renderedCreatedValue = String(
      createdColumn?.renderCell?.({
        row: { created_at: "2026-01-02T00:00:00.000Z" },
      })
    );

    expect(renderedCreatedValue).toBe(getExpectedUsDate("2026-01-02T00:00:00.000Z"));
    expect(renderedCreatedValue).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(renderedCreatedValue).not.toBe("1/2/2026");
  });

  it("formats Created column values using environment timezone for near-midnight ISO timestamps", async () => {
    const projects = [
      {
        id: "project-1",
        name: "Project Orion",
        industry: "Industrial",
        revenue_min: null,
        revenue_max: null,
        ebitda_min: null,
        ebitda_max: null,
        location: "TX",
        keywords: [],
        created_at: "2026-01-01T00:30:00.000Z",
      },
    ];

    mockProjectsResponse(projects);

    render(<ProjectsPage />);

    await screen.findByTestId("projects-data-grid");

    const latestGridProps = getLatestGridProps();
    const createdColumn = latestGridProps?.detailColumns.find(
      (column: { field?: string }) => column.field === "created_at"
    ) as { renderCell?: (params: { row: { created_at: string } }) => unknown } | undefined;

    expect(createdColumn?.renderCell).toBeTypeOf("function");

    const renderedCreatedValue = String(
      createdColumn?.renderCell?.({
        row: { created_at: "2026-01-01T00:30:00.000Z" },
      })
    );

    expect(renderedCreatedValue).toBe(getExpectedUsDate("2026-01-01T00:30:00.000Z"));
    expect(renderedCreatedValue).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it("maps is_active values to Status labels and renders the reusable status chip", async () => {
    const projects = [
      {
        id: "project-1",
        name: "Project Orion",
        is_active: true,
        created_at: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "project-2",
        name: "Project Atlas",
        is_active: false,
        created_at: "2026-01-02T00:00:00.000Z",
      },
    ];

    mockProjectsResponse(projects);

    render(<ProjectsPage />);

    await screen.findByTestId("projects-data-grid");

    const latestGridProps = getLatestGridProps();
    const statusColumn = latestGridProps?.detailColumns.find(
      (column: { field?: string }) => column.field === "status"
    ) as GridColumnWithValueGetter | undefined;

    expect(statusColumn?.headerName).toBe("Status");
    expect(statusColumn?.valueGetter).toBeTypeOf("function");
    expect(statusColumn?.renderCell).toBeTypeOf("function");
    expect(statusColumn?.valueGetter?.(undefined, { is_active: true })).toBe("Active");
    expect(statusColumn?.valueGetter?.(undefined, { is_active: false })).toBe("Inactive");
    expect(statusColumn?.valueGetter?.(undefined, {})).toBe("—");

    const activeStatusValue = statusColumn?.valueGetter?.(undefined, { is_active: true });
    const { rerender } = render(
      <>{statusColumn?.renderCell?.({ value: activeStatusValue, row: { is_active: true } }) as ReactNode}</>
    );

    const activeChip = screen.getByTestId("project-status-chip");
    expect(activeChip).toHaveTextContent("Active");
    expect(mockState.capturedStatusChipProps.at(-1)).toMatchObject({
      isActive: true,
      clickable: true,
    });

    const fallbackStatusValue = statusColumn?.valueGetter?.(undefined, {});
    rerender(<>{statusColumn?.renderCell?.({ value: fallbackStatusValue, row: {} }) as ReactNode}</>);

    const fallbackChip = screen.getByTestId("project-status-chip");
    expect(fallbackChip).toHaveTextContent("—");
    expect(mockState.capturedStatusChipProps.at(-1)).toMatchObject({
      isActive: undefined,
      clickable: true,
    });
  });

  it("shows status menu with Edit and Pause actions for active projects", async () => {
    const projects = [
      {
        id: "project-1",
        name: "Project Orion",
        is_active: true,
        created_at: "2026-01-01T00:00:00.000Z",
      },
    ];

    mockProjectsResponse(projects);

    render(<ProjectsPage />);

    await screen.findByTestId("projects-data-grid");

    const latestGridProps = getLatestGridProps();
    const statusColumn = latestGridProps?.detailColumns.find(
      (column: { field?: string }) => column.field === "status"
    ) as GridColumnWithValueGetter | undefined;

    const activeStatusValue = statusColumn?.valueGetter?.(undefined, { is_active: true });
    render(
      <>{statusColumn?.renderCell?.({ value: activeStatusValue, row: projects[0] }) as ReactNode}</>
    );

    fireEvent.click(screen.getByTestId("project-status-chip"));

    expect(screen.getByTestId("status-menu")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit Project" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pause Project" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Resume Project" })).not.toBeInTheDocument();
  });

  it("does not navigate to project detail when interacting with the status chip menu", async () => {
    const projects = [
      {
        id: "project-1",
        name: "Project Orion",
        is_active: true,
        created_at: "2026-01-01T00:00:00.000Z",
      },
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        if (input === "/api/projects") {
          return {
            ok: true,
            json: async () => ({ projects }),
          };
        }

        if (input === "/api/projects/project-1/status") {
          return {
            ok: true,
            json: async () => ({ project: { id: "project-1", is_active: false } }),
          };
        }

        throw new Error(`Unexpected fetch call: ${input}`);
      })
    );

    render(<ProjectsPage />);

    await screen.findByTestId("projects-data-grid");

    const latestGridProps = getLatestGridProps();
    const statusColumn = latestGridProps?.detailColumns.find(
      (column: { field?: string }) => column.field === "status"
    ) as GridColumnWithValueGetter | undefined;

    const activeStatusValue = statusColumn?.valueGetter?.(undefined, { is_active: true });
    render(
      <div
        data-testid="clickable-project-row"
        onClick={() => latestGridProps?.onRowClick(projects[0] as ProjectRow)}
      >
        {statusColumn?.renderCell?.({ value: activeStatusValue, row: projects[0] }) as ReactNode}
      </div>
    );

    fireEvent.click(screen.getByTestId("clickable-project-row"));
    expect(mockState.push).toHaveBeenCalledWith("/projects/project-1");
    mockState.push.mockClear();

    fireEvent.click(screen.getByTestId("project-status-chip"));
    expect(mockState.push).not.toHaveBeenCalledWith("/projects/project-1");

    fireEvent.click(screen.getByRole("button", { name: "Pause Project" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/projects/project-1/status",
        expect.objectContaining({ method: "PATCH" })
      );
    });

    expect(mockState.push).not.toHaveBeenCalledWith("/projects/project-1");
  });

  it("shows Resume action for inactive projects and applies server status value", async () => {
    const projects = [
      {
        id: "project-2",
        name: "Project Atlas",
        is_active: false,
        created_at: "2026-01-02T00:00:00.000Z",
      },
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        if (input === "/api/projects") {
          return {
            ok: true,
            json: async () => ({ projects }),
          };
        }

        if (input === "/api/projects/project-2/status") {
          return {
            ok: true,
            json: async () => ({ project: { id: "project-2", is_active: false } }),
          };
        }

        throw new Error(`Unexpected fetch call: ${input}`);
      })
    );

    render(<ProjectsPage />);

    await screen.findByTestId("projects-data-grid");

    const latestGridProps = getLatestGridProps();
    const statusColumn = latestGridProps?.detailColumns.find(
      (column: { field?: string }) => column.field === "status"
    ) as GridColumnWithValueGetter | undefined;

    const inactiveStatusValue = statusColumn?.valueGetter?.(undefined, { is_active: false });
    render(
      <>{statusColumn?.renderCell?.({ value: inactiveStatusValue, row: projects[0] }) as ReactNode}</>
    );

    fireEvent.click(screen.getByTestId("project-status-chip"));

    expect(screen.getByTestId("status-menu")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resume Project" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pause Project" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Resume Project" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/projects/project-2/status",
        expect.objectContaining({
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: true }),
        })
      );
      expect(getLatestGridProps()?.rows[0]).toMatchObject({
        id: "project-2",
        is_active: false,
      });
    });
  });

  it("updates active project to inactive when Pause Project is selected", async () => {
    const projects = [
      {
        id: "project-1",
        name: "Project Orion",
        is_active: true,
        created_at: "2026-01-01T00:00:00.000Z",
      },
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        if (input === "/api/projects") {
          return {
            ok: true,
            json: async () => ({ projects }),
          };
        }

        if (input === "/api/projects/project-1/status") {
          return {
            ok: true,
            json: async () => ({ project: { id: "project-1", is_active: false } }),
          };
        }

        throw new Error(`Unexpected fetch call: ${input}`);
      })
    );

    render(<ProjectsPage />);

    await screen.findByTestId("projects-data-grid");

    const latestGridProps = getLatestGridProps();
    const statusColumn = latestGridProps?.detailColumns.find(
      (column: { field?: string }) => column.field === "status"
    ) as GridColumnWithValueGetter | undefined;

    const activeStatusValue = statusColumn?.valueGetter?.(undefined, { is_active: true });
    render(
      <>{statusColumn?.renderCell?.({ value: activeStatusValue, row: projects[0] }) as ReactNode}</>
    );

    fireEvent.click(screen.getByTestId("project-status-chip"));
    fireEvent.click(screen.getByRole("button", { name: "Pause Project" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/projects/project-1/status",
        expect.objectContaining({
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: false }),
        })
      );
      expect(getLatestGridProps()?.rows[0]).toMatchObject({
        id: "project-1",
        is_active: false,
      });
    });
  });

  it("navigates to edit page when Edit Project is selected from status menu", async () => {
    const projects = [
      {
        id: "project-1",
        name: "Project Orion",
        is_active: true,
        created_at: "2026-01-01T00:00:00.000Z",
      },
    ];

    mockProjectsResponse(projects);

    render(<ProjectsPage />);

    await screen.findByTestId("projects-data-grid");

    const latestGridProps = getLatestGridProps();
    const statusColumn = latestGridProps?.detailColumns.find(
      (column: { field?: string }) => column.field === "status"
    ) as GridColumnWithValueGetter | undefined;

    const activeStatusValue = statusColumn?.valueGetter?.(undefined, { is_active: true });
    render(
      <>{statusColumn?.renderCell?.({ value: activeStatusValue, row: projects[0] }) as ReactNode}</>
    );

    fireEvent.click(screen.getByTestId("project-status-chip"));
    fireEvent.click(screen.getByRole("button", { name: "Edit Project" }));

    expect(mockState.push).toHaveBeenCalledWith("/projects/project-1/edit");
  });

  it("sorts by status using active, inactive, and fallback labels", async () => {
    const projects = [
      {
        id: "project-1",
        name: "Project Inactive",
        is_active: false,
        created_at: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "project-2",
        name: "Project Active",
        is_active: true,
        created_at: "2026-01-02T00:00:00.000Z",
      },
      {
        id: "project-3",
        name: "Project Fallback",
        created_at: "2026-01-03T00:00:00.000Z",
      },
    ];

    mockProjectsResponse(projects);

    render(<ProjectsPage />);

    expect(await screen.findByTestId("projects-data-grid")).toBeInTheDocument();
    expect(screen.getByTestId("grid-row-names")).toHaveTextContent(
      "Project Inactive,Project Active,Project Fallback"
    );

    fireEvent.click(screen.getByRole("button", { name: "Sort by status ascending" }));

    await waitFor(() => {
      expect(screen.getByTestId("grid-row-names")).toHaveTextContent(
        "Project Fallback,Project Active,Project Inactive"
      );
      expect(getLatestGridProps()?.sortModel).toEqual([{ field: "status", sort: "asc" }]);
    });
  });

  it("renders empty state CTA when no projects are returned", async () => {
    mockProjectsResponse([]);

    render(<ProjectsPage />);

    expect(
      await screen.findByText("Create your first acquisition project to start matching with deals.")
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create Project" })).toHaveAttribute("href", "/projects/new");
    expect(screen.queryByTestId("projects-data-grid")).not.toBeInTheDocument();
  });
});
