import { NextResponse } from "next/server";
import { isAuthResponse, requireRole } from "@/server/auth";

const TEASER_ACCESS_REVOKED_DEAL_STATUSES = new Set(["paused", "terminated", "closed"]);
const TEASER_ACCESS_REVOKED_ENGAGEMENT_STAGES = new Set(["declined", "passed", "terminated"]);

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const context = await requireRole("buyer");
  if (isAuthResponse(context)) {
    return context;
  }

  const { supabase, user } = context;

  const { data: deal } = await supabase
    .from("deals")
    .select("id, status, teaser_document_path")
    .eq("id", params.id)
    .single();

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  if (TEASER_ACCESS_REVOKED_DEAL_STATUSES.has(deal.status)) {
    return NextResponse.json(
      { error: `Document access revoked — deal is ${deal.status}` },
      { status: 403 }
    );
  }

  const { data: engagement } = await supabase
    .from("deal_engagements")
    .select("id, stage")
    .eq("deal_id", params.id)
    .eq("buyer_user_id", user.id)
    .maybeSingle();

  if (!engagement) {
    return NextResponse.json({ error: "Teaser not available" }, { status: 403 });
  }

  if (TEASER_ACCESS_REVOKED_ENGAGEMENT_STAGES.has(engagement.stage ?? "")) {
    return NextResponse.json({ error: "Teaser not available" }, { status: 403 });
  }

  if (!deal.teaser_document_path) {
    return NextResponse.json({ error: "Teaser not available" }, { status: 404 });
  }

  const url = new URL(request.url);
  const wantsJson =
    url.searchParams.get("format") === "json" ||
    request.headers.get("accept")?.includes("application/json");
  const action = url.searchParams.get("action");

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from("deal-documents")
    .createSignedUrl(deal.teaser_document_path, 60 * 10, {
      download: action === "download",
    });

  if (signedUrlError || !signedUrlData?.signedUrl) {
    console.error("[api/deals/[id]/teaser] Failed to create signed URL", {
      dealId: params.id,
      error: signedUrlError?.message,
    });
    return NextResponse.json({ error: "Failed to access teaser document" }, { status: 500 });
  }

  if (!wantsJson) {
    return NextResponse.redirect(signedUrlData.signedUrl, {
      headers: {
        "Cache-Control": "no-store, private",
      },
    });
  }

  return NextResponse.json(
    {
      teaserUrl: signedUrlData.signedUrl,
    },
    {
      headers: {
        "Cache-Control": "no-store, private",
      },
    }
  );
}
