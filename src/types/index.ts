export type UserRole = "broker" | "buyer" | "admin";
export type UserStatus = "pending" | "approved" | "rejected" | "suspended" | "banned";
export type BuyerType = "family_office" | "pe" | "vc" | "search_fund" | "independent_sponsor" | "holding_company" | "ma_advisor" | "individual_investor" | "other";
export type BuyerAccreditation = "income" | "net_worth" | "entity" | "professional" | "none";
export type FirmType = "broker" | "buyer";

export type DealStatus = "draft" | "accepting_iois" | "accepting_lois" | "under_loi" | "paused" | "closed" | "terminated";
export type GeographyDisplay = "state" | "region";
export type NdaType = "platform" | "custom";
export type CimSharingPreference = "auto" | "manual";
export type NdaVettingPreference = "auto" | "manual";

export type EngagementStage = "pursued" | "nda_pending" | "nda_signed" | "reviewing" | "ioi_submitted" | "loi_submitted" | "diligence" | "closed" | "passed" | "declined" | "terminated";
export type NdaStatus = "not_sent" | "pending_review" | "sent" | "signed" | "declined" | "rejected";
export type VettingStatus = "not_required" | "pending" | "approved" | "rejected";
export type DocumentAccessLevel = "pre_nda" | "post_nda";

export interface Firm {
  id: string;
  name: string;
  website?: string;
  description?: string;
  location?: string;
  industry_focus: string[];
  firm_type: FirmType;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  firm_id?: string;
  full_name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  title?: string;
  avatar_path?: string;
  location?: string;
  buyer_type?: BuyerType;
  accreditation?: BuyerAccreditation;
  aum?: string;
  license_credentials?: string;
  deal_types?: string;
  industry_focus: string[];
  membership_agreement_signed: boolean;
  membership_agreement_signed_at?: string;
  invited_by?: string;
  invitation_token?: string;
  created_at: string;
  updated_at: string;
}

export interface Deal {
  id: string;
  firm_id: string;
  created_by: string;
  point_of_contact_id: string;
  project_name: string;
  headline: string;
  description: string;
  geography_display: GeographyDisplay;
  state?: string;
  region?: string;
  industry: string;
  revenue_year_1?: number;
  ebitda_year_1?: number;
  revenue_year_2?: number;
  ebitda_year_2?: number;
  revenue_year_3?: number;
  ebitda_year_3?: number;
  revenue_projection?: number;
  ebitda_projection?: number;
  fiscal_year_labels?: Record<string, string>;
  status: DealStatus;
  ioi_due_date?: string;
  loi_due_date?: string;
  nda_type: NdaType;
  nda_document_path?: string;
  cim_document_path?: string;
  cim_sharing_preference: CimSharingPreference;
  nda_vetting_preference: NdaVettingPreference;
  teaser_document_path?: string;
  is_featured: boolean;
  view_count: number;
  published_at?: string;
  closed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DealEngagement {
  id: string;
  deal_id: string;
  buyer_user_id: string;
  buyer_firm_id: string;
  stage: EngagementStage;
  nda_status: NdaStatus;
  nda_signed_at?: string;
  nda_document_path?: string;
  cim_released: boolean;
  cim_released_at?: string;
  cim_viewed_at?: string;
  cim_downloaded_at?: string;
  pass_reason?: string;
  pass_reason_detail?: string;
  declined_at?: string;
  vetting_status: VettingStatus;
  vetting_rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface BuyerProject {
  id: string;
  buyer_user_id: string;
  buyer_firm_id: string;
  name: string;
  industry?: string;
  revenue_min?: number;
  revenue_max?: number;
  ebitda_min?: number;
  ebitda_max?: number;
  ebitda_margin?: number;
  location?: string;
  keywords: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IOI {
  id: string;
  deal_id: string;
  engagement_id: string;
  buyer_user_id: string;
  buyer_firm_id: string;
  offer_price: number;
  multiple: number;
  earnout: string;
  rollover: string;
  cash_at_close: number;
  time_to_close: string;
  is_platform: boolean;
  is_addon: boolean;
  addon_platform_url?: string;
  escrow?: string;
  working_capital_peg?: string;
  special_considerations?: string;
  submitted_at: string;
  created_at: string;
}

export interface LOI {
  id: string;
  deal_id: string;
  engagement_id: string;
  buyer_user_id: string;
  buyer_firm_id: string;
  offer_price: number;
  multiple: number;
  escrow: string;
  timing: string;
  earnout: string;
  rollover: string;
  working_capital_peg: string;
  cash_at_close: number;
  is_platform: boolean;
  is_addon: boolean;
  addon_platform_url?: string;
  special_considerations?: string;
  submitted_at: string;
  created_at: string;
}

export interface DealClosure {
  id: string;
  deal_id: string;
  engagement_id: string;
  buyer_user_id: string;
  buyer_firm_id: string;
  broker_firm_id: string;
  enterprise_value: number;
  buyer_confirmed: boolean;
  broker_confirmed: boolean;
  broker_disputed: boolean;
  dispute_documents_path?: string;
  success_fee?: number;
  broker_incentive?: number;
  closed_at: string;
  created_at: string;
}

export interface Message {
  id: string;
  deal_id: string;
  engagement_id: string;
  sender_id: string;
  content?: string;
  attachment_path?: string;
  attachment_name?: string;
  created_at: string;
}
