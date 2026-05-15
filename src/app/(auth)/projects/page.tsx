"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataGridTable } from "@/components/ui/DataGridTable";
import { formatCurrency } from "@/lib/utils";
import {
  GridColDef,
  GridPaginationModel,
  GridRowSelectionModel,
  GridSortModel,
} from "@mui/x-data-grid";

interface Project {
  id: string;
  name: string;
  industry: string | null;
  revenue_min: number | null;
  revenue_max: number | null;
  ebitda_min: number | null;
  ebitda_max: number | null;
  location: string | null;
  keywords: string[];
  created_at: string;
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>({
    type: "include",
    ids: new Set(),
  });
  const [sortModel, setSortModel] = useState<GridSortModel>([]);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch("/api/projects");
        if (res.ok) {
          const data = await res.json();
          setProjects(data.projects || []);
        } else {
          setError("Failed to load projects.");
        }
      } catch {
        setError("Network error. Please try again.");
      }
      setLoading(false);
    };
    fetchProjects();
  }, []);

  const columns = useMemo<GridColDef<Project>[]>(() => {
    return [
      {
        field: "name",
        headerName: "Project Name",
        flex: 1.3,
        minWidth: 200,
        cellClassName: "row-hover-text",
      },
      {
        field: "industry",
        headerName: "Industry",
        flex: 1,
        minWidth: 140,
        valueGetter: (_, row) => row.industry || "—",
      },
      {
        field: "location",
        headerName: "Location",
        flex: 1,
        minWidth: 130,
        valueGetter: (_, row) => row.location || "—",
      },
      {
        field: "revenue",
        headerName: "Revenue Range",
        flex: 1,
        minWidth: 160,
        valueGetter: (_, row) => row.revenue_min ?? row.revenue_max ?? Number.NEGATIVE_INFINITY,
        renderCell: (params) => {
          const { revenue_min, revenue_max } = params.row;
          if (revenue_min == null && revenue_max == null) {
            return "—";
          }

          return `${revenue_min != null ? formatCurrency(revenue_min) : "Any"} – ${
            revenue_max != null ? formatCurrency(revenue_max) : "Any"
          }`;
        },
      },
      {
        field: "ebitda",
        headerName: "EBITDA",
        flex: 1,
        minWidth: 160,
        valueGetter: (_, row) => row.ebitda_min ?? row.ebitda_max ?? Number.NEGATIVE_INFINITY,
        renderCell: (params) => {
          const { ebitda_min, ebitda_max } = params.row;
          if (ebitda_min == null && ebitda_max == null) {
            return "—";
          }

          return `${ebitda_min != null ? formatCurrency(ebitda_min) : "Any"} – ${
            ebitda_max != null ? formatCurrency(ebitda_max) : "Any"
          }`;
        },
      },
      {
        field: "created_at",
        headerName: "Created",
        flex: 0.9,
        minWidth: 120,
        valueGetter: (_, row) => new Date(row.created_at).getTime(),
        renderCell: (params) => new Date(params.row.created_at).toLocaleDateString(),
      },
    ];
  }, []);

  const sortedProjects = useMemo(() => {
    const activeSort = sortModel[0];
    if (!activeSort?.field || !activeSort.sort) {
      return projects;
    }

    const direction = activeSort.sort === "asc" ? 1 : -1;
    const getValue = (project: Project) => {
      switch (activeSort.field) {
        case "name":
          return project.name;
        case "industry":
          return project.industry || "";
        case "location":
          return project.location || "";
        case "revenue":
          return project.revenue_min ?? project.revenue_max ?? Number.NEGATIVE_INFINITY;
        case "ebitda":
          return project.ebitda_min ?? project.ebitda_max ?? Number.NEGATIVE_INFINITY;
        case "created_at":
          return new Date(project.created_at).getTime();
        default:
          return "";
      }
    };

    return [...projects].sort((a, b) => {
      const aValue = getValue(a);
      const bValue = getValue(b);

      if (typeof aValue === "number" && typeof bValue === "number") {
        return (aValue - bValue) * direction;
      }

      return (
        String(aValue).localeCompare(String(bValue), undefined, {
          sensitivity: "base",
          numeric: true,
        }) * direction
      );
    });
  }, [projects, sortModel]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(sortedProjects.length / paginationModel.pageSize) - 1);
    if (paginationModel.page > maxPage) {
      setPaginationModel((prev) => ({ ...prev, page: maxPage }));
    }
  }, [paginationModel.page, paginationModel.pageSize, sortedProjects.length]);

  const pagedProjects = useMemo(() => {
    const start = paginationModel.page * paginationModel.pageSize;
    return sortedProjects.slice(start, start + paginationModel.pageSize);
  }, [paginationModel.page, paginationModel.pageSize, sortedProjects]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-alt p-8">
        <p className="text-text-secondary">Loading projects...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-alt">
      <div className="bg-bg border-b border-border-gray pt-8 pb-6">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-primary">My Projects</h1>
            <Link
              href="/projects/new"
              className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-btn-hover transition-colors"
            >
              New Project
            </Link>
          </div>

          {error && (
            <div className="bg-error/10 border border-error rounded-md p-4 mt-6">
              <p className="text-sm text-error">{error}</p>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-8">
        <div className="pt-4">
          {projects.length === 0 ? (
            <div className="bg-surface-alt rounded-lg shadow-md p-8 text-center">
              <p className="text-text-secondary mb-4">
                Create your first acquisition project to start matching with deals.
              </p>
              <Link
                href="/projects/new"
                className="inline-block px-6 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-btn-hover transition-colors"
              >
                Create Project
              </Link>
            </div>
          ) : (
            <DataGridTable
              rows={pagedProjects}
              detailColumns={columns}
              rowSelectionModel={rowSelectionModel}
              onRowSelectionModelChange={setRowSelectionModel}
              sortModel={sortModel}
              onSortModelChange={setSortModel}
              onRowClick={(row) => router.push(`/projects/${row.id}`)}
              sortedCount={sortedProjects.length}
              paginationModel={paginationModel}
              onPageChange={(page) => setPaginationModel((prev) => ({ ...prev, page }))}
              onRowsPerPageChange={(pageSize) => setPaginationModel({ page: 0, pageSize })}
            />
          )}
        </div>
      </div>
    </div>
  );
}
