// Deal-to-project matching algorithm
// Full implementation in Phase 4

export interface MatchCriteria {
  industry?: string;
  revenueMin?: number;
  revenueMax?: number;
  ebitdaMin?: number;
  ebitdaMax?: number;
  ebitdaMargin?: number;
  location?: string;
  keywords?: string[];
}

export interface DealForMatching {
  id: string;
  industry: string;
  state?: string;
  region?: string;
  revenueYear3?: number;
  ebitdaYear3?: number;
  headline: string;
  description: string;
  status: string;
}

export function matchDealsToProject(
  deals: DealForMatching[],
  criteria: MatchCriteria
): DealForMatching[] {
  return deals.filter((deal) => {
    const activeStatuses = ["accepting_iois", "accepting_lois", "under_loi"];
    if (!activeStatuses.includes(deal.status)) return false;

    if (criteria.industry && deal.industry !== criteria.industry) return false;

    if (criteria.revenueMin != null && deal.revenueYear3 != null && deal.revenueYear3 < criteria.revenueMin) return false;
    if (criteria.revenueMax != null && deal.revenueYear3 != null && deal.revenueYear3 > criteria.revenueMax) return false;

    if (criteria.ebitdaMin != null && deal.ebitdaYear3 != null && deal.ebitdaYear3 < criteria.ebitdaMin) return false;
    if (criteria.ebitdaMax != null && deal.ebitdaYear3 != null && deal.ebitdaYear3 > criteria.ebitdaMax) return false;

    if (criteria.ebitdaMargin != null && deal.revenueYear3 && deal.ebitdaYear3) {
      const margin = (deal.ebitdaYear3 / deal.revenueYear3) * 100;
      if (margin < criteria.ebitdaMargin) return false;
    }

    if (criteria.location && deal.state !== criteria.location) return false;

    if (criteria.keywords && criteria.keywords.length > 0) {
      const searchText = `${deal.headline} ${deal.description}`.toLowerCase();
      const hasMatch = criteria.keywords.some((kw) =>
        searchText.includes(kw.toLowerCase())
      );
      if (!hasMatch) return false;
    }

    return true;
  });
}
