import type { ProjectCreateData } from "@/lib/validators";

export const mapProjectDataToDb = (data: ProjectCreateData) => ({
  name: data.projectName,
  industry: data.industry || null,
  revenue_min: data.revenueMin ?? null,
  revenue_max: data.revenueMax ?? null,
  ebitda_min: data.ebitdaMin ?? null,
  ebitda_max: data.ebitdaMax ?? null,
  ebitda_margin: data.ebitdaMargin ?? null,
  location: data.location || null,
  keywords: data.keywords || [],
});
