import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { invitationTokenSchema } from "@/lib/validators";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const invitationToken = searchParams.get("invitation");

  console.log(
    "[auth/callback] Hit callback route. code:",
    code ? "present" : "missing",
  );

  if (code) {
    // Collect cookies that Supabase needs to set
    const cookiesToReturn: {
      name: string;
      value: string;
      options: CookieOptions;
    }[] = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(
            cookiesToSet: {
              name: string;
              value: string;
              options: CookieOptions;
            }[],
          ) {
            // Save cookies — we'll apply them to the redirect response
            cookiesToSet.forEach((cookie) => cookiesToReturn.push(cookie));
          },
        },
      },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    console.log(
      "[auth/callback] exchangeCodeForSession error:",
      error?.message ?? "none",
    );
    console.log("[auth/callback] Cookies to set:", cookiesToReturn.length);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      console.log(
        "[auth/callback] user:",
        user?.id ?? "null",
        user?.email ?? "",
      );

      if (user) {
        // Helper: create redirect with auth cookies applied
        const redirectWithCookies = (url: string) => {
          console.log("[auth/callback] Redirecting to:", url);
          const response = NextResponse.redirect(url);
          cookiesToReturn.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
          return response;
        };

        // Handle invitation token with service-role writes. The cookie-aware
        // client above is used only to verify OAuth/session identity for this
        // flow; invitation lookup/consumption and profile approval update use
        // the admin client because these columns are intentionally protected
        // from browser-authenticated self-update.
        if (invitationToken) {
          const parsedInvitationToken = invitationTokenSchema.safeParse(invitationToken);
          if (!parsedInvitationToken.success) {
            console.warn("[auth/callback] invalid invitation token format");
          } else {
            const adminClient = createAdminClient();
            const { data: invitation, error: invitationLookupError } =
              await adminClient
                .from("firm_invitations")
                .select("id,email,firm_id,role,consumed_at,invitation_token")
                .eq("invitation_token", parsedInvitationToken.data)
                .maybeSingle();

            if (invitationLookupError) {
              console.error(
                "[auth/callback] invitation lookup error:",
                invitationLookupError.message,
              );
            }

            const authenticatedEmail = user.email?.trim().toLowerCase();
            const invitationEmail = invitation?.email?.trim().toLowerCase();
            const invitationEmailMatchesAuthenticatedUser =
              Boolean(authenticatedEmail) &&
              Boolean(invitationEmail) &&
              invitationEmail === authenticatedEmail;

            if (invitation?.consumed_at) {
              console.warn("[auth/callback] invitation already consumed");
            } else if (invitation && invitationEmailMatchesAuthenticatedUser) {
              const { error: acceptInvitationError } = await adminClient.rpc(
                "accept_firm_invitation",
                {
                  p_invitation_token: parsedInvitationToken.data,
                  p_user_id: user.id,
                  p_user_email: user.email!,
                  p_full_name: user.user_metadata?.full_name || user.email!,
                }
              );

              if (!acceptInvitationError) {
                return redirectWithCookies(`${origin}/dashboard`);
              }

              console.error(
                "[auth/callback] invitation acceptance error:",
                acceptInvitationError.message,
              );
            } else if (invitation) {
              console.warn(
                "[auth/callback] invitation email mismatch for authenticated user",
              );
            }
          }
        }

        // Check if user has a profile
        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();

        console.log(
          "[auth/callback] profile:",
          profile
            ? `status=${profile.status}, role=${profile.role}, agreement=${profile.membership_agreement_signed}`
            : "null",
        );
        console.log(
          "[auth/callback] profileError:",
          profileError?.message ?? "none",
        );

        if (profile) {
          if (profile.status === "approved") {
            if (profile.role === "admin") {
              return redirectWithCookies(`${origin}/admin`);
            }
            return redirectWithCookies(`${origin}/dashboard`);
          }
          if (profile.status === "pending") {
            if (profile.membership_agreement_signed) {
              return redirectWithCookies(`${origin}/pending-approval`);
            }
            return redirectWithCookies(`${origin}/signup/select-role`);
          }
          // Rejected/suspended/banned
          return redirectWithCookies(`${origin}/login?error=${profile.status}`);
        }

        // New user — trigger may not have fired (e.g. soft-deleted user restored)
        // Use upsert with ON CONFLICT to handle race condition where trigger already inserted
        const { error: insertError } = await supabase.from("users").upsert(
          {
            id: user.id,
            email: user.email!,
            full_name: user.user_metadata?.full_name || user.email!,
            role: "buyer",
            status: "pending",
          },
          { onConflict: "id", ignoreDuplicates: true },
        );

        console.log(
          "[auth/callback] upsert profile error:",
          insertError?.message ?? "none",
        );

        // Whether insert succeeded or was skipped (row exists), send to select-role
        return redirectWithCookies(`${origin}/signup/select-role`);
      }
    }
  }

  console.log("[auth/callback] Falling through to auth_failed");
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
