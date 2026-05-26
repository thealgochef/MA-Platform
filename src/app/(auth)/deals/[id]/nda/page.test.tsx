import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import NDASigningPage from "./page";

const mockPush = vi.fn();
const mockUseParams = vi.fn(() => ({ id: "deal-1" }));

vi.mock("next/navigation", () => ({
  useParams: () => mockUseParams(),
  useRouter: () => ({ push: mockPush }),
}));

type NdaResponse = {
  deal: {
    id: string;
    headline: string;
    nda_type: "platform" | "custom";
    nda_document_path: string | null;
  };
  engagement: {
    id: string;
    stage: string;
    nda_status: string;
  };
  serverDate: string;
};

function buildNdaResponse(ndaStatus: string): NdaResponse {
  return {
    deal: {
      id: "deal-1",
      headline: "Acme Industrial",
      nda_type: "platform",
      nda_document_path: null,
    },
    engagement: {
      id: "engagement-1",
      stage: "nda_pending",
      nda_status: ndaStatus,
    },
    serverDate: "2026-05-22",
  };
}

describe("NDASigningPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("hides signature section and actions when viewing a signed NDA", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => buildNdaResponse("signed"),
      }))
    );

    render(<NDASigningPage />);

    await screen.findByRole("heading", { name: "Non-Disclosure Agreement" });

    expect(screen.queryByText("Electronic Signature")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign NDA" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Decline NDA" })).not.toBeInTheDocument();
  });

  it("shows signature section and actions when NDA is available to sign", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => buildNdaResponse("sent"),
      }))
    );

    render(<NDASigningPage />);

    expect(await screen.findByText("Electronic Signature")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign NDA" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Decline NDA" })).toBeInTheDocument();
  });

  it("shows unavailable state when NDA endpoint returns 403", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 403,
        json: async () => ({ error: "NDA not available" }),
      }))
    );

    render(<NDASigningPage />);

    expect(await screen.findByText("NDA not available for this deal.")).toBeInTheDocument();

    expect(screen.queryByRole("heading", { name: "Non-Disclosure Agreement" })).not.toBeInTheDocument();
    expect(screen.queryByText("Electronic Signature")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign NDA" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Decline NDA" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to dashboard" })).toBeInTheDocument();
  });
});
