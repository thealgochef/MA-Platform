import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isValidStorageObjectKey, messageCreateSchema } from "@/lib/validators";

const UUID_PATTERN = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isValidMessageAttachmentPath = (path: string, threadId: string) => {
  const expectedPattern = new RegExp(`^${escapeRegExp(threadId)}/${UUID_PATTERN}\\.pdf$`, "i");

  return (
    isValidStorageObjectKey(path, { requirePdf: true, allowedPrefixes: [threadId] }) &&
    expectedPattern.test(path)
  );
};

export async function GET(
  request: Request,
  { params }: { params: { threadId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { threadId } = params;
  // threadId = engagement_id (one thread per engagement)

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role, status")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("[messages/thread] Failed to load profile", {
      threadId,
      userId: user.id,
      error: profileError,
    });
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }

  if (profile.status !== "approved") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch engagement with deal info
  const { data: engagement, error: engagementError } = await supabase
    .from("deal_engagements")
    .select(`
      id,
      deal_id,
      buyer_user_id,
      stage,
      deals!inner (
        id,
        headline,
        point_of_contact_id,
        firm_id
      )
    `)
    .eq("id", threadId)
    .maybeSingle();

  if (engagementError) {
    console.error("[messages/thread] Failed to load thread engagement", {
      threadId,
      userId: user.id,
      error: engagementError,
    });
    return NextResponse.json({ error: "Failed to load thread" }, { status: 500 });
  }

  if (!engagement) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  const deal = engagement.deals as unknown as Record<string, unknown>;

  // Verify user is a participant: buyer_user_id or deal's point_of_contact_id
  const isBuyer = engagement.buyer_user_id === user.id;
  const isPOC = deal.point_of_contact_id === user.id;

  const isAdmin = profile?.role === "admin";

  if (!isBuyer && !isPOC && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error: readMarkerError } = await supabase.rpc("mark_message_thread_read", {
    p_engagement_id: threadId,
  });

  if (readMarkerError) {
    console.error("[messages/thread] Failed to update read marker", {
      threadId,
      userId: user.id,
      error: readMarkerError,
    });
  }

  // Fetch messages ordered chronologically
  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select(`
      id,
      content,
      attachment_path,
      attachment_name,
      sender_id,
      created_at,
      users!messages_sender_id_fkey ( full_name )
    `)
    .eq("engagement_id", threadId)
    .eq("deal_id", engagement.deal_id)
    .order("created_at", { ascending: true });

  if (messagesError) {
    console.error("[messages/thread] Failed to load thread messages", {
      threadId,
      userId: user.id,
      error: messagesError,
    });
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }

  // Fetch other party info
  let otherParty;
  if (isBuyer) {
    // Buyer sees the broker POC
    const { data: poc, error: pocError } = await supabase
      .from("users")
      .select("full_name, firms ( name )")
      .eq("id", deal.point_of_contact_id as string)
      .single();

    if (pocError) {
      console.error("[messages/thread] Failed to load broker counterparty", {
        threadId,
        userId: user.id,
        error: pocError,
      });
      return NextResponse.json({ error: "Failed to load thread" }, { status: 500 });
    }

    otherParty = poc;
  } else {
    // Broker/admin sees the buyer
    const { data: buyer, error: buyerError } = await supabase
      .from("users")
      .select("full_name, firms ( name )")
      .eq("id", engagement.buyer_user_id)
      .single();

    if (buyerError) {
      console.error("[messages/thread] Failed to load buyer counterparty", {
        threadId,
        userId: user.id,
        error: buyerError,
      });
      return NextResponse.json({ error: "Failed to load thread" }, { status: 500 });
    }

    otherParty = buyer;
  }

  return NextResponse.json({
    engagement: {
      id: engagement.id,
      engagement_id: engagement.id,
      deal_id: engagement.deal_id,
      stage: engagement.stage,
      headline: deal.headline,
    },
    otherParty,
    messages: messages || [],
  });
}

export async function POST(
  request: Request,
  { params }: { params: { threadId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { threadId } = params;

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role, status")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("[messages/thread] Failed to load profile for send", {
      threadId,
      userId: user.id,
      error: profileError,
    });
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }

  if (profile.status !== "approved") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch engagement with deal info
  const { data: engagement, error: engagementError } = await supabase
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
    .maybeSingle();

  if (engagementError) {
    console.error("[messages/thread] Failed to load thread engagement for send", {
      threadId,
      userId: user.id,
      error: engagementError,
    });
    return NextResponse.json({ error: "Failed to load thread" }, { status: 500 });
  }

  if (!engagement) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  const deal = engagement.deals as unknown as Record<string, unknown>;

  // Only buyer_user_id or point_of_contact_id can send messages
  const isBuyer = engagement.buyer_user_id === user.id;
  const isPOC = deal.point_of_contact_id === user.id;

  if (!isBuyer && !isPOC) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = messageCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Message content or attachment is required" }, { status: 400 });
  }

  const { content, attachment_path, attachment_name } = parsed.data;
  if (attachment_path && !isValidMessageAttachmentPath(attachment_path, threadId)) {
    return NextResponse.json({ error: "Attachment path must be scoped to this thread as a generated PDF key" }, { status: 400 });
  }

  // Insert message — attachment uploaded to message-attachments bucket by client
  const { data: message, error } = await supabase
    .from("messages")
    .insert({
      deal_id: engagement.deal_id,
      engagement_id: threadId,
      sender_id: user.id,
      content: content || null,
      attachment_path: attachment_path || null,
      attachment_name: attachment_name || null,
    })
    .select()
    .single();

  if (error) {
    console.error("[messages/thread] Failed to insert thread message", {
      threadId,
      userId: user.id,
      engagementId: threadId,
      dealId: engagement.deal_id,
      hasContent: Boolean(content),
      hasAttachment: Boolean(attachment_path),
      error,
    });
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }

  return NextResponse.json({ message }, { status: 201 });
}
