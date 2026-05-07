import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { FILE_CONSTRAINTS } from "@/lib/constants";
import { buyerSignupSchema, isValidStorageObjectKey } from "@/lib/validators";
import { notifyAdmin } from "@/lib/notifications";

type BuyerDocumentPathInput = {
  fileName: string;
  filePath: string;
  fileSize: number;
};

const SAFE_PDF_FILE_NAME_PATTERN = /^[A-Za-z0-9][^/\\\u0000-\u001F\u007F]{0,254}\.pdf$/i;
const STORAGE_UUID_PDF_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.pdf$/i;

const isValidBuyerDocumentPath = (
  doc: unknown,
  userId: string
): doc is BuyerDocumentPathInput => {
  if (!doc || typeof doc !== "object") return false;

  const candidate = doc as Record<string, unknown>;
  const { fileName, filePath, fileSize } = candidate;

  return (
    typeof fileName === "string" &&
    SAFE_PDF_FILE_NAME_PATTERN.test(fileName) &&
    !fileName.includes("/") &&
    !fileName.includes("\\") &&
    !/[\u0000-\u001F\u007F]/.test(fileName) &&
    typeof filePath === "string" &&
    isValidStorageObjectKey(filePath, {
      requirePdf: true,
      allowedPrefixes: [userId],
    }) &&
    filePath.startsWith(`${userId}/`) &&
    STORAGE_UUID_PDF_PATTERN.test(filePath.slice(userId.length + 1)) &&
    typeof fileSize === "number" &&
    Number.isFinite(fileSize) &&
    fileSize >= 0 &&
    fileSize <= FILE_CONSTRAINTS.MAX_SIZE_BYTES
  );
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = buyerSignupSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    if (
      documentPaths !== undefined &&
      (!Array.isArray(documentPaths) ||
        !documentPaths.every((doc) => isValidBuyerDocumentPath(doc, user.id)))
    ) {
      return NextResponse.json(
        { error: "Invalid buyer document path" },
        { status: 400 }
      );
    }

    // Use admin client to bypass RLS for trusted server-side signup operations
    const adminClient = createAdminClient();

    // Create firm
    const { data: firm, error: firmError } = await adminClient
      .from("firms")
      .insert({
        name: data.firmName,
        website: data.firmWebsite,
        description: data.firmDescription,
        location: data.location,
        industry_focus: data.industryFocus,
        firm_type: "buyer",
        team_members_requested: data.otherMembers || null,
      })
      .select()
      .single();

    if (firmError) {
      console.error("[signup/buyer] Failed to create firm:", firmError.message, firmError.code, firmError.details);
      return NextResponse.json(
        { error: "Failed to create firm", details: firmError.message },
        { status: 500 }
      );
    }

    // Update user profile
    const { error: userError } = await adminClient
      .from("users")
      .update({
        full_name: `${data.firstName} ${data.lastName}`,
        title: data.title,
        phone: data.phoneNumber,
        linkedin: data.linkedIn,
        firm_id: firm.id,
        role: "buyer",
        status: "approved", // ⚠️ DEV-ONLY: change back to "pending" for production
        location: data.location,
        buyer_type: data.firmType,
        accreditation: data.accreditation,
        aum: data.aum,
        industry_focus: data.industryFocus,
        membership_agreement_signed: true,
        membership_agreement_signed_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (userError) {
      console.error("[signup/buyer] Failed to update profile:", userError.message, userError.code, userError.details);
      return NextResponse.json(
        { error: "Failed to update profile", details: userError.message },
        { status: 500 }
      );
    }

    // Create buyer_documents records for uploaded files
    if (Array.isArray(documentPaths) && documentPaths.length > 0) {
      const docRecords = documentPaths.map((doc: BuyerDocumentPathInput) => ({
        user_id: user.id,
        file_name: doc.fileName,
        file_path: doc.filePath,
        file_size: doc.fileSize,
      }));

      const { error: documentsError } = await adminClient.from("buyer_documents").insert(docRecords);

      if (documentsError) {
        console.error("[signup/buyer] Failed to create buyer document records:", documentsError.message, documentsError.code, documentsError.details);
        return NextResponse.json(
          { error: "Failed to create buyer document records", details: documentsError.message },
          { status: 500 }
        );
      }
    }

    // Placeholder notification
    notifyAdmin("new_buyer_application", user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[signup/buyer] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
