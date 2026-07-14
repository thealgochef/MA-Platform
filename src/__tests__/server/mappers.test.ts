import { describe, expect, it, vi } from "vitest";
import { logDealActivity } from "@/server/activity-log";
import { mapDealCreateDataToDb, mapDealUpdateDataToDb } from "@/server/deals/mappers";
import { mapProjectDataToDb } from "@/server/projects/mappers";

describe("server mappers", () => {
  it("stores a single trimmed industry string for create mapping when industry input is an array", () => {
    const mapped = mapDealCreateDataToDb(
      {
        projectName: "Project Atlas",
        headline: "Headline",
        description: "Description",
        geographyDisplay: "state",
        state: "CA",
        industry: ["  ", " Healthcare ", "Industrial"],
        ndaType: "platform",
        cimSharingPreference: "auto",
        ndaVettingPreference: "manual",
        financials: {
          year1: { label: "FY22", revenue: 10, ebitda: 2 },
          year2: { label: "FY23", revenue: 12, ebitda: 3 },
          year3: { label: "FY24", revenue: 14, ebitda: 4 },
          projection: { label: "FY25", revenue: 16, ebitda: 5 },
        },
      } as never,
      { firmId: "firm-1", userId: "user-1" }
    );

    expect(mapped.industry).toBe("Healthcare");
  });

  it("stores the first valid trimmed industry for update mapping when industry input is an array", () => {
    const mapped = mapDealUpdateDataToDb({
      industry: ["", "  Industrial  ", "Healthcare"],
    } as never);

    expect(mapped).toMatchObject({ industry: "Industrial" });
  });

  it("preserves partial update behavior for industry (undefined omitted, explicit empty/invalid normalized to null)", () => {
    const omittedIndustry = mapDealUpdateDataToDb({ headline: "Updated" });
    expect(omittedIndustry).not.toHaveProperty("industry");

    const blankIndustry = mapDealUpdateDataToDb({ industry: "   " } as never);
    expect(blankIndustry).toMatchObject({ industry: null });

    const invalidIndustryArray = mapDealUpdateDataToDb({ industry: ["", "   "] } as never);
    expect(invalidIndustryArray).toMatchObject({ industry: null });
  });

  it("maps deal financials while preserving zero and null values", () => {
    const mapped = mapDealCreateDataToDb(
      {
        projectName: "Project Zero",
        headline: "Headline",
        description: "Description",
        geographyDisplay: "state",
        state: "CA",
        industry: "Software",
        ndaType: "platform",
        cimSharingPreference: "auto",
        ndaVettingPreference: "manual",
        financials: {
          year1: { label: "FY22", revenue: 0, ebitda: null },
          year2: { label: "FY23", revenue: null, ebitda: 0 },
          year3: { label: "FY24", revenue: 10, ebitda: 5 },
          projection: { label: "FY25", revenue: 0, ebitda: 0 },
        },
      },
      { firmId: "firm-1", userId: "user-1" }
    );

    expect(mapped).toMatchObject({
      revenue_year_1: 0,
      ebitda_year_1: null,
      revenue_year_2: null,
      ebitda_year_2: 0,
      revenue_projection: 0,
      ebitda_projection: 0,
      fiscal_year_labels: {
        year_1: "FY22",
        year_2: "FY23",
        year_3: "FY24",
        projection: "FY25",
      },
    });
  });

  it("maps deal document paths only when validated data includes them", () => {
    expect(mapDealUpdateDataToDb({ headline: "Updated" })).not.toHaveProperty("teaser_document_path");

    expect(
      mapDealUpdateDataToDb({
        teaserDocumentPath: "deal-id/teaser.pdf",
        cimDocumentPath: null,
        ndaDocumentPath: "deal-id/nda.pdf",
      })
    ).toMatchObject({
      teaser_document_path: "deal-id/teaser.pdf",
      cim_document_path: null,
      nda_document_path: "deal-id/nda.pdf",
    });
  });

  it("maps project numeric zero values without converting them to null", () => {
    expect(
      mapProjectDataToDb({
        projectName: "Buyout thesis",
        industry: "Services",
        revenueMin: 0,
        revenueMax: 0,
        ebitdaMin: 0,
        ebitdaMax: 0,
        ebitdaMargin: 0,
        location: "US",
        keywords: [],
      })
    ).toMatchObject({
      revenue_min: 0,
      revenue_max: 0,
      ebitda_min: 0,
      ebitda_max: 0,
      ebitda_margin: 0,
    });
  });
});

describe("logDealActivity", () => {
  it("inserts the expected activity-log row", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const supabase = {
      from: vi.fn().mockReturnValue({ insert }),
    };

    await logDealActivity(supabase as never, {
      dealId: "deal-1",
      actorId: "user-1",
      action: "deal_updated",
      metadata: { fields: ["headline"] },
    });

    expect(supabase.from).toHaveBeenCalledWith("deal_activity_log");
    expect(insert).toHaveBeenCalledWith({
      deal_id: "deal-1",
      actor_id: "user-1",
      action: "deal_updated",
      metadata: { fields: ["headline"] },
    });
  });
});
