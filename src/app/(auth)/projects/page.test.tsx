import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type ProjectRow = { id: string; name: string };
type TestSortModel = Array<{ field: string; sort?: "asc" | "desc" | null }>;

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

const mockState = vi.hoisted(() => ({
  push: vi.fn(),
  capturedDataGridProps: [] as MockDataGridProps[],
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockState.push }),
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

    fireEvent.click(screen.getByRole("button", { name: "Select first row" }));

    await waitFor(() => {
      const updatedGridProps = getLatestGridProps();
      expect(updatedGridProps?.rowSelectionModel).toEqual({ type: "include", ids: new Set(["project-1"]) });
    });

    fireEvent.click(screen.getByRole("button", { name: "Open first project row" }));

    expect(mockState.push).toHaveBeenCalledWith("/projects/project-1");
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
