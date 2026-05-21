import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BrokerDealManagement from "@/components/broker/BrokerDealManagement";
import BuyerDealWorkspace from "@/components/buyer/BuyerDealWorkspace";

export default async function DealDetailPage({
  searchParams,
}: {
  searchParams?: { saved?: string };
}) {
  const supabase = createClient();
  const showSavedBanner = searchParams?.saved === "1";

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
    return <BrokerDealManagement initialShowSavedBanner={showSavedBanner} />;
  }

  return <BuyerDealWorkspace />;
}
