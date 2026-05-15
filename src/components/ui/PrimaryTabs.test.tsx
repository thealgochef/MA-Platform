import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Tab } from "@mui/material";
import { describe, expect, it, vi } from "vitest";

import { PrimaryTabs } from "./PrimaryTabs";

describe("PrimaryTabs", () => {
  it("makes all tabs tabbable", async () => {
    render(
      <PrimaryTabs value="matches" onChange={() => {}}>
        <Tab label="Matches" value="matches" />
        <Tab label="Active" value="active" />
        <Tab label="Archived" value="archive" />
      </PrimaryTabs>
    );

    await waitFor(() => {
      const tabs = screen.getAllByRole("tab");
      expect(tabs).toHaveLength(3);
      tabs.forEach((tab) => {
        expect(tab).toHaveAttribute("tabindex", "0");
      });
    });
  });

  it("keeps all tabs tabbable after active value changes", async () => {
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

    await waitFor(() => {
      const tabs = screen.getAllByRole("tab");
      tabs.forEach((tab) => {
        expect(tab).toHaveAttribute("tabindex", "0");
      });
    });
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
