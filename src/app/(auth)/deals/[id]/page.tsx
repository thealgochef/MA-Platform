import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BrokerDealManagement from "@/components/broker/BrokerDealManagement";
import BuyerDealWorkspace from "@/components/buyer/BuyerDealWorkspace";

export default async function DealDetailPage() {
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

  if (profile.role === "broker") {
    return <BrokerDealManagement />;
  }

  return <BuyerDealWorkspace />;
}
