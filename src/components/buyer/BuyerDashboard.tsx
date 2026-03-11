"use client";

import { useState, useEffect } from "react";
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
}

interface Analytics {
  pursuing: number;
  passed: number;
  ndaSigned: number;
  ioisSubmitted: number;
  loisSubmitted: number;
  dealsByStage: Record<string, number>;
  avgRevenue: number | null;
  avgEbitda: number | null;
  avgMatchedRevenue: number | null;
  avgMatchedEbitda: number | null;
  dealsByIndustry: Record<string, number>;
}

interface ActivityItem {
  id: string;
  action: string;
  deal_id: string;
  created_at: string;
  details: Record<string, unknown> | null;
}

export default function BuyerDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [projRes, analyticsRes] = await Promise.all([
        fetch("/api/projects"),
        fetch("/api/buyer/analytics"),
      ]);

      if (projRes.ok) {
        const data = await projRes.json();
        setProjects(data.projects || []);
      }

      if (analyticsRes.ok) {
        const data = await analyticsRes.json();
        setAnalytics(data.analytics || null);
        setActivity(data.activity || []);
      }

      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-light-gray p-8">
        <p className="text-text-secondary">Loading dashboard...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-light-gray py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-navy">Dashboard</h1>
          <a
            href="/projects/new"
            className="px-4 py-2 bg-navy text-white rounded-md text-sm font-medium hover:bg-slate-blue"
          >
            New Project
          </a>
        </div>

        {/* Analytics Section */}
        {analytics && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow-md p-4">
              <p className="text-xs text-text-secondary">Deals Pursuing</p>
              <p className="text-2xl font-bold text-navy">{analytics.pursuing}</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <p className="text-xs text-text-secondary">Deals Passed</p>
              <p className="text-2xl font-bold text-navy">{analytics.passed}</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <p className="text-xs text-text-secondary">NDAs Signed</p>
              <p className="text-2xl font-bold text-navy">{analytics.ndaSigned}</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <p className="text-xs text-text-secondary">IOIs Submitted</p>
              <p className="text-2xl font-bold text-navy">{analytics.ioisSubmitted}</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <p className="text-xs text-text-secondary">LOIs Submitted</p>
              <p className="text-2xl font-bold text-navy">{analytics.loisSubmitted}</p>
            </div>
          </div>
        )}

        {analytics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow-md p-4">
              <p className="text-xs text-text-secondary">Avg Revenue (Pursued)</p>
              <p className="text-lg font-bold text-navy">
                {analytics.avgRevenue != null ? formatCurrency(analytics.avgRevenue) : "—"}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <p className="text-xs text-text-secondary">Avg EBITDA (Pursued)</p>
              <p className="text-lg font-bold text-navy">
                {analytics.avgEbitda != null ? formatCurrency(analytics.avgEbitda) : "—"}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <p className="text-xs text-text-secondary">Avg Revenue (Matched)</p>
              <p className="text-lg font-bold text-navy">
                {analytics.avgMatchedRevenue != null ? formatCurrency(analytics.avgMatchedRevenue) : "—"}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <p className="text-xs text-text-secondary">Avg EBITDA (Matched)</p>
              <p className="text-lg font-bold text-navy">
                {analytics.avgMatchedEbitda != null ? formatCurrency(analytics.avgMatchedEbitda) : "—"}
              </p>
            </div>
          </div>
        )}

        {/* Deals by Industry / Stage */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="text-sm font-medium text-text-primary mb-3">Deals by Stage</h3>
              {Object.entries(analytics.dealsByStage).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(analytics.dealsByStage).map(([stage, count]) => (
                    <div key={stage} className="flex justify-between text-sm">
                      <span className="text-text-secondary capitalize">{stage.replace(/_/g, " ")}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-secondary">No active engagements.</p>
              )}
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="text-sm font-medium text-text-primary mb-3">Deals by Industry</h3>
              {Object.entries(analytics.dealsByIndustry).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(analytics.dealsByIndustry).map(([industry, count]) => (
                    <div key={industry} className="flex justify-between text-sm">
                      <span className="text-text-secondary">{industry}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-secondary">No data yet.</p>
              )}
            </div>
          </div>
        )}

        {/* Recent Activity Feed */}
        {activity.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-4 mb-8">
            <h3 className="text-sm font-medium text-text-primary mb-3">Recent Activity</h3>
            <div className="space-y-2">
              {activity.slice(0, 10).map((item) => (
                <div key={item.id} className="flex justify-between text-sm border-b border-border-gray pb-2 last:border-0">
                  <span className="text-text-secondary capitalize">{item.action.replace(/_/g, " ")}</span>
                  <span className="text-xs text-text-secondary">{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Project Tiles */}
        <h2 className="text-lg font-semibold text-navy mb-4">Your Projects</h2>

        {projects.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-text-secondary mb-4">Create your first acquisition project</p>
            <a
              href="/projects/new"
              className="px-6 py-2 bg-navy text-white rounded-md text-sm font-medium hover:bg-slate-blue"
            >
              Create Project
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <a
                key={project.id}
                href={`/projects/${project.id}`}
                className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-navy">{project.name}</h3>
                </div>
                <div className="space-y-1 text-xs text-text-secondary">
                  {project.industry && <p>Industry: {project.industry}</p>}
                  {project.location && <p>Location: {project.location}</p>}
                  {(project.revenue_min || project.revenue_max) && (
                    <p>
                      Revenue: {project.revenue_min ? formatCurrency(project.revenue_min) : "Any"} – {project.revenue_max ? formatCurrency(project.revenue_max) : "Any"}
                    </p>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
