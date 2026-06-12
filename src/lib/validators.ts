import { z } from "zod";
import {
  ACCREDITATIONS,
  BROKER_NOTIFICATION_EVENTS,
  BUYER_NOTIFICATION_EVENTS,
  BUYER_TYPE_VALUES,
  DEAL_STATUSES,
  FILE_CONSTRAINTS,
  INDUSTRIES,
  PASS_REASONS,
  VETTING_REJECTION_REASONS,
} from "./constants";

type NonEmptyTuple<T> = readonly [T, ...T[]];

const buyerTypeValues = BUYER_TYPE_VALUES as NonEmptyTuple<(typeof BUYER_TYPE_VALUES)[number]>;
const accreditationValues = ACCREDITATIONS.map(({ value }) => value) as unknown as NonEmptyTuple<(typeof ACCREDITATIONS)[number]["value"]>;
const dealStatusValues = DEAL_STATUSES as NonEmptyTuple<(typeof DEAL_STATUSES)[number]>;
const industryValues = INDUSTRIES as NonEmptyTuple<(typeof INDUSTRIES)[number]>;
const passReasonValues = PASS_REASONS as NonEmptyTuple<(typeof PASS_REASONS)[number]>;
const vettingRejectionReasonValues = VETTING_REJECTION_REASONS as NonEmptyTuple<(typeof VETTING_REJECTION_REASONS)[number]>;
const industryValueSchema = z.enum(industryValues);
const notificationEventKeys = [
  ...BROKER_NOTIFICATION_EVENTS.map(({ key }) => key),
  ...BUYER_NOTIFICATION_EVENTS.map(({ key }) => key),
] as const;

const optionalTrimmedString = (max = 255) => z.string().trim().max(max).optional().nullable();
const PHONE_REQUIRED_MESSAGE = "Phone number is required";
const PHONE_MAX_LENGTH_MESSAGE = "Phone number must be 50 characters or less";
const PHONE_FORMAT_MESSAGE = "Phone number format is invalid";
const PHONE_DIGIT_COUNT_MESSAGE = "Phone number must contain between 7 and 15 digits";
const PHONE_MAX_LENGTH = 50;

const normalizePhoneValue = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim().replace(/\s+/g, " ");
};

const extractPhoneMainNumber = (phone: string) => {
  const extensionMatch = phone.match(/\s*(?:x|ext\.?|extension)\s*\d+\s*$/i);

  if (!extensionMatch) {
    return phone;
  }

  return phone.slice(0, extensionMatch.index).trim();
};

const hasValidPhoneFormat = (phone: string) => {
  const extensionPattern = /\s*(?:x|ext\.?|extension)\s*\d+\s*$/i;
  const hasExtension = extensionPattern.test(phone);
  const mainNumber = extractPhoneMainNumber(phone);
  const validMainNumberChars = /^[\d()+\-.\s]+$/;

  if (!mainNumber || !validMainNumberChars.test(mainNumber)) {
    return false;
  }

  if (!hasExtension) {
    return true;
  }

  return extensionPattern.test(phone);
};

const hasValidPhoneDigitCount = (phone: string) => {
  const mainNumber = extractPhoneMainNumber(phone);
  const digits = mainNumber.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
};

const requiredPhoneSchema = z.preprocess(
  normalizePhoneValue,
  z
    .string()
    .min(1, PHONE_REQUIRED_MESSAGE)
    .max(PHONE_MAX_LENGTH, PHONE_MAX_LENGTH_MESSAGE)
    .refine(hasValidPhoneFormat, PHONE_FORMAT_MESSAGE)
    .refine(hasValidPhoneDigitCount, PHONE_DIGIT_COUNT_MESSAGE)
);

const optionalPhoneSchema = z.preprocess(
  normalizePhoneValue,
  z
    .union([
      z.literal(""),
      z
        .string()
        .max(PHONE_MAX_LENGTH, PHONE_MAX_LENGTH_MESSAGE)
        .refine(hasValidPhoneFormat, PHONE_FORMAT_MESSAGE)
        .refine(hasValidPhoneDigitCount, PHONE_DIGIT_COUNT_MESSAGE),
    ])
    .optional()
);

