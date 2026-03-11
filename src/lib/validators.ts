import { z } from "zod";
import { FILE_CONSTRAINTS } from "./constants";

export const fileValidation = z.object({
  size: z.number().max(FILE_CONSTRAINTS.MAX_SIZE_BYTES, "File must be under 50MB"),
  type: z.enum(["application/pdf"], { message: "Only PDF files are allowed" }),
});

export const brokerSignupSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  firmName: z.string().min(1, "Firm name is required"),
  firmWebsite: z.string().url("Valid URL is required"),
  location: z.string().min(1, "Location is required"),
  licenseCredentials: z.string().min(1, "License and credentials are required"),
  companyDescription: z.string().min(1, "Company description is required"),
  dealTypes: z.string().min(1, "Types of deals is required"),
  industryFocus: z.array(z.string()).min(1, "Select at least one industry"),
  otherMembers: z.string().optional(),
  membershipAgreementSigned: z.literal(true, {
    errorMap: () => ({ message: "You must sign the membership agreement" }),
  }),
});

export const buyerSignupSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  companyName: z.string().min(1, "Company name is required"),
  companyWebsite: z.string().url("Valid URL is required"),
  location: z.string().min(1, "Location is required"),
  buyerType: z.enum(["pe", "independent_sponsor", "family_office", "search_fund", "private_investor", "other"]),
  companyDescription: z.string().min(1, "Company description is required"),
  industryFocus: z.array(z.string()).min(1, "Select at least one industry"),
  aum: z.string().min(1, "Assets under management is required"),
  otherMembers: z.string().optional(),
  membershipAgreementSigned: z.literal(true, {
    errorMap: () => ({ message: "You must sign the membership agreement" }),
  }),
});

export type BrokerSignupData = z.infer<typeof brokerSignupSchema>;
export type BuyerSignupData = z.infer<typeof buyerSignupSchema>;

// Deal schemas
const financialYearSchema = z.object({
  label: z.string().optional(),
  revenue: z.number().nullable().optional(),
  ebitda: z.number().nullable().optional(),
});

export const dealCreateSchema = z.object({
  projectName: z.string().min(1, "Project name is required"),
  headline: z.string().min(1, "Headline is required"),
  description: z.string().min(1, "Description is required"),
  geographyDisplay: z.enum(["state", "region"]),
  state: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  industry: z.string().min(1, "Industry is required"),
  financials: z.object({
    year1: financialYearSchema.optional(),
    year2: financialYearSchema.optional(),
    year3: financialYearSchema.optional(),
    projection: financialYearSchema.optional(),
  }).optional(),
  ndaType: z.enum(["platform", "custom"]).default("platform"),
  cimSharingPreference: z.enum(["auto", "manual"]).default("auto"),
  ndaVettingPreference: z.enum(["auto", "manual"]).default("auto"),
  pointOfContactId: z.string().uuid().optional(),
  teaserDocumentPath: z.string().nullable().optional(),
  ndaDocumentPath: z.string().nullable().optional(),
  cimDocumentPath: z.string().nullable().optional(),
  ioiDueDate: z.string().nullable().optional(),
  loiDueDate: z.string().nullable().optional(),
});

export const dealPublishSchema = dealCreateSchema.extend({
  teaserDocumentPath: z.string().min(1, "Teaser is required to publish"),
  cimDocumentPath: z.string().min(1, "CIM is required to publish"),
});

export type DealCreateData = z.infer<typeof dealCreateSchema>;
export type DealPublishData = z.infer<typeof dealPublishSchema>;

// Project schemas
export const projectCreateSchema = z.object({
  projectName: z.string().min(1, "Project name is required"),
  industry: z.string().nullable().optional(),
  revenueMin: z.number().nullable().optional(),
  revenueMax: z.number().nullable().optional(),
  ebitdaMin: z.number().nullable().optional(),
  ebitdaMax: z.number().nullable().optional(),
  ebitdaMargin: z.number().nullable().optional(),
  location: z.string().nullable().optional(),
  keywords: z.array(z.string()).optional(),
});

export type ProjectCreateData = z.infer<typeof projectCreateSchema>;

// IOI schemas
export const ioiSubmitSchema = z.object({
  offerPrice: z.number().positive("Offer price is required"),
  multiple: z.number().positive("Multiple is required"),
  earnout: z.string().min(1, "Earnout is required"),
  rollover: z.string().min(1, "Rollover is required"),
  cashAtClose: z.number().positive("Cash at close is required"),
  timeToClose: z.string().min(1, "Time to close is required"),
  isPlatform: z.boolean(),
  isAddon: z.boolean(),
  addonPlatformUrl: z.string().nullable().optional(),
  escrow: z.string().nullable().optional(),
  workingCapitalPeg: z.string().nullable().optional(),
  specialConsiderations: z.string().nullable().optional(),
}).refine(
  (data) => !data.isAddon || (data.addonPlatformUrl && data.addonPlatformUrl.length > 0),
  { message: "Platform company website URL is required for add-on", path: ["addonPlatformUrl"] }
);

export type IOISubmitData = z.infer<typeof ioiSubmitSchema>;

// LOI schemas
export const loiSubmitSchema = z.object({
  offerPrice: z.number().positive("Offer price is required"),
  multiple: z.number().positive("Multiple is required"),
  escrow: z.string().min(1, "Escrow is required"),
  timing: z.string().min(1, "Timing is required"),
  earnout: z.string().min(1, "Earnout is required"),
  rollover: z.string().min(1, "Rollover is required"),
  workingCapitalPeg: z.string().min(1, "Working capital peg is required"),
  cashAtClose: z.number().positive("Cash at close is required"),
  isPlatform: z.boolean(),
  isAddon: z.boolean(),
  addonPlatformUrl: z.string().nullable().optional(),
  specialConsiderations: z.string().nullable().optional(),
}).refine(
  (data) => !data.isAddon || (data.addonPlatformUrl && data.addonPlatformUrl.length > 0),
  { message: "Platform company website URL is required for add-on", path: ["addonPlatformUrl"] }
);

export type LOISubmitData = z.infer<typeof loiSubmitSchema>;
