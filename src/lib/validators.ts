import { z } from "zod";
import {
  BROKER_NOTIFICATION_EVENTS,
  BUYER_NOTIFICATION_EVENTS,
  BUYER_TYPE_VALUES,
  DEAL_STATUSES,
  FILE_CONSTRAINTS,
  PASS_REASONS,
  VETTING_REJECTION_REASONS,
} from "./constants";

type NonEmptyTuple<T> = readonly [T, ...T[]];

const buyerTypeValues = BUYER_TYPE_VALUES as NonEmptyTuple<(typeof BUYER_TYPE_VALUES)[number]>;
const dealStatusValues = DEAL_STATUSES as NonEmptyTuple<(typeof DEAL_STATUSES)[number]>;
const passReasonValues = PASS_REASONS as NonEmptyTuple<(typeof PASS_REASONS)[number]>;
const vettingRejectionReasonValues = VETTING_REJECTION_REASONS as NonEmptyTuple<(typeof VETTING_REJECTION_REASONS)[number]>;
const notificationEventKeys = [
  ...BROKER_NOTIFICATION_EVENTS.map(({ key }) => key),
  ...BUYER_NOTIFICATION_EVENTS.map(({ key }) => key),
] as const;

const optionalTrimmedString = (max = 255) => z.string().trim().max(max).optional().nullable();
const MAX_ENTERPRISE_VALUE = 1_000_000_000_000;

export const isValidStorageObjectKey = (
  value: string,
  options: { requirePdf?: boolean; allowedPrefixes?: readonly string[] } = {}
) => {
  const normalizedAllowedPrefixes = options.allowedPrefixes?.map((prefix) => prefix.replace(/^\/+/, ""));

  if (!value || value.startsWith("/") || value.includes("\\") || value.includes("?") || value.includes("#")) {
    return false;
  }
  if (/[\u0000-\u001F\u007F]/.test(value) || value.split("/").some((segment) => !segment || segment === "..")) {
    return false;
  }
  if (options.requirePdf && !value.toLowerCase().endsWith(FILE_CONSTRAINTS.ALLOWED_EXTENSION)) {
    return false;
  }
  if (normalizedAllowedPrefixes?.length) {
    return normalizedAllowedPrefixes.some((prefix) => value === prefix || value.startsWith(`${prefix}/`));
  }
  return true;
};

export const storageObjectKeySchema = (fieldName: string, options: { requirePdf?: boolean } = {}) => z.string().trim().min(1, `${fieldName} is required`).refine(
  (value) => isValidStorageObjectKey(value, options),
  `${fieldName} must be a safe${options.requirePdf ? " PDF" : ""} storage object path`
);
const pdfString = (fieldName: string) => z.string().trim().min(1, `${fieldName} is required`).refine(
  (value) => value.toLowerCase().endsWith(FILE_CONSTRAINTS.ALLOWED_EXTENSION),
  "Only PDF files are allowed (application/pdf)"
);
const finiteNonnegativeQueryNumber = z.preprocess(
  (value) => (value === undefined || value === null || value === "" ? undefined : Number(value)),
  z.number().finite().nonnegative().optional()
);

export const fileValidation = z.object({
  size: z.number().max(FILE_CONSTRAINTS.MAX_SIZE_BYTES, "File must be under 50MB"),
  type: z.enum(FILE_CONSTRAINTS.ALLOWED_TYPES, { message: "Only PDF files are allowed" }),
});

export const brokerSignupSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  title: z.string().min(1, "Title is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  linkedIn: z.union([z.string().url("Valid URL is required"), z.literal("")]).optional(),
  firmName: z.string().min(1, "Firm name is required"),
  firmWebsite: z.union([z.string().url("Valid URL is required"), z.literal("")]).optional(),
  location: z.string().min(1, "Location is required"),
  licenseCredentials: z.string().min(1, "License and credentials are required"),
  firmDescription: z.string().min(1, "Firm description is required"),
  dealTypes: z.string().min(1, "Types of deals is required"),
  industryFocus: z.array(z.string()).min(1, "Select at least one industry"),
  otherMembers: z.string().optional(),
  membershipAgreementSigned: z.literal(true, {
    errorMap: () => ({ message: "You must sign the membership agreement" }),
  }),
});

export const buyerSignupSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  title: z.string().min(1, "Title is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  linkedIn: z.union([z.string().url("Valid URL is required"), z.literal("")]).optional(),
  firmName: z.string().min(1, "Firm name is required"),
  firmWebsite: z.union([z.string().url("Valid URL is required"), z.literal("")]).optional(),
  location: z.string().min(1, "Location is required"),
  firmType: z.enum(buyerTypeValues),
  firmDescription: z.string().min(1, "Firm description is required"),
  industryFocus: z.array(z.string()).min(1, "Select at least one industry"),
  aum: z.string().min(1, "Assets under management is required"),
  otherMembers: z.string().optional(),
  membershipAgreementSigned: z.literal(true, {
    errorMap: () => ({ message: "You must sign the membership agreement" }),
  }),
});

export type BrokerSignupData = z.infer<typeof brokerSignupSchema>;
export type BuyerSignupData = z.infer<typeof buyerSignupSchema>;

export const settingsProfileUpdateSchema = z.object({
  buyerType: z.union([z.enum(buyerTypeValues), z.literal(""), z.null()]).optional(),
}).passthrough();

export type SettingsProfileUpdateData = z.infer<typeof settingsProfileUpdateSchema>;

