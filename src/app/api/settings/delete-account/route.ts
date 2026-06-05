import { NextResponse } from "next/server";
import * as supabaseAdmin from "@/lib/supabase/admin";
import { notifyBuyers } from "@/lib/notifications";
import { settingsDeleteAccountSchema } from "@/lib/validators";
import { isAuthResponse, requireApprovedUser } from "@/server/auth";

export async function POST(request: Request) {
  const context = await requireApprovedUser();
  if (isAuthResponse(context)) return context;

  const { user, profile } = context;

  const body = await request.json().catch(() => null);

  // Require typing "DELETE" to confirm
  if (!settingsDeleteAccountSchema.safeParse(body).success) {
    return NextResponse.json(
      { error: "You must type DELETE to confirm account deletion" },
      { status: 400 }
    );
  }

  const adminClient = supabaseAdmin.createAdminClient();

  // Role-specific cleanup
  if (profile.role === "broker") {
    // Terminate all active deals owned by broker's firm
    const { data: activeDeals, error: activeDealsError } = await adminClient
      .from("deals")
      .select("id")
      .eq("firm_id", profile.firm_id)
      .not("status", "in", '("terminated","closed")');

    if (activeDealsError) {
      console.error("[settings/delete-account][POST] Failed to load active deals", {
        userId: user.id,
        firmId: profile.firm_id,
        error: activeDealsError.message,
      });
      return NextResponse.json(
        { error: "Failed to load active deals for account deletion" },
        { status: 500 }
      );
    }

    if (activeDeals && activeDeals.length > 0) {
      const dealIds = activeDeals.map((d) => d.id);

      // Terminate all deals
      const { error: dealsUpdateError } = await adminClient
        .from("deals")
        .update({ status: "terminated" })
        .in("id", dealIds);

      if (dealsUpdateError) {
        console.error("[settings/delete-account][POST] Failed to terminate deals", {
          userId: user.id,
          firmId: profile.firm_id,
          dealIds,
          error: dealsUpdateError.message,
        });
        return NextResponse.json(
          { error: "Failed to terminate active deals during account deletion" },
          { status: 500 }
        );
      }

      // Terminate all engagements on those deals
      const { error: engagementsUpdateError } = await adminClient
        .from("deal_engagements")
        .update({ stage: "terminated" })
        .in("deal_id", dealIds);

      if (engagementsUpdateError) {
        console.error("[settings/delete-account][POST] Failed to terminate deal engagements", {
          userId: user.id,
          firmId: profile.firm_id,
          dealIds,
          error: engagementsUpdateError.message,
        });
        return NextResponse.json(
          { error: "Failed to terminate deal engagements during account deletion" },
          { status: 500 }
        );
      }

      // Notify buyers for each deal
      for (const dealId of dealIds) {
        notifyBuyers("deal_terminated", dealId);
      }
    }
  } else if (profile.role === "buyer") {
    // Set all active buyer engagements to passed (no reason recorded)
    const { error: buyerEngagementsUpdateError } = await adminClient
      .from("deal_engagements")
      .update({ stage: "passed" })
      .eq("buyer_user_id", user.id)
      .not("stage", "in", '("passed","terminated","closed","declined")');

    if (buyerEngagementsUpdateError) {
      console.error("[settings/delete-account][POST] Failed to mark buyer engagements as passed", {
        userId: user.id,
        error: buyerEngagementsUpdateError.message,
      });
      return NextResponse.json(
        { error: "Failed to update buyer engagements during account deletion" },
        { status: 500 }
      );
    }

    // Remove buyer deal closures first; these rows reference engagements without ON DELETE CASCADE
    const { error: buyerClosuresDeleteError } = await adminClient
      .from("deal_closures")
      .delete()
      .eq("buyer_user_id", user.id);

    if (buyerClosuresDeleteError) {
      console.error("[settings/delete-account][POST] Failed to delete buyer deal closures", {
        userId: user.id,
        error: buyerClosuresDeleteError.message,
      });
      return NextResponse.json(
        { error: "Failed to delete buyer deal closures during account deletion" },
        { status: 500 }
      );
    }

    // Remove buyer engagements after closures so firm/user deletes are not blocked by FK constraints
    const { error: buyerEngagementsDeleteError } = await adminClient
      .from("deal_engagements")
      .delete()
      .eq("buyer_user_id", user.id);

    if (buyerEngagementsDeleteError) {
      console.error("[settings/delete-account][POST] Failed to delete buyer deal engagements", {
        userId: user.id,
        error: buyerEngagementsDeleteError.message,
      });
      return NextResponse.json(
        { error: "Failed to delete buyer deal engagements during account deletion" },
        { status: 500 }
      );
    }

    // Remove user-authored activity rows because actor_id references users without ON DELETE CASCADE
    const { error: buyerActivityLogDeleteError } = await adminClient
      .from("deal_activity_log")
      .delete()
      .eq("actor_id", user.id);

    if (buyerActivityLogDeleteError) {
      console.error("[settings/delete-account][POST] Failed to delete buyer activity log rows", {
        userId: user.id,
        error: buyerActivityLogDeleteError.message,
      });
      return NextResponse.json(
        { error: "Failed to delete buyer activity logs during account deletion" },
        { status: 500 }
      );
    }

    // Remove buyer projects explicitly before user delete to avoid relational leftovers
    const { error: buyerProjectsDeleteError } = await adminClient
      .from("buyer_projects")
      .delete()
      .eq("buyer_user_id", user.id);

    if (buyerProjectsDeleteError) {
      console.error("[settings/delete-account][POST] Failed to delete buyer projects", {
        userId: user.id,
        error: buyerProjectsDeleteError.message,
      });
      return NextResponse.json(
        { error: "Failed to delete buyer projects during account deletion" },
        { status: 500 }
      );
    }
  }

  // Check if user is the only firm member
  if (profile.firm_id) {
    const { count, error: firmMemberCountError } = await adminClient
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("firm_id", profile.firm_id);

    if (firmMemberCountError) {
      console.error("[settings/delete-account][POST] Failed to count firm members", {
        userId: user.id,
        firmId: profile.firm_id,
        error: firmMemberCountError.message,
      });
      return NextResponse.json(
        { error: "Failed to verify firm membership during account deletion" },
        { status: 500 }
      );
    }

    if (count === 1) {
      // Sole member — delete firm (cascade will handle related records)
      const { error: firmDeleteError } = await adminClient
        .from("firms")
        .delete()
        .eq("id", profile.firm_id);

      if (firmDeleteError) {
        console.error("[settings/delete-account][POST] Failed to delete firm for sole member", {
          userId: user.id,
          firmId: profile.firm_id,
          error: firmDeleteError.message,
        });
        return NextResponse.json(
          { error: "Failed to delete firm during account deletion" },
          { status: 500 }
        );
      }
    }
    // If other members exist, firm + deals persist, user is just removed
  }

  // Delete user record from public.users (cascades notification_preferences, etc.)
  const { error: userDeleteError } = await adminClient
    .from("users")
    .delete()
    .eq("id", user.id);

  if (userDeleteError) {
    console.error("[settings/delete-account][POST] Failed to delete public user record", {
      userId: user.id,
      error: userDeleteError.message,
    });
    return NextResponse.json(
      { error: "Failed to delete user profile during account deletion" },
      { status: 500 }
    );
  }

  // Delete auth record
  const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(user.id);

  if (authDeleteError) {
    console.error("[settings/delete-account][POST] Failed to delete auth user", {
      userId: user.id,
      error: authDeleteError.message,
    });
    return NextResponse.json(
      { error: "Failed to delete auth account during account deletion" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
