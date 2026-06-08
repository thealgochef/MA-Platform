import { NextResponse } from "next/server";
import { isValidStorageObjectKey, settingsProfileUpdateSchema } from "@/lib/validators";
import { isAuthResponse, requireApprovedUser } from "@/server/auth";

const SETTINGS_PROFILE_USER_SELECT =
  "role, full_name, title, avatar_path, location, industry_focus, license_credentials, deal_types, buyer_type, accreditation, aum, phone, linkedin, firm_id";

const SETTINGS_PROFILE_FIRM_SELECT =
  "name, description, website, location, team_members_requested";

export async function GET() {
  const context = await requireApprovedUser();
  if (isAuthResponse(context)) return context;
  const { supabase, user } = context;

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select(SETTINGS_PROFILE_USER_SELECT)
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("[settings/profile][GET] Failed to load profile", {
      userId: user.id,
      error: profileError.message,
    });
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Get firm data
  let firm = null;
  if (profile.firm_id) {
    const { data: firmData, error: firmError } = await supabase
      .from("firms")
      .select(SETTINGS_PROFILE_FIRM_SELECT)
      .eq("id", profile.firm_id)
      .single();
    if (firmError) {
      console.error("[settings/profile][GET] Failed to load firm", {
        userId: user.id,
        firmId: profile.firm_id,
        error: firmError.message,
      });
    }
    firm = firmData;
  }

  let avatarUrl: string | null = null;
  if (profile.avatar_path) {
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("profile-pictures")
      .createSignedUrl(profile.avatar_path, 60 * 60);

    if (!signedUrlError && signedUrlData?.signedUrl) {
      avatarUrl = signedUrlData.signedUrl;
    } else if (signedUrlError) {
      console.error("[settings/profile][GET] Failed to sign avatar URL", {
        userId: user.id,
        avatarPath: profile.avatar_path,
        error: signedUrlError.message,
      });
    }
  }

  return NextResponse.json({
    profile: {
      ...profile,
      avatar_url: avatarUrl,
      avatarUrl,
    },
    firm,
    avatar_url: avatarUrl,
    avatarUrl,
  });
}

