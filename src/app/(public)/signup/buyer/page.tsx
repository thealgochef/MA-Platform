"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BUYER_TYPES, ACCREDITATIONS, FILE_CONSTRAINTS, INDUSTRIES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import {
  fileValidation,
  validateBuyerSignup,
} from "@/lib/validators";

type BuyerFormData = {
  firstName: string;
  lastName: string;
  title: string;
  phoneNumber: string;
  linkedIn: string;
  firmName: string;
  firmWebsite: string;
  location: string;
  firmType: string;
  firmDescription: string;
  accreditation: string;
  industryFocus: string[];
  aum: string;
  otherMembers: string;
  membershipAgreementSigned: boolean;
  signature: string;
};

export default function BuyerSignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof BuyerFormData | "documentPaths", string[]>>
  >({});

  const [formData, setFormData] = useState<BuyerFormData>({
    firstName: "",
    lastName: "",
    title: "",
    phoneNumber: "",
    linkedIn: "",
    firmName: "",
    firmWebsite: "",
    location: "",
    firmType: "",
    firmDescription: "",
    accreditation: "",
    industryFocus: [] as string[],
    aum: "",
    otherMembers: "",
    membershipAgreementSigned: false,
    signature: "",
  });

  const [documents, setDocuments] = useState<File[]>([]);

  const showDocumentUpload =
    formData.firmType === "search_fund" ||
    formData.firmType === "individual_investor";

  const handleIndustryToggle = (industry: string) => {
    setFormData((prev) => ({
      ...prev,
      industryFocus: prev.industryFocus.includes(industry)
        ? prev.industryFocus.filter((i) => i !== industry)
        : [...prev.industryFocus, industry],
    }));
    setFieldErrors((prev) => ({ ...prev, industryFocus: undefined }));
  };

  const updateField = <K extends keyof BuyerFormData>(
    field: K,
    value: BuyerFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const getFieldError = (field: keyof BuyerFormData | "documentPaths") =>
    fieldErrors[field]?.[0];

  const getInputClassName = (field: keyof BuyerFormData) =>
    `w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:border-primary ${
      getFieldError(field) ? "border-error" : "border-border-color"
    }`;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!FILE_CONSTRAINTS.ALLOWED_TYPES.includes(file.type as (typeof FILE_CONSTRAINTS.ALLOWED_TYPES)[number])) {
        setError("Only PDF files are allowed");
        return;
      }
      if (file.size > FILE_CONSTRAINTS.MAX_SIZE_BYTES) {
        setError("Files must be under 50MB");
        return;
      }

      validFiles.push(file);
    }
    setDocuments((prev) => [...prev, ...validFiles]);
    setFieldErrors((prev) => ({ ...prev, documentPaths: undefined }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateBuyerSignup({
      ...formData,
      documentPaths: documents.map((doc) => ({
        fileName: doc.name,
        filePath: doc.name,
        fileSize: doc.size,
      })),
    });

    if (!validation.success) {
      setFieldErrors(validation.fieldErrors);
      setError("Please correct the highlighted fields.");
      return;
    }

    setLoading(true);
    setError(null);
    setFieldErrors({});

    try {
      // Upload documents to Supabase Storage first
      const documentPaths: { fileName: string; filePath: string; fileSize: number }[] = [];
      if (documents.length > 0) {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Authentication required");

        for (const doc of documents) {
          const filePath = `${user.id}/${crypto.randomUUID()}.pdf`;
          const { error: uploadError } = await supabase.storage
            .from("buyer-documents")
            .upload(filePath, doc, { contentType: "application/pdf" });

          if (uploadError) throw new Error(`Failed to upload ${doc.name}`);
          documentPaths.push({ fileName: doc.name, filePath, fileSize: doc.size });
        }
      }

      const res = await fetch("/api/signup/buyer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          documentPaths,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.details?.fieldErrors) {
          setFieldErrors(data.details.fieldErrors);
        }
        throw new Error(data.error || "Signup failed");
      }

      router.push("/pending-approval");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-surface py-12 text-text">
      <div className="max-w-2xl mx-auto">
        <div className="bg-bg rounded-xl shadow-md p-8">
          <h1 className="text-3xl font-bold font-display text-primary mb-2">
            Buyer Application
          </h1>
          <p className="mb-8">
            Complete your profile to join Geneva Holdings as a buyer.
          </p>

          {error && (
            <div className="bg-error/10 border border-error/20 text-error rounded-md p-3 mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            <p className="text-[11px] font-medium uppercase tracking-widest text-gray-400 mb-2.5">
              Personal
            </p>
            <div>
              <label className="block text-sm font-medium mb-1">
                First Name *
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => updateField("firstName", e.target.value)}
                aria-invalid={Boolean(getFieldError("firstName"))}
                className={getInputClassName("firstName")}
              />
              {getFieldError("firstName") && (
                <p className="mt-1 text-sm text-error">{getFieldError("firstName")}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Last Name *
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => updateField("lastName", e.target.value)}
                aria-invalid={Boolean(getFieldError("lastName"))}
                className={getInputClassName("lastName")}
              />
              {getFieldError("lastName") && (
                <p className="mt-1 text-sm text-error">{getFieldError("lastName")}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => updateField("title", e.target.value)}
                aria-invalid={Boolean(getFieldError("title"))}
                className={getInputClassName("title")}
              />
              {getFieldError("title") && (
                <p className="mt-1 text-sm text-error">{getFieldError("title")}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => updateField("phoneNumber", e.target.value)}
                placeholder="e.g., (555) 123-4567"
                aria-invalid={Boolean(getFieldError("phoneNumber"))}
                className={getInputClassName("phoneNumber")}
              />
              {getFieldError("phoneNumber") && (
                <p className="mt-1 text-sm text-error">{getFieldError("phoneNumber")}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                LinkedIn Profile
              </label>
              <input
                type="url"
                value={formData.linkedIn}
                onChange={(e) => updateField("linkedIn", e.target.value)}
                placeholder="https://www.linkedin.com/in/your-profile"
                aria-invalid={Boolean(getFieldError("linkedIn"))}
                className={getInputClassName("linkedIn")}
              />
              {getFieldError("linkedIn") && (
                <p className="mt-1 text-sm text-error">{getFieldError("linkedIn")}</p>
              )}
            </div>

            <p className="text-[11px] font-medium uppercase tracking-widest text-gray-400 mb-2.5">
              Firm
            </p>
            <div>
              <label className="block text-sm font-medium mb-1">
                Firm Name *
              </label>
              <input
                type="text"
                value={formData.firmName}
                onChange={(e) => updateField("firmName", e.target.value)}
                aria-invalid={Boolean(getFieldError("firmName"))}
                className={getInputClassName("firmName")}
              />
              {getFieldError("firmName") && (
                <p className="mt-1 text-sm text-error">{getFieldError("firmName")}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Website
              </label>
              <input
                type="url"
                value={formData.firmWebsite}
                onChange={(e) => updateField("firmWebsite", e.target.value)}
                placeholder="https://"
                aria-invalid={Boolean(getFieldError("firmWebsite"))}
                className={getInputClassName("firmWebsite")}
              />
              {getFieldError("firmWebsite") && (
                <p className="mt-1 text-sm text-error">{getFieldError("firmWebsite")}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Firm Type *
              </label>
              <select
                value={formData.firmType}
                onChange={(e) => updateField("firmType", e.target.value)}
                aria-invalid={Boolean(getFieldError("firmType"))}
                className={getInputClassName("firmType")}
              >
                <option value="">Select firm type</option>
                {BUYER_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {getFieldError("firmType") && (
                <p className="mt-1 text-sm text-error">{getFieldError("firmType")}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Assets Under Management ($M) *
              </label>
              <input
                type="text"
                value={formData.aum}
                onChange={(e) => updateField("aum", e.target.value)}
                placeholder="e.g., $50M"
                aria-invalid={Boolean(getFieldError("aum"))}
                className={getInputClassName("aum")}
              />
              {getFieldError("aum") && (
                <p className="mt-1 text-sm text-error">{getFieldError("aum")}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Location *
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => updateField("location", e.target.value)}
                aria-invalid={Boolean(getFieldError("location"))}
                className={getInputClassName("location")}
              />
              {getFieldError("location") && (
                <p className="mt-1 text-sm text-error">{getFieldError("location")}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Description *
              </label>
              <textarea
                rows={4}
                value={formData.firmDescription}
                onChange={(e) => updateField("firmDescription", e.target.value)}
                aria-invalid={Boolean(getFieldError("firmDescription"))}
                className={getInputClassName("firmDescription")}
              />
              {getFieldError("firmDescription") && (
                <p className="mt-1 text-sm text-error">{getFieldError("firmDescription")}</p>
              )}
            </div>

            <p className="text-[11px] font-medium uppercase tracking-widest text-gray-400 mb-2.5">
              Credentials & Accreditations
            </p>

            <div>
              <label className="block text-sm font-medium mb-1">
                Basis for Accreditation *
              </label>
              <select
                value={formData.accreditation}
                onChange={(e) =>
                  updateField(
                    "accreditation",
                      e.target.value
                  )
                }
                aria-invalid={Boolean(getFieldError("accreditation"))}
                className={getInputClassName("accreditation")}
              >
                <option value="">Select basis for accreditation</option>
                {ACCREDITATIONS.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {getFieldError("accreditation") && (
                <p className="mt-1 text-sm text-error">{getFieldError("accreditation")}</p>
              )}
            </div>

            <p className="text-[11px] font-medium uppercase tracking-widest text-gray-400 mb-2.5">
              Focus
            </p>

            <div>
              <label className="block text-sm font-medium mb-2">
                Industry Focus * (select all that apply)
              </label>
              <div className="flex flex-wrap gap-2">
                {INDUSTRIES.map((industry) => (
                  <button
                    key={industry}
                    type="button"
                    onClick={() => handleIndustryToggle(industry)}
                    className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors ${
                      formData.industryFocus.includes(industry)
                        ? "bg-primary text-bg border-primary"
                        : "bg-bg text-[#757280] border-border-color hover:border-primary"
                    }`}
                  >
                    {industry}
                  </button>
                ))}
              </div>
              {getFieldError("industryFocus") && (
                <p className="mt-2 text-sm text-error">{getFieldError("industryFocus")}</p>
              )}
            </div>

            {showDocumentUpload && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Supporting Documents (PDF only, 50MB max)
                </label>
                <p className="text-xs mb-2">
                  Required for search_fund and private_investor buyer types.
                  Upload credentials, track record, or other supporting
                  documentation.
                </p>
                <input
                  type="file"
                  accept="application/pdf"
                  multiple
                  onChange={handleFileChange}
                  className="w-full text-sm"
                />
                {getFieldError("documentPaths") && (
                  <p className="mt-2 text-sm text-error">{getFieldError("documentPaths")}</p>
                )}
                {documents.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {documents.map((doc, i) => (
                      <div
                        key={i}
                        className="text-xs flex items-center gap-2"
                      >
                        <span>📄 {doc.name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setDocuments(documents.filter((_, j) => j !== i));
                            setFieldErrors((prev) => ({
                              ...prev,
                              documentPaths: undefined,
                            }));
                          }}
                          className="text-error hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <p className="text-[11px] font-medium uppercase tracking-widest text-gray-400 mb-2.5">
              Invite
            </p>
            <div>
              <label className="block text-sm font-medium mb-1">
                Other Firm Members Who Need Access
              </label>
              <textarea
                rows={3}
                value={formData.otherMembers}
                onChange={(e) => updateField("otherMembers", e.target.value)}
                placeholder="Email addresses, one per line"
                className={getInputClassName("otherMembers")}
              />
            </div>

            <div className="border-t border-border-color pt-6">
              <h3 className="text-xl font-semibold text-primary mb-4">
                Membership Agreement
              </h3>
              <div className="bg-surface rounded-md p-4 mb-4 text-sm max-h-48 overflow-y-auto">
                <p className="mb-2">
                  By signing this membership agreement, you agree to the terms
                  and conditions of the Geneva Holdings platform, including but
                  not limited to:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Honoring all signed NDAs</li>
                  <li>Providing accurate and truthful information</li>
                  <li>Adhering to platform guidelines for professional conduct</li>
                  <li>Acknowledging the fee structure (1.25% success fee on closed deals)</li>
                </ul>
              </div>

              <label className="flex items-start gap-3 mb-4">
                <input
                  type="checkbox"
                  checked={formData.membershipAgreementSigned}
                  onChange={(e) =>
                    updateField("membershipAgreementSigned", e.target.checked as true)
                  }
                  className="mt-1"
                />
                <span className="text-sm">
                  By submitting your application, you agree to our Terms of Service, Privacy Policy, and authorize Geneva Holdings to send you automated text messages. You can opt out at any time. *
                </span>
              </label>
              {getFieldError("membershipAgreementSigned") && (
                <p className="mt-1 text-sm text-error">{getFieldError("membershipAgreementSigned")}</p>
              )}

              <div>
                <label className="block text-md font-medium text-primary mb-1">
                  Electronic Signature *
                </label>
                <input
                  type="text"
                  value={formData.signature}
                  onChange={(e) => updateField("signature", e.target.value)}
                  placeholder="Type your full name as signature"
                  aria-invalid={Boolean(getFieldError("signature"))}
                  className={getInputClassName("signature")}
                />
                {getFieldError("signature") && (
                  <p className="mt-1 text-sm text-error">{getFieldError("signature")}</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={
                loading ||
                !formData.membershipAgreementSigned ||
                formData.industryFocus.length === 0 ||
                !formData.firmType
              }
              className="w-full py-3 btn-primary rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Submitting..." : "Submit Application"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
