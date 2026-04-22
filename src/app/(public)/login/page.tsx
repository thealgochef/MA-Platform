"use client";

import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const handleGoogleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-surface">
      <div className="bg-bg rounded-xl shadow-md p-8 w-full max-w-md">

        <div className="text-center mb-8">
          <h1 className="text-4xl font-display font-bold text-text mb-2">Geneva Holdings</h1>
          <p className="text-secondary">
            Professional M&amp;A Marketplace
          </p>
        </div>

        {error === "rejected" && (
          <div className="bg-error/10 border border-error/20 text-error rounded-md p-3 mb-6 text-sm">
            Your application has been reviewed and was not approved at this time.
          </div>
        )}

        {error === "suspended" && (
          <div className="bg-warning/10 border border-warning/20 text-warning rounded-md p-3 mb-6 text-sm">
            Your account has been suspended. Please contact support.
          </div>
        )}

        {error === "banned" && (
          <div className="bg-error/10 border border-error/20 text-error rounded-md p-3 mb-6 text-sm">
            Your account has been permanently banned.
          </div>
        )}

        {error === "auth_failed" && (
          <div className="bg-error/10 border border-error/20 text-error rounded-md p-3 mb-6 text-sm">
            Authentication failed. Please try again.
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-primary text-body text-bg rounded-md py-3 px-4 font-medium hover:bg-btn-hover transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        <p className="mt-6 text-text text-xs text-center">
          New to Geneva Holdings? Click above to sign in with Google and start your application.
        </p>

      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