const normalizeOptionalUrlValue = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === "" ? "" : trimmed;
};

const normalizeNfcStringValue = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }

  return value.normalize("NFC");
};

const normalizeEmptyStringToUndefined = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim() === "" ? undefined : value;
};

const nfcNormalizedString = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(normalizeNfcStringValue, schema);

const optionalUrlString = z.preprocess(
  normalizeOptionalUrlValue,
  z.union([z.string().url("Valid URL is required"), z.literal("")]).optional()
);
const optionalNullableUrlString = z.preprocess(
  normalizeOptionalUrlValue,
  z.union([z.string().url("Valid URL is required"), z.literal(""), z.null()]).optional()
);
const OPTIONAL_OTHER_MEMBERS_MAX_LENGTH_MESSAGE = "Other members must be 5000 characters or less";
const optionalOtherMembersSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  },
  z.string().max(5000, OPTIONAL_OTHER_MEMBERS_MAX_LENGTH_MESSAGE).optional()
);
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
  firstName: nfcNormalizedString(z.string().trim().min(1, "First name is required").max(50, "First name must be 50 characters or less")),
  lastName: nfcNormalizedString(z.string().trim().min(1, "Last name is required").max(50, "Last name must be 50 characters or less")),
  title: nfcNormalizedString(z.string().trim().min(1, "Title is required").max(255, "Title must be 255 characters or less")),
  phoneNumber: requiredPhoneSchema,
  linkedIn: optionalUrlString,
  firmName: nfcNormalizedString(z.string().trim().min(1, "Firm name is required").max(255, "Firm name must be 255 characters or less")),
  firmWebsite: optionalUrlString,
  location: z.string().trim().min(1, "Location is required").max(255, "Location must be 255 characters or less"),
  licenseCredentials: z.string().trim().min(1, "License and credentials are required").max(500, "License and credentials must be 500 characters or less"),
  firmDescription: z.string().trim().min(1, "Firm description is required").max(5000, "Firm description must be 5000 characters or less"),
  dealTypes: z.string().trim().min(1, "Types of deals is required").max(500, "Types of deals must be 500 characters or less"),
  industryFocus: z.array(industryValueSchema).min(1, "Select at least one industry"),
  otherMembers: optionalOtherMembersSchema,
  membershipAgreementSigned: z.literal(true, {
    errorMap: () => ({ message: "You must sign the membership agreement" }),
  }),
  signature: nfcNormalizedString(z.string().trim().min(1, "Electronic signature is required").max(120, "Electronic signature must be 120 characters or less")),
}).strict();

export const buyerDocumentSchema = z.object({
  fileName: z.string().min(1, "Document file name is required"),
  filePath: z.string().min(1, "Document path is required"),
  fileSize: z.number().max(FILE_CONSTRAINTS.MAX_SIZE_BYTES, "File must be under 50MB"),
});

export const buyerSignupSchema = z.object({
  firstName: nfcNormalizedString(z.string().trim().min(1, "First name is required").max(50, "First name must be 50 characters or less")),
  lastName: nfcNormalizedString(z.string().trim().min(1, "Last name is required").max(50, "Last name must be 50 characters or less")),
  title: nfcNormalizedString(z.string().trim().min(1, "Title is required").max(255, "Title must be 255 characters or less")),
  phoneNumber: requiredPhoneSchema,
  linkedIn: optionalUrlString,
  firmName: nfcNormalizedString(z.string().trim().min(1, "Firm name is required").max(255, "Firm name must be 255 characters or less")),
  firmWebsite: optionalUrlString,
  location: z.string().trim().min(1, "Location is required").max(255, "Location must be 255 characters or less"),
  firmType: z.preprocess(
    normalizeEmptyStringToUndefined,
    z.enum(buyerTypeValues, {
      required_error: "Buyer type is required",
      invalid_type_error: "Buyer type is required",
    })
  ),
  firmDescription: z.string().trim().min(1, "Firm description is required").max(5000, "Firm description must be 5000 characters or less"),
  accreditation: z.preprocess(
    normalizeEmptyStringToUndefined,
    z.enum(accreditationValues, {
      required_error: "Accreditation is required",
      invalid_type_error: "Accreditation is required",
    })
  ),
  industryFocus: z.array(industryValueSchema).min(1, "Select at least one industry"),
  aum: z.string().trim().min(1, "Assets under management is required").max(20, "Assets under management must be 20 characters or less"),
  otherMembers: optionalOtherMembersSchema,
  membershipAgreementSigned: z.literal(true, {
    errorMap: () => ({ message: "You must sign the membership agreement" }),
  }),
  signature: nfcNormalizedString(z.string().trim().min(1, "Electronic signature is required").max(120, "Electronic signature must be 120 characters or less")),
  documentPaths: z.array(buyerDocumentSchema).optional().default([]),
}).strict().superRefine((data, ctx) => {
  const requiresDocuments =
    data.firmType === "search_fund" || data.firmType === "individual_investor";

  if (requiresDocuments && data.documentPaths.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["documentPaths"],
      message: "Upload at least one supporting document for this buyer type",
    });
  }
});

