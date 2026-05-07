export const INDUSTRIES = [
  "Aerospace & Defense",
  "Agriculture",
  "Automotive",
  "Business Services",
  "Chemicals",
  "Construction",
  "Consumer Products",
  "Distribution",
  "Education",
  "Energy",
  "Engineering",
  "Environmental Services",
  "Financial Services",
  "Food & Beverage",
  "Government",
  "Healthcare",
  "Hospitality",
  "Industrial",
  "Information Technology",
  "Insurance",
  "Logistics & Transportation",
  "Manufacturing",
  "Media & Entertainment",
  "Mining & Metals",
  "Pharmaceuticals",
  "Real Estate",
  "Retail",
  "Technology",
  "Telecommunications",
  "Utilities",
  "Other",
] as const;

export const REGIONS = [
  "Midwest",
  "Southeast",
  "Northeast",
  "Southwest",
  "West",
  "Mid-Atlantic",
  "Northwest",
  "Other",
] as const;

export const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California",
  "Colorado", "Connecticut", "Delaware", "Florida", "Georgia",
  "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
  "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri",
  "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
  "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina",
  "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
  "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
] as const;

const valuesFromReadonlyObjects = <T extends readonly { value: string }[]>(items: T) =>
  items.map(({ value }) => value) as {
    readonly [K in keyof T]: T[K] extends { value: infer V } ? V : never;
  };

export const BUYER_TYPES = [
  { value: "family_office", label: "Family Office" },
  { value: "pe", label: "Private Equity" },
  { value: "vc", label: "Venture Capital" },
  { value: "search_fund", label: "Search Fund" },
  { value: "independent_sponsor", label: "Independent Sponsor" },
  { value: "holding_company", label: "Holding Company / Corporate M&A" },
  { value: "ma_advisor", label: "M&A Advisor" },
  { value: "private_investor", label: "Private Investor" },
  { value: "other", label: "Other" },
] as const;

export const ACCREDITATIONS = [
  { value: "income", label: "My income exceeds $200K annually (or $300K with spouse)" },
  { value: "net_worth", label: "My net worth exceeds $1M (excluding primary residence)" },
  { value: "entity", label: "I represent a qualified entity (trust, fund, or institution with $5M+ in assets)" },
  { value: "professional", label: "I hold a FINRA Series 7, 65, or 82 license in good standing" },
  { value: "none", label: "I am not an accredited investor" },
] as const;
export const BUYER_TYPE_VALUES = valuesFromReadonlyObjects(BUYER_TYPES);

export const DEAL_STATUSES = [
  "draft",
  "accepting_iois",
  "accepting_lois",
  "under_loi",
  "paused",
  "closed",
  "terminated",
] as const;

export const ACTIVE_DEAL_STATUSES = [
  "accepting_iois",
  "accepting_lois",
  "under_loi",
] as const;

export const DEAL_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  accepting_iois: "Accepting IOIs",
  accepting_lois: "Accepting LOIs",
  under_loi: "Under LOI",
  paused: "Paused",
  closed: "Closed",
  terminated: "Terminated",
};

export const VALID_DEAL_TRANSITIONS: Record<string, string[]> = {
  draft: ["accepting_iois"],
  accepting_iois: ["accepting_lois", "paused", "terminated"],
  accepting_lois: ["under_loi", "paused", "terminated"],
  under_loi: ["closed", "paused", "terminated"],
  paused: ["accepting_iois", "accepting_lois", "under_loi", "terminated"],
  terminated: [],
  closed: [],
};

export const ENGAGEMENT_STAGES = [
  // pre-nda stages
  "declined",
  "pursued", 
  // nda stage
  "nda_pending",
  "nda_signed",
  // post-nda stages
  "reviewing",
  "passed",
  "ioi_submitted",
  "loi_submitted",
  "diligence",
  // end stages
  "closed",
  "terminated",
] as const;

export const NDA_STATUSES = [
  "not_sent",
  "pending_review",
  "sent",
  "signed",
  "declined",
  "rejected",
] as const;

export const PASS_REASONS = [
  "Not an industry fit",
  "Not a business fit",
  "Financial profile",
  "Valuation expectations",
  "Failed bid",
  "Other",
] as const;

export const VETTING_REJECTION_REASONS = [
  "Not an industry fit",
  "Not a financial fit",
  "Not the right partner",
  "Other",
] as const;

export const USER_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "suspended",
  "banned",
] as const;

export const FILE_CONSTRAINTS = {
  MAX_SIZE_BYTES: 50 * 1024 * 1024, // 50MB
  ALLOWED_TYPES: ["application/pdf"],
  ALLOWED_EXTENSION: ".pdf",
} as const;

export const SIGNED_NDA_ARTIFACT_CONSTRAINTS = {
  ALLOWED_TYPE: "application/json",
  ALLOWED_EXTENSION: ".json",
} as const;

export const FEE_RATES = {
  SUCCESS_FEE: 0.0125, // 1.25%
  BROKER_INCENTIVE: 0.0025, // 0.25%
} as const;

export const BROKER_NOTIFICATION_EVENTS = [
  { key: "buyer_pursued_deal", label: "Buyer pursued deal" },
  { key: "buyer_pending_review", label: "Buyer pending review" },
  { key: "nda_signed", label: "NDA signed" },
  { key: "nda_declined", label: "NDA declined" },
  { key: "ioi_submitted", label: "IOI submitted" },
  { key: "loi_submitted", label: "LOI submitted" },
  { key: "buyer_passed", label: "Buyer passed" },
  { key: "buyer_declined", label: "Buyer declined" },
  { key: "deal_close_reported", label: "Deal close reported" },
  { key: "new_message", label: "New message" },
  { key: "deal_status_changed_by_admin", label: "Deal status changed by admin" },
  { key: "pending_action_reminder", label: "Pending action reminder" },
] as const;

export const BUYER_NOTIFICATION_EVENTS = [
  { key: "new_matched_deal", label: "New matched deal" },
  { key: "nda_sent", label: "NDA sent" },
  { key: "nda_approved", label: "NDA approved" },
  { key: "nda_rejected", label: "NDA rejected" },
  { key: "cim_released", label: "CIM released" },
  { key: "deal_status_changed", label: "Deal status changed" },
  { key: "deal_terminated", label: "Deal terminated" },
  { key: "new_message", label: "New message" },
  { key: "pending_action_reminder", label: "Pending action reminder" },
] as const;
