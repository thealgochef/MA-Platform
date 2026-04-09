import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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

  // Fetch engagement with deal info
  const { data: engagement } = await supabase
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
    .single();

  if (!engagement) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  const deal = engagement.deals as unknown as Record<string, unknown>;

  // Verify user is a participant: buyer_user_id or deal's point_of_contact_id
  const isBuyer = engagement.buyer_user_id === user.id;
  const isPOC = deal.point_of_contact_id === user.id;

  // Check if admin
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";

  if (!isBuyer && !isPOC && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch messages ordered chronologically
  const { data: messages } = await supabase
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

  // Fetch other party info
  let otherParty;
  if (isBuyer) {
    // Buyer sees the broker POC
    const { data: poc } = await supabase
      .from("users")
      .select("full_name, firms ( name )")
      .eq("id", deal.point_of_contact_id as string)
      .single();
    otherParty = poc;
  } else {
    // Broker/admin sees the buyer
    const { data: buyer } = await supabase
      .from("users")
      .select("full_name, firms ( name )")
      .eq("id", engagement.buyer_user_id)
      .single();
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

  // Fetch engagement with deal info
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

  // Only buyer_user_id or point_of_contact_id can send messages
  const isBuyer = engagement.buyer_user_id === user.id;
  const isPOC = deal.point_of_contact_id === user.id;

  if (!isBuyer && !isPOC) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { content, attachment_path, attachment_name } = body;

  if (!content && !attachment_path) {
    return NextResponse.json({ error: "Message content or attachment is required" }, { status: 400 });
  }

  // Validate attachment is PDF if provided
  if (attachment_path && attachment_name) {
    if (!attachment_name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF attachments are allowed" }, { status: 400 });
    }
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
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }

  return NextResponse.json({ message }, { status: 201 });
}
