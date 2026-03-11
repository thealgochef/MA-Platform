import { VALID_DEAL_TRANSITIONS, FEE_RATES } from "./constants";

export function isValidDealTransition(from: string, to: string): boolean {
  const allowed = VALID_DEAL_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

export function calculateFees(enterpriseValue: number): {
  successFee: number;
  brokerIncentive: number;
} {
  return {
    successFee: enterpriseValue * FEE_RATES.SUCCESS_FEE,
    brokerIncentive: enterpriseValue * FEE_RATES.BROKER_INCENTIVE,
  };
}
