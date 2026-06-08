import { fireEvent, render, screen } from "@testing-library/react";
import { Tab } from "@mui/material";
import { describe, expect, it, vi } from "vitest";

import { PrimaryTabs } from "./PrimaryTabs";

describe("PrimaryTabs", () => {
  it("uses roving tabindex semantics", () => {
    render(
      <PrimaryTabs value="matches" onChange={() => {}}>
        <Tab label="Matches" value="matches" />
        <Tab label="Active" value="active" />
        <Tab label="Archived" value="archive" />
      </PrimaryTabs>
    );

    const matchesTab = screen.getByRole("tab", { name: "Matches" });
    const activeTab = screen.getByRole("tab", { name: "Active" });
    const archivedTab = screen.getByRole("tab", { name: "Archived" });

    expect(matchesTab).toHaveAttribute("tabindex", "0");
    expect(activeTab).toHaveAttribute("tabindex", "-1");
    expect(archivedTab).toHaveAttribute("tabindex", "-1");
  });

  it("updates roving tabindex when active value changes", () => {
    const { rerender } = render(
      <PrimaryTabs value="matches" onChange={() => {}}>
        <Tab label="Matches" value="matches" />
        <Tab label="Active" value="active" />
        <Tab label="Archived" value="archive" />
      </PrimaryTabs>
    );

    rerender(
      <PrimaryTabs value="active" onChange={() => {}}>
        <Tab label="Matches" value="matches" />
        <Tab label="Active" value="active" />
        <Tab label="Archived" value="archive" />
      </PrimaryTabs>
    );

    expect(screen.getByRole("tab", { name: "Matches" })).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("tab", { name: "Active" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: "Archived" })).toHaveAttribute("tabindex", "-1");
  });

  it("propagates onChange when a tab is clicked", () => {
    const handleChange = vi.fn();

    render(
      <PrimaryTabs value="matches" onChange={handleChange}>
        <Tab label="Matches" value="matches" />
        <Tab label="Active" value="active" />
        <Tab label="Archived" value="archive" />
      </PrimaryTabs>
    );

    fireEvent.click(screen.getByRole("tab", { name: "Active" }));

    expect(handleChange).toHaveBeenCalled();
    expect(handleChange.mock.calls.at(-1)?.[1]).toBe("active");
  });
});
