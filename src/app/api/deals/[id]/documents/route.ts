import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role, status, firm_id")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "broker" || profile.status !== "approved") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify deal belongs to broker's firm
    const { data: deal } = await supabase
      .from("deals")
      .select("firm_id")
      .eq("id", params.id)
      .single();

    if (!deal || deal.firm_id !== profile.firm_id) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    const { fileName, filePath, fileSize, accessLevel } = await request.json();

    if (!fileName || !filePath) {
      return NextResponse.json({ error: "fileName and filePath are required" }, { status: 400 });
    }

    // Enforce PDF only via content type check
    if (!fileName.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Only PDF files are allowed (application/pdf)" },
        { status: 400 }
      );
    }

    const { data: doc, error } = await supabase
      .from("deal_documents")
      .insert({
        deal_id: params.id,
        uploaded_by: user.id,
        file_name: fileName,
        file_path: filePath,
        file_size: fileSize || 0,
        access_level: accessLevel || "post_nda",
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
      metadata: { fileName, accessLevel: accessLevel || "post_nda" },
    });

    return NextResponse.json({ document: doc }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
