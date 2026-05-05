import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { buyerSignupSchema } from "@/lib/validators";
import { notifyAdmin } from "@/lib/notifications";

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
    if (Array.isArray(data.documentPaths) && data.documentPaths.length > 0) {
      const docRecords = data.documentPaths.map((doc) => ({
        user_id: user.id,
        file_name: doc.fileName,
        file_path: doc.filePath,
        file_size: doc.fileSize,
      }));

      await adminClient.from("buyer_documents").insert(docRecords);
    }

    // Placeholder notification
    notifyAdmin("new_buyer_application", user.id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
