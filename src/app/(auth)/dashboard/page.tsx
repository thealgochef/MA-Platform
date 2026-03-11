import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BrokerDashboard from "@/components/broker/BrokerDashboard";
import BuyerDashboard from "@/components/buyer/BuyerDashboard";

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role === "admin") {
    redirect("/admin");
  }

  if (profile.role === "broker") {
    return <BrokerDashboard />;
  }

  return <BuyerDashboard />;
}
