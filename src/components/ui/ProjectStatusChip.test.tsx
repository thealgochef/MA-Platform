import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@mui/material", () => ({
  Chip: ({
    label,
    clickable,
    onClick,
  }: {
    label: ReactNode;
    clickable?: boolean;
    onClick?: (event: MouseEvent) => void;
  }) => (
    <button type="button" data-testid="project-status-chip" data-clickable={clickable ? "true" : "false"} onClick={onClick}>
      {label}
    </button>
  ),
}));

vi.mock("lucide-react", () => ({
  ChevronDown: ({ "aria-hidden": ariaHidden }: { "aria-hidden"?: boolean }) => (
    <span data-testid="project-status-chip-icon" aria-hidden={ariaHidden ? "true" : undefined} />
  ),
}));

import { ProjectStatusChip, getProjectStatusLabel } from "./ProjectStatusChip";

describe("ProjectStatusChip", () => {
  it("maps active, inactive, and missing states to stable labels", () => {
    expect(getProjectStatusLabel(true)).toBe("Active");
    expect(getProjectStatusLabel(false)).toBe("Inactive");
    expect(getProjectStatusLabel(null)).toBe("—");
    expect(getProjectStatusLabel(undefined)).toBe("—");
  });

  it("renders non-clickable chip text without interaction affordance", () => {
    render(<ProjectStatusChip isActive={false} />);

    expect(screen.getByTestId("project-status-chip")).toHaveAttribute("data-clickable", "false");
    expect(screen.getByText("Inactive")).toBeInTheDocument();
    expect(screen.queryByTestId("project-status-chip-icon")).not.toBeInTheDocument();
  });

  it("renders clickable chip with icon and calls onClick", () => {
    const onClick = vi.fn();
    render(<ProjectStatusChip isActive={true} clickable onClick={onClick} />);

    const chip = screen.getByTestId("project-status-chip");
    expect(chip).toHaveAttribute("data-clickable", "true");
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByTestId("project-status-chip-icon")).toHaveAttribute("aria-hidden", "true");

    fireEvent.click(chip);

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick.mock.calls[0][0]).toEqual(expect.objectContaining({
      preventDefault: expect.any(Function),
      stopPropagation: expect.any(Function),
    }));
  });

  it("does not invoke onClick when clickable is false", () => {
    const onClick = vi.fn();
    render(<ProjectStatusChip isActive={true} onClick={onClick} />);

    fireEvent.click(screen.getByTestId("project-status-chip"));

    expect(onClick).not.toHaveBeenCalled();
  });
});
