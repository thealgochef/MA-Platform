import { NextResponse } from "next/server";
import { isAuthResponse, requireRole } from "@/server/auth";

type DealSummaryRow = {
  id: string;
  headline: string;
  industry: string;
  status: string;
  revenue_year_3: number | null;
  ebitda_year_3: number | null;
  state: string | null;
  region: string | null;
  geography_display: string | null;
  published_at: string | null;
};

type EngagementRow = {
  id: string;
  stage: string;
  nda_status: string;
  created_at: string;
  updated_at: string | null;
  project_id: string | null;
  deals: DealSummaryRow;
};

type BuyerProjectRow = {
  id: string;
  name: string;
};

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

function getActivityTimestamp(engagement: Pick<EngagementRow, "updated_at" | "created_at">): number {
  const raw = engagement.updated_at ?? engagement.created_at;
  const parsed = new Date(raw).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

export async function GET() {
  try {
    const context = await requireRole("buyer");
    if (isAuthResponse(context)) return context;

    const { supabase, user } = context;

    const { data: engagementRows, error: engagementsError } = await supabase
      .from("deal_engagements")
      .select(`
        id,
        stage,
        nda_status,
        created_at,
        updated_at,
        project_id,
        deals!inner (
          id,
          headline,
          industry,
          status,
          revenue_year_3,
          ebitda_year_3,
          state,
          region,
          geography_display,
          published_at
        )
      `)
      .eq("buyer_user_id", user.id);

    if (engagementsError) {
      console.error("Failed to fetch buyer engagements", {
        userId: user.id,
        error: engagementsError,
      });
      return NextResponse.json(
        { error: "Failed to fetch engagements" },
        { status: 500, headers: NO_STORE_HEADERS }
      );
    }

    const engagements = (engagementRows || []) as EngagementRow[];
    const projectIds = Array.from(
      new Set(engagements.map((engagement) => engagement.project_id).filter((id): id is string => Boolean(id)))
    );

    const projectNameById = new Map<string, string>();

    if (projectIds.length > 0) {
      const { data: buyerProjects, error: buyerProjectsError } = await supabase
        .from("buyer_projects")
        .select("id, name")
        .eq("buyer_user_id", user.id)
        .in("id", projectIds);

      if (buyerProjectsError) {
        console.error("Failed to fetch buyer projects for engagements", {
          userId: user.id,
          error: buyerProjectsError,
        });
        return NextResponse.json(
          { error: "Failed to fetch engagements" },
          { status: 500, headers: NO_STORE_HEADERS }
        );
      }

      for (const project of (buyerProjects || []) as BuyerProjectRow[]) {
        projectNameById.set(project.id, project.name);
      }
    }

    const responseEngagements = engagements
      .map((engagement) => {
        const hasOwnedProject = engagement.project_id ? projectNameById.has(engagement.project_id) : false;
        const ownedProjectName = hasOwnedProject && engagement.project_id
          ? (projectNameById.get(engagement.project_id) ?? null)
          : null;

        return {
          id: engagement.id,
          stage: engagement.stage,
          nda_status: engagement.nda_status,
          created_at: engagement.created_at,
          updated_at: engagement.updated_at,
          project_id: hasOwnedProject ? engagement.project_id : null,
          project_name: hasOwnedProject ? ownedProjectName : null,
          deal: {
            id: engagement.deals.id,
            headline: engagement.deals.headline,
            industry: engagement.deals.industry,
            status: engagement.deals.status,
            revenue_year_3: engagement.deals.revenue_year_3,
            ebitda_year_3: engagement.deals.ebitda_year_3,
            geography:
              engagement.deals.geography_display === "state"
                ? engagement.deals.state
                : engagement.deals.region,
            geography_display: engagement.deals.geography_display,
            published_at: engagement.deals.published_at,
          },
        };
      })
      .sort((a, b) => getActivityTimestamp(b) - getActivityTimestamp(a));

    return NextResponse.json({ engagements: responseEngagements }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("Unexpected error fetching buyer engagements", { error });
    return NextResponse.json(
      { error: "Failed to fetch engagements" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
