import { NextResponse } from "next/server";
import { dealDocumentCreateSchema, isValidStorageObjectKey } from "@/lib/validators";
import {
  isAuthResponse,
  requireApprovedUser,
  requireBrokerDealAccess,
} from "@/server/auth";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const context = await requireApprovedUser();
  if (isAuthResponse(context)) {
    return context;
  }

  const { supabase, profile } = context;

  if (profile.role === "broker") {
    const brokerDeal = await requireBrokerDealAccess(supabase, profile, params.id, "id");
    if (isAuthResponse(brokerDeal)) {
      return brokerDeal;
    }
  } else if (profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: documents, error } = await supabase
    .from("deal_documents")
    .select("*")
    .eq("deal_id", params.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }

  return NextResponse.json({ documents: documents || [] });
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const context = await requireApprovedUser();
    if (isAuthResponse(context)) {
      return context;
    }

    const { supabase, user, profile } = context;

    if (profile.role !== "broker") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const brokerDeal = await requireBrokerDealAccess(supabase, profile, params.id, "id");
    if (isAuthResponse(brokerDeal)) {
      return brokerDeal;
    }

    // PDF-only validation (application/pdf equivalent) is centralized in dealDocumentCreateSchema.
    const body = await request.json().catch(() => null);
    const parsed = dealDocumentCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "fileName and filePath are required" }, { status: 400 });
    }

    const { fileName, filePath, fileSize, accessLevel } = parsed.data;
    if (!isValidStorageObjectKey(filePath, { requirePdf: true, allowedPrefixes: [params.id] })) {
      return NextResponse.json({ error: "filePath must be scoped to this deal" }, { status: 400 });
    }

    const { data: doc, error } = await supabase
      .from("deal_documents")
      .insert({
        deal_id: params.id,
        uploaded_by: user.id,
        file_name: fileName,
        file_path: filePath,
        file_size: fileSize,
        access_level: accessLevel,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to create document record" }, { status: 500 });
    }

    await supabase.from("deal_activity_log").insert({
      deal_id: params.id,
      actor_id: user.id,
      action: "document_uploaded",
      metadata: { fileName, accessLevel },
    });

    return NextResponse.json({ document: doc }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
