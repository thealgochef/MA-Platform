import type { DealCreateData } from "@/lib/validators";

type DealDbData = Record<string, unknown>;

export function mapDealCreateDataToDb(
  data: DealCreateData,
  { firmId, userId }: { firmId: string | null; userId: string }
): DealDbData {
  const dealData: DealDbData = {
    firm_id: firmId,
    created_by: userId,
    point_of_contact_id: data.pointOfContactId || userId,
    project_name: data.projectName,
    headline: data.headline,
    description: data.description,
    geography_display: data.geographyDisplay,
    state: data.state || null,
    region: data.region || null,
    industry: data.industry,
    nda_type: data.ndaType,
    nda_document_path: null,
    cim_document_path: null,
    cim_sharing_preference: data.cimSharingPreference,
    nda_vetting_preference: data.ndaVettingPreference,
    teaser_document_path: null,
    ioi_due_date: data.ioiDueDate || null,
    loi_due_date: data.loiDueDate || null,
    status: "draft",
  };

  mapDealFinancialsToDb(data.financials, dealData, { partial: false });

  return dealData;
}

export function mapDealUpdateDataToDb(data: Partial<DealCreateData>): DealDbData {
  const updateData: DealDbData = {};

  if (data.projectName !== undefined) updateData.project_name = data.projectName;
  if (data.headline !== undefined) updateData.headline = data.headline;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.geographyDisplay !== undefined) updateData.geography_display = data.geographyDisplay;
  if (data.state !== undefined) updateData.state = data.state;
  if (data.region !== undefined) updateData.region = data.region;
  if (data.industry !== undefined) updateData.industry = data.industry;
  if (data.ndaType !== undefined) updateData.nda_type = data.ndaType;
  if (data.ndaDocumentPath !== undefined) updateData.nda_document_path = data.ndaDocumentPath;
  if (data.cimDocumentPath !== undefined) updateData.cim_document_path = data.cimDocumentPath;
  if (data.cimSharingPreference !== undefined) updateData.cim_sharing_preference = data.cimSharingPreference;
  if (data.ndaVettingPreference !== undefined) updateData.nda_vetting_preference = data.ndaVettingPreference;
  if (data.teaserDocumentPath !== undefined) updateData.teaser_document_path = data.teaserDocumentPath;
  if (data.pointOfContactId !== undefined) updateData.point_of_contact_id = data.pointOfContactId;
  if (data.ioiDueDate !== undefined) updateData.ioi_due_date = data.ioiDueDate;
  if (data.loiDueDate !== undefined) updateData.loi_due_date = data.loiDueDate;

  mapDealFinancialsToDb(data.financials, updateData, { partial: true });

  return updateData;
}

function mapDealFinancialsToDb(
  financials: DealCreateData["financials"] | undefined,
  dbData: DealDbData,
  { partial }: { partial: boolean }
) {
  if (!financials) return;

  if (!partial || financials.year1) {
    dbData.revenue_year_1 = financials.year1?.revenue ?? null;
    dbData.ebitda_year_1 = financials.year1?.ebitda ?? null;
  }
  if (!partial || financials.year2) {
    dbData.revenue_year_2 = financials.year2?.revenue ?? null;
    dbData.ebitda_year_2 = financials.year2?.ebitda ?? null;
  }
  if (!partial || financials.year3) {
    dbData.revenue_year_3 = financials.year3?.revenue ?? null;
    dbData.ebitda_year_3 = financials.year3?.ebitda ?? null;
  }
  if (!partial || financials.projection) {
    dbData.revenue_projection = financials.projection?.revenue ?? null;
    dbData.ebitda_projection = financials.projection?.ebitda ?? null;
  }

  dbData.fiscal_year_labels = {
    year_1: financials.year1?.label || "",
    year_2: financials.year2?.label || "",
    year_3: financials.year3?.label || "",
    projection: financials.projection?.label || "",
  };
}