export async function PATCH(request: Request) {
  const context = await requireApprovedUser();
  if (isAuthResponse(context)) return context;
  const { supabase, user } = context;

  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsedBody = settingsProfileUpdateSchema.safeParse(requestBody);

  if (!parsedBody.success) {
    return NextResponse.json({ error: "Invalid profile update payload" }, { status: 400 });
  }

  const body = parsedBody.data;

  // Get current user profile
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role, firm_id, avatar_path, full_name, title, phone, linkedin, location, industry_focus, license_credentials, deal_types, buyer_type, accreditation, aum")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("[settings/profile][PATCH] Failed to load profile", {
      userId: user.id,
      error: profileError.message,
    });
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  if (
    body.avatarPath !== undefined
    && body.avatarPath !== null
    && !isValidStorageObjectKey(body.avatarPath, { allowedPrefixes: [user.id] })
  ) {
    return NextResponse.json(
      { error: "avatarPath must be a safe storage object path scoped to the current user" },
      { status: 400 }
    );
  }

  // Update user fields
  const userUpdate: Record<string, unknown> = {};
  const rollbackUserUpdate: Record<string, unknown> = {};
  if (body.fullName !== undefined) userUpdate.full_name = body.fullName;
  if (body.title !== undefined) userUpdate.title = body.title;
  if (body.avatarPath !== undefined) userUpdate.avatar_path = body.avatarPath;
  if (body.phone !== undefined) userUpdate.phone = body.phone;
  if (body.linkedIn !== undefined) userUpdate.linkedin = body.linkedIn;
  if (body.location !== undefined) userUpdate.location = body.location;
  if (body.industryFocus !== undefined) userUpdate.industry_focus = body.industryFocus;
  if (body.licenseCredentials !== undefined) {
    if (profile.role !== "broker") {
      return NextResponse.json(
        { error: "licenseCredentials can only be updated by broker users" },
        { status: 400 }
      );
    }

    userUpdate.license_credentials = body.licenseCredentials;
  }
  if (body.dealTypes !== undefined) {
    if (profile.role !== "broker") {
      return NextResponse.json(
        { error: "dealTypes can only be updated by broker users" },
        { status: 400 }
      );
    }

    userUpdate.deal_types = body.dealTypes;
  }
  if (body.buyerType !== undefined) {
    const buyerType = body.buyerType === "" ? null : body.buyerType;

    if (buyerType !== null && profile.role !== "buyer") {
      return NextResponse.json(
        { error: "buyerType can only be updated by buyer users" },
        { status: 400 }
      );
    }

    if (profile.role === "buyer") {
      userUpdate.buyer_type = buyerType;
    }
  }
  if (body.accreditation !== undefined) {
    const accreditation = body.accreditation === "" ? null : body.accreditation;

    if (accreditation !== null && profile.role !== "buyer") {
      return NextResponse.json(
        { error: "accreditation can only be updated by buyer users" },
        { status: 400 }
      );
    }

    if (profile.role === "buyer") {
      userUpdate.accreditation = accreditation;
    }
  }
  if (body.aum !== undefined) {
    if (profile.role !== "buyer") {
      return NextResponse.json(
        { error: "aum can only be updated by buyer users" },
        { status: 400 }
      );
    }

    userUpdate.aum = body.aum;
  }

  for (const key of Object.keys(userUpdate)) {
    rollbackUserUpdate[key] = profile[key as keyof typeof profile];
  }

  const shouldUpdateUser = Object.keys(userUpdate).length > 0;
  const shouldRemoveOldAvatar = body.avatarPath === null && profile.avatar_path;

  if (shouldUpdateUser) {
    const { error: userError } = await supabase
      .from("users")
      .update(userUpdate)
      .eq("id", user.id);

    if (userError) {
      console.error("[settings/profile][PATCH] Failed to update user", {
        userId: user.id,
        error: userError.message,
      });
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }
  }

  // Update firm fields
  if (profile.firm_id) {
    const firmUpdate: Record<string, unknown> = {};
    if (body.firmName !== undefined) firmUpdate.name = body.firmName;
    if (body.description !== undefined) firmUpdate.description = body.description;
    if (body.website !== undefined) firmUpdate.website = body.website;
    if (body.firmLocation !== undefined) firmUpdate.location = body.firmLocation;
    if (body.otherMembers !== undefined) firmUpdate.team_members_requested = body.otherMembers;
    if (body.firmIndustryFocus !== undefined) firmUpdate.industry_focus = body.firmIndustryFocus;

    if (Object.keys(firmUpdate).length > 0) {
      const { error: firmError } = await supabase
        .from("firms")
        .update(firmUpdate)
        .eq("id", profile.firm_id);

      if (firmError) {
        if (shouldUpdateUser) {
          const { error: rollbackError } = await supabase
            .from("users")
            .update(rollbackUserUpdate)
            .eq("id", user.id);

          if (rollbackError) {
            console.error("[settings/profile][PATCH] Failed to rollback user after firm update failure", {
              userId: user.id,
              firmId: profile.firm_id,
              originalError: firmError.message,
              rollbackError: rollbackError.message,
            });
            return NextResponse.json(
              { error: "Failed to update firm and failed to rollback user profile changes" },
              { status: 500 }
            );
          }
        }

        console.error("[settings/profile][PATCH] Failed to update firm", {
          userId: user.id,
          firmId: profile.firm_id,
          error: firmError.message,
        });
        const rollbackMessage = shouldUpdateUser ? ". User profile changes were rolled back." : "";
        return NextResponse.json(
          { error: `Failed to update firm${rollbackMessage}` },
          { status: 500 }
        );
      }
    }
  }

  if (shouldRemoveOldAvatar) {
    const { error: removeError } = await supabase.storage.from("profile-pictures").remove([profile.avatar_path]);
    if (removeError) {
      console.error("[settings/profile][PATCH] Failed to remove avatar", {
        userId: user.id,
        avatarPath: profile.avatar_path,
        error: removeError.message,
      });
    }
  }

  return NextResponse.json({ success: true });
}