export type BrokerSignupData = z.infer<typeof brokerSignupSchema>;
export type BuyerSignupData = z.infer<typeof buyerSignupSchema>;

export type BrokerSignupInput = Omit<BrokerSignupData, "membershipAgreementSigned"> & {
  membershipAgreementSigned: boolean;
};

export type BuyerSignupInput = Omit<
  BuyerSignupData,
  "membershipAgreementSigned" | "firmType" | "accreditation"
> & {
  membershipAgreementSigned: boolean;
  firmType: string;
  accreditation: string;
};

export const validateBrokerSignup = (data: BrokerSignupInput) => {
  const result = brokerSignupSchema.safeParse(data);

  if (result.success) {
    return { success: true as const, data: result.data, fieldErrors: {} };
  }

  return {
    success: false as const,
    fieldErrors: result.error.flatten().fieldErrors,
  };
};

export const validateBuyerSignup = (data: BuyerSignupInput) => {
  const result = buyerSignupSchema.safeParse(data);

  if (result.success) {
    return { success: true as const, data: result.data, fieldErrors: {} };
  }

  return {
    success: false as const,
    fieldErrors: result.error.flatten().fieldErrors,
  };
};
export const settingsProfileUpdateSchema = z.object({
  fullName: z.string().trim().max(255).optional(),
  title: z.string().trim().max(255).optional(),
  avatarPath: z.union([storageObjectKeySchema("avatarPath"), z.null()]).optional(),
  phone: optionalPhoneSchema,
  linkedIn: optionalNullableUrlString,
  location: z.string().trim().max(255).optional(),
  industryFocus: z.array(industryValueSchema).max(50).optional(),
  licenseCredentials: z.string().trim().max(500).optional(),
  dealTypes: z.string().trim().max(500).optional(),
  buyerType: z.union([z.enum(buyerTypeValues), z.literal(""), z.null()]).optional(),
  accreditation: z.union([z.enum(accreditationValues), z.literal(""), z.null()]).optional(),
  aum: z.string().trim().max(20, "Assets under management must be 20 characters or less").optional(),
  firmName: z.string().trim().max(255).optional(),
  description: z.string().trim().max(5000).optional(),
  website: optionalNullableUrlString,
  firmLocation: z.string().trim().max(255).optional(),
  otherMembers: z.string().trim().max(5000).optional(),
  firmIndustryFocus: z.array(industryValueSchema).max(50).optional(),
}).strict();

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
  industry: z.array(industryValueSchema).min(1, "Select at least one industry"),
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

export const ndaActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("decline") }).strict(),
  z.object({
    action: z.literal("sign"),
    signatureName: z.string().trim().min(1).max(120),
    signatureTitle: z.string().trim().min(1).max(120),
    signatureCompany: z.string().trim().min(1).max(160),
  }).strict(),
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
  projectName: z.string().trim().min(1, "Project name is required").max(255, "Project name must be 255 characters or less"),
  industry: z.array(industryValueSchema).nullable().optional(), 
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
