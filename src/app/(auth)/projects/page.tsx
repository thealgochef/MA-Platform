"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

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
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-alt p-8">
        <p className="text-text-secondary">Loading projects...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-alt py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-primary">My Projects</h1>
          <Link
            href="/projects/new"
            className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-btn-hover transition-colors"
          >
            New Project
          </Link>
        </div>

        {error && (
          <div className="bg-error/10 border border-error rounded-md p-4 mb-6">
            <p className="text-sm text-error">{error}</p>
          </div>
        )}

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="bg-surface-alt rounded-lg shadow-md p-5 hover:shadow-lg transition-shadow block"
              >
                <h3 className="font-semibold text-primary mb-2">{project.name}</h3>
                <div className="space-y-1 text-xs text-text-secondary">
                  {project.industry && <p>Industry: {project.industry}</p>}
                  {project.location && <p>Location: {project.location}</p>}
                  {(project.revenue_min != null || project.revenue_max != null) && (
                    <p>
                      Revenue:{" "}
                      {project.revenue_min != null
                        ? formatCurrency(project.revenue_min)
                        : "Any"}{" "}
                      –{" "}
                      {project.revenue_max != null
                        ? formatCurrency(project.revenue_max)
                        : "Any"}
                    </p>
                  )}
                  {(project.ebitda_min != null || project.ebitda_max != null) && (
                    <p>
                      EBITDA:{" "}
                      {project.ebitda_min != null
                        ? formatCurrency(project.ebitda_min)
                        : "Any"}{" "}
                      –{" "}
                      {project.ebitda_max != null
                        ? formatCurrency(project.ebitda_max)
                        : "Any"}
                    </p>
                  )}
                  {project.keywords && project.keywords.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-2">
                      {project.keywords.map((kw) => (
                        <span
                          key={kw}
                          className="px-2 py-0.5 bg-bg-alt rounded-full text-xs text-text-secondary"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-text-secondary mt-3">
                  Created {new Date(project.created_at).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
