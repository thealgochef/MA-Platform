import { canBuyerAccessIoiWorkflow, canBuyerAccessLoiWorkflow } from "@/lib/buyer-workflow-gating";

export interface BuyerDealActionConfig {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "contained" | "outlined";
}

interface BuyerDealActionDeal {
  id: string;
  status: string;
  engagement: {
    stage?: string | null;
    nda_status?: string | null;
    cim_released?: boolean | null;
  } | null;
}

interface BuyerDealActionOptions {
  onNavigate: (href: string) => void;
  onPursue: (dealId: string) => void;
  onDecline: (dealId: string) => void;
  actionLoadingDealId: string | null;
  isApprovedBuyer: boolean;
}

export function getBuyerDealActions(
  deal: BuyerDealActionDeal,
  options: BuyerDealActionOptions
): BuyerDealActionConfig[] {
  const encodedDealId = encodeURIComponent(deal.id);
  const isApprovedBuyer = options.isApprovedBuyer;
  const stage = deal.engagement?.stage;
  const isNdaPending = stage === "nda_pending";
  const isEngaged = Boolean(deal.engagement) && stage !== "declined";
  const isDeclined = stage === "declined";
  const isLoading = options.actionLoadingDealId === deal.id;
  const canAccessIoiWorkflow = canBuyerAccessIoiWorkflow({
    isApprovedBuyer,
    dealStatus: deal.status,
    engagement: deal.engagement,
  });
  const canAccessLoiWorkflow = canBuyerAccessLoiWorkflow({
    isApprovedBuyer,
    dealStatus: deal.status,
    engagement: deal.engagement,
  });

  const primaryAction = (() => {
    if (stage === "nda_pending") {
      return {
        label: "Sign NDA",
        onClick: () => options.onNavigate(`/deals/${encodedDealId}/nda`),
      };
    }

    if (stage === "nda_signed" && canAccessIoiWorkflow) {
      return {
        label: "Submit IOI",
        onClick: () => options.onNavigate(`/deals/${encodedDealId}/ioi`),
      };
    }

    if (stage === "ioi_submitted" && canAccessIoiWorkflow) {
      return {
        label: "View IOI",
        onClick: () => options.onNavigate(`/deals/${encodedDealId}/ioi`),
      };
    }

    if ((stage === "ioi_submitted" || stage === "loi_submitted") && canAccessLoiWorkflow) {
      return {
        label: stage === "loi_submitted" ? "View LOI" : "Submit LOI",
        onClick: () => options.onNavigate(`/deals/${encodedDealId}/loi`),
      };
    }

    if (!isEngaged || isDeclined) {
      return {
        label: "Pursue",
        onClick: () => options.onPursue(deal.id),
        disabled: isLoading,
      };
    }

    return null;
  })();

  const shouldRenderSinglePrimaryAction = Boolean(primaryAction) && (isNdaPending || isDeclined || isEngaged);
  if (shouldRenderSinglePrimaryAction && primaryAction) {
    return [primaryAction];
  }

  if (!isNdaPending && !isEngaged && !isDeclined) {
    return [
      {
        label: "Pursue",
        onClick: () => options.onPursue(deal.id),
        disabled: isLoading,
      },
      {
        label: "Decline",
        onClick: () => options.onDecline(deal.id),
        disabled: isLoading,
        variant: "outlined",
      },
    ];
  }

  return [];
}
