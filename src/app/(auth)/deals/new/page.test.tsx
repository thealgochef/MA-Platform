import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockState.push }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: null } })),
    },
  }),
}));

import CreateDealPage from "./page";

describe("CreateDealPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ deal: { id: "deal-123" } }),
      }))
    );
  });

  it("serializes selected industry as a single-item array in the create payload", async () => {
    render(<CreateDealPage />);

    const industryField = screen.getByLabelText("Industry *");

    fireEvent.change(industryField, { target: { value: "Industrial" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/deals",
        expect.objectContaining({
          method: "POST",
          body: expect.any(String),
        })
      );
    });

    const requestOptions = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as { body: string };
    const requestBody = JSON.parse(requestOptions.body);

    expect(requestBody.industry).toEqual(["Industrial"]);
  });

  it("serializes missing industry as an empty array in the create payload (API may still reject it)", async () => {
    render(<CreateDealPage />);

    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/deals",
        expect.objectContaining({
          method: "POST",
          body: expect.any(String),
        })
      );
    });

    const requestOptions = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as { body: string };
    const requestBody = JSON.parse(requestOptions.body);

    expect(requestBody.industry).toEqual([]);
  });
});
