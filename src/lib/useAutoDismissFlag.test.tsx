import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAutoDismissFlag } from "./useAutoDismissFlag";

function HookHarness({ initiallyVisible, delayMs = 4000 }: { initiallyVisible: boolean; delayMs?: number }) {
  const { isVisible, setIsVisible } = useAutoDismissFlag(initiallyVisible, delayMs);

  return (
    <div>
      <span data-testid="visibility">{isVisible ? "visible" : "hidden"}</span>
      <button type="button" onClick={() => setIsVisible(false)}>
        Dismiss
      </button>
    </div>
  );
}

describe("useAutoDismissFlag", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("auto-dismisses after the default delay when visible", () => {
    render(<HookHarness initiallyVisible />);

    expect(screen.getByTestId("visibility")).toHaveTextContent("visible");

    act(() => {
      vi.advanceTimersByTime(3999);
    });
    expect(screen.getByTestId("visibility")).toHaveTextContent("visible");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByTestId("visibility")).toHaveTextContent("hidden");
  });

  it("can be dismissed manually before the timer completes", () => {
    render(<HookHarness initiallyVisible />);

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.getByTestId("visibility")).toHaveTextContent("hidden");

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getByTestId("visibility")).toHaveTextContent("hidden");
  });

  it("resyncs visibility when the source value changes", () => {
    const { rerender } = render(<HookHarness initiallyVisible={false} delayMs={1000} />);
    expect(screen.getByTestId("visibility")).toHaveTextContent("hidden");

    rerender(<HookHarness initiallyVisible delayMs={1000} />);
    expect(screen.getByTestId("visibility")).toHaveTextContent("visible");

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId("visibility")).toHaveTextContent("hidden");
  });
});
