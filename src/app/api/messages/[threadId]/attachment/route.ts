import { isValidStorageObjectKey } from "@/lib/validators";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const UUID_PATTERN = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isValidMessageAttachmentPath = (path: string, threadId: string) => {
  const expectedPattern = new RegExp(`^${escapeRegExp(threadId)}/${UUID_PATTERN}\\.pdf$`, "i");

  return (
    isValidStorageObjectKey(path, { requirePdf: true, allowedPrefixes: [threadId] }) &&
    expectedPattern.test(path)
  );
};

const contentDispositionFilename = (filename: string | null | undefined) => {
  const fallbackName = "message-attachment.pdf";
  const safeName = filename?.replace(/[\\/\r\n"]/g, "_").trim() || fallbackName;
  return `attachment; filename="${safeName}"`;
};

export async function GET(
  request: NextRequest,
  { params }: { params: { threadId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { threadId } = params;
  const attachmentPath = request.nextUrl.searchParams.get("path")?.trim();

  if (!attachmentPath || !isValidMessageAttachmentPath(attachmentPath, threadId)) {
    return NextResponse.json({ error: "Attachment path must be scoped to this thread as a generated PDF key" }, { status: 400 });
  }

  const { data: engagement } = await supabase
    .from("deal_engagements")
    .select(`
      id,
      deal_id,
      buyer_user_id,
      deals!inner (
        id,
        point_of_contact_id
      )
    `)
    .eq("id", threadId)
    .single();

  if (!engagement) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  const deal = engagement.deals as unknown as Record<string, unknown>;
  const isBuyer = engagement.buyer_user_id === user.id;
  const isPOC = deal.point_of_contact_id === user.id;

  const { data: profile } = await supabase
    .from("users")
    .select("role, status")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin" && profile.status === "approved";

  if (!isBuyer && !isPOC && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: message } = await supabase
    .from("messages")
    .select("attachment_name")
    .eq("engagement_id", threadId)
    .eq("deal_id", engagement.deal_id)
    .eq("attachment_path", attachmentPath)
    .single();

  if (!message) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }

  const { data: file, error } = await supabase.storage
    .from("message-attachments")
    .download(attachmentPath);

  if (error || !file) {
    return NextResponse.json({ error: "Failed to download attachment" }, { status: 404 });
  }

  return new NextResponse(file, {
    headers: {
      "Content-Type": file.type || "application/pdf",
      "Content-Disposition": contentDispositionFilename(message.attachment_name),
      "Cache-Control": "private, no-store",
    },
  });
}
