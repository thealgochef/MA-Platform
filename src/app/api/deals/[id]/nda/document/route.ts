import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const NDA_DOCUMENT_ACCESS_STATUSES = ["sent", "signed"] as const;

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: deal } = await supabase
    .from("deals")
    .select("id, nda_type, nda_document_path")
    .eq("id", params.id)
    .single();

  if (!deal || deal.nda_type !== "custom" || !deal.nda_document_path) {
    return NextResponse.json({ error: "Custom NDA not available" }, { status: 404 });
  }

  const { data: engagement } = await supabase
    .from("deal_engagements")
    .select("id, nda_status")
    .eq("deal_id", params.id)
    .eq("buyer_user_id", user.id)
    .single();

  if (!engagement || !NDA_DOCUMENT_ACCESS_STATUSES.includes(engagement.nda_status)) {
    return NextResponse.json({ error: "NDA not available" }, { status: 403 });
  }

  const url = new URL(request.url);
  const wantsJson =
    url.searchParams.get("format") === "json" ||
    request.headers.get("accept")?.includes("application/json");
  const action = url.searchParams.get("action");

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from("deal-documents")
    .createSignedUrl(deal.nda_document_path, 60 * 10, {
      download: action === "download",
    });

  if (signedUrlError || !signedUrlData?.signedUrl) {
    return NextResponse.json({ error: "Failed to access NDA document" }, { status: 500 });
  }

  if (!wantsJson) {
    return NextResponse.redirect(signedUrlData.signedUrl);
  }

  return NextResponse.json({
    ndaPath: deal.nda_document_path,
    ndaUrl: signedUrlData.signedUrl,
  });
}