export const settingsNotificationsUpdateSchema = z.object({
  preferences: z.record(
    z.enum(notificationEventKeys as unknown as NonEmptyTuple<(typeof notificationEventKeys)[number]>),
    z.object({
      email: z.boolean(),
      in_platform: z.boolean(),
    }).strict()
  ),
});

export const settingsDeleteAccountSchema = z.object({
  confirmation: z.literal("DELETE"),
});

export const adminApplicationsActionSchema = z.object({
  userId: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
});

export const adminInvitationCreateSchema = z.object({
  email: z.string().trim().email("A valid email is required").transform((email) => email.toLowerCase()),
  firmId: z.string().uuid(),
  role: z.enum(["broker", "buyer"]),
});

export const invitationTokenSchema = z.string().trim().uuid();

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
  teaserDocumentPath: storageObjectKeySchema("teaserDocumentPath", { requirePdf: true }).nullable().optional(),
  ndaDocumentPath: storageObjectKeySchema("ndaDocumentPath", { requirePdf: true }).nullable().optional(),
  cimDocumentPath: storageObjectKeySchema("cimDocumentPath", { requirePdf: true }).nullable().optional(),
  ioiDueDate: z.string().nullable().optional(),
  loiDueDate: z.string().nullable().optional(),
});

export const dealPublishSchema = dealCreateSchema.extend({
  teaserDocumentPath: z.string().min(1, "Teaser is required to publish"),
  cimDocumentPath: z.string().min(1, "CIM is required to publish"),
});

export type DealCreateData = z.infer<typeof dealCreateSchema>;
export type DealPublishData = z.infer<typeof dealPublishSchema>;

export const dealStatusUpdateSchema = z.object({
  newStatus: z.enum(dealStatusValues),
  winningEngagementId: z.string().uuid().optional(),
});

export const dealDocumentCreateSchema = z.object({
  fileName: pdfString("fileName"),
  filePath: storageObjectKeySchema("filePath", { requirePdf: true }),
  fileSize: z.number().finite().nonnegative().max(FILE_CONSTRAINTS.MAX_SIZE_BYTES).default(0),
  accessLevel: z.enum(["pre_nda", "post_nda"]).default("post_nda"),
});

export const messageCreateSchema = z.object({
  content: z.string().trim().max(5000).optional().nullable(),
  attachment_path: storageObjectKeySchema("attachment_path", { requirePdf: true }).optional().nullable(),
  attachment_name: pdfString("attachment_name").optional().nullable(),
  attachmentPath: storageObjectKeySchema("attachmentPath", { requirePdf: true }).optional().nullable(),
  attachmentName: pdfString("attachmentName").optional().nullable(),
}).refine(
  (data) => Boolean(data.content || data.attachment_path || data.attachmentPath),
  { message: "Message content or attachment is required", path: ["content"] }
).refine(
  (data) => !(data.attachment_path || data.attachmentPath) || Boolean(data.attachment_name || data.attachmentName),
  { message: "attachment_name is required when attachment_path is provided", path: ["attachment_name"] }
).transform((data) => ({
  content: data.content,
  attachment_path: data.attachment_path ?? data.attachmentPath,
  attachment_name: data.attachment_name ?? data.attachmentName,
}));

export const browseQuerySchema = z.object({
  industry: optionalTrimmedString(),
  location: optionalTrimmedString(),
  keyword: z.string().trim().max(100).regex(/^[\w\s&.%'-]*$/, "Keyword contains unsupported characters").optional().nullable(),
  revenueMin: finiteNonnegativeQueryNumber,
  revenueMax: finiteNonnegativeQueryNumber,
  ebitdaMin: finiteNonnegativeQueryNumber,
  ebitdaMax: finiteNonnegativeQueryNumber,
  cursor: optionalTrimmedString(128),
});

export const escapePostgrestLikePattern = (value: string) => value.replace(/[%_]/g, (match) => `\\${match}`);

const signatureDateSchema = z.string().trim().refine((value) => {
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    const parsedDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return parsedDate.getUTCFullYear() === Number(year) &&
      parsedDate.getUTCMonth() === Number(month) - 1 &&
      parsedDate.getUTCDate() === Number(day);
  }
  if (!/^\d{4}-\d{2}-\d{2}T[\d:.+-]+Z?$/.test(value)) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp);
}, "signatureDate must be an ISO date string");

export const ndaActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("decline") }),
  z.object({
    action: z.literal("sign"),
    signatureName: z.string().trim().min(1).max(120),
    signatureTitle: z.string().trim().min(1).max(120),
    signatureCompany: z.string().trim().min(1).max(160),
    signatureDate: signatureDateSchema,
  }),
]);

export const vettingActionSchema = z.object({
  engagementId: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
  reason: z.enum(vettingRejectionReasonValues).optional(),
});

export const passDealSchema = z.object({
  pass_reason: z.enum(passReasonValues),
  pass_reason_detail: z.string().trim().max(2000).optional().nullable(),
}).refine(
  (data) => data.pass_reason !== "Other" || Boolean(data.pass_reason_detail),
  { message: "Detail is required when reason is Other", path: ["pass_reason_detail"] }
);

export const closeReportSchema = z.object({
  enterpriseValue: z.number().finite().positive().max(MAX_ENTERPRISE_VALUE),
});

export const closeActionSchema = z.object({
  action: z.enum(["confirm", "dispute"]),
  disputeDocumentsPath: storageObjectKeySchema("disputeDocumentsPath", { requirePdf: true }).optional().nullable(),
});

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
export { mapProjectDataToDb } from "@/server/projects/mappers";

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
