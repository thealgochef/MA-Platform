import { describe, expect, it } from "vitest";
import { formatEngagementStageLabel } from "@/lib/engagement-stage-labels";

describe("formatEngagementStageLabel", () => {
  it("returns an em dash for nullish or empty values", () => {
    expect(formatEngagementStageLabel(undefined)).toBe("—");
    expect(formatEngagementStageLabel(null)).toBe("—");
    expect(formatEngagementStageLabel("")).toBe("—");
    expect(formatEngagementStageLabel("   ")).toBe("—");
  });

  it("formats known engagement examples", () => {
    expect(formatEngagementStageLabel("nda_pending")).toBe("NDA pending");
    expect(formatEngagementStageLabel("nda_signed")).toBe("NDA signed");
    expect(formatEngagementStageLabel("ioi_submitted")).toBe("IOI submitted");
    expect(formatEngagementStageLabel("loi_submitted")).toBe("LOI submitted");
    expect(formatEngagementStageLabel("passed")).toBe("Passed");
    expect(formatEngagementStageLabel("declined")).toBe("Declined");
  });

  it("normalizes mixed-case values and uppercases acronym tokens", () => {
    expect(formatEngagementStageLabel("NDA_PENDING")).toBe("NDA pending");
    expect(formatEngagementStageLabel("IoI_Submitted")).toBe("IOI submitted");
    expect(formatEngagementStageLabel("lOi_submitted")).toBe("LOI submitted");
    expect(formatEngagementStageLabel("DUE_DILIGENCE")).toBe("Due diligence");
    expect(formatEngagementStageLabel("  nda   signed  ")).toBe("NDA signed");
  });

  it("capitalizes only the first non-acronym word while preserving acronym tokens anywhere in the label", () => {
    expect(formatEngagementStageLabel("pre_nda_review")).toBe("Pre NDA review");
    expect(formatEngagementStageLabel("ready_for_ioi_and_loi")).toBe("Ready for IOI and LOI");
  });
});
