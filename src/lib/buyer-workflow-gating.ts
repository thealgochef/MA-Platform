import type { DealStatus, EngagementStage, NdaStatus } from "@/types";

type WorkflowEngagement = {
  nda_status?: NdaStatus | string | null;
  cim_released?: boolean | null;
  stage?: EngagementStage | string | null;
} | null;

interface BuyerWorkflowEligibilityInput {
  isApprovedBuyer: boolean;
  dealStatus?: DealStatus | string | null;
  engagement: WorkflowEngagement;
}

export function canBuyerAccessIoiWorkflow({
  isApprovedBuyer,
  dealStatus,
  engagement,
}: BuyerWorkflowEligibilityInput): boolean {
  if (!isApprovedBuyer || dealStatus !== "accepting_iois" || !engagement) {
    return false;
  }

  if (engagement.nda_status !== "signed" || engagement.cim_released !== true) {
    return false;
  }

  return engagement.stage === "nda_signed" || engagement.stage === "ioi_submitted";
}

export function canBuyerAccessLoiWorkflow({
  isApprovedBuyer,
  dealStatus,
  engagement,
}: BuyerWorkflowEligibilityInput): boolean {
  if (!isApprovedBuyer || dealStatus !== "accepting_lois" || !engagement) {
    return false;
  }

  if (engagement.nda_status !== "signed") {
    return false;
  }

  return engagement.stage === "ioi_submitted" || engagement.stage === "loi_submitted";
}

export function canBuyerAccessCloseWorkflow({
  isApprovedBuyer,
  dealStatus,
  engagement,
}: BuyerWorkflowEligibilityInput): boolean {
  if (!isApprovedBuyer || dealStatus !== "closed" || !engagement) {
    return false;
  }

  return engagement.stage === "closed";
}
