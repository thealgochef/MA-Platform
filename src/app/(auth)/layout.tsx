import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/layout/Sidebar";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, role, status, avatar_path")
    .eq("id", user.id)
    .single();

  if (!profile || profile.status !== "approved") {
    redirect("/login");
  }

  let avatarUrl: string | undefined;
  if (profile.avatar_path) {
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("profile-pictures")
      .createSignedUrl(profile.avatar_path, 60 * 60);

    if (!signedUrlError && signedUrlData?.signedUrl) {
      avatarUrl = signedUrlData.signedUrl;
    }
  }

  return (
    <div className="flex min-h-screen bg-bg-alt">
      <Sidebar
        userName={profile.full_name || user.email || "User"}
        userRole={profile.role as "broker" | "buyer" | "admin"}
        avatarUrl={avatarUrl}
      />
      <main className="flex-1 lg:ml-0 min-w-0">{children}</main>
    </div>
  );
}
