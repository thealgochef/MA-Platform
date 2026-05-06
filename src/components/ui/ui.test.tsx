import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button, Card, SelectInput, TextInput } from ".";

describe("shared UI components", () => {
  it("renders card content with the shared surface styles", () => {
    render(<Card>Account settings</Card>);

    expect(screen.getByText("Account settings")).toHaveClass("bg-surface-alt");
  });

  it("associates text input labels and errors accessibly", () => {
    render(<TextInput label="Full Name" error="Name is required" />);

    const input = screen.getByLabelText("Full Name");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Name is required");
  });

  it("renders select input options with a label", () => {
    render(
      <SelectInput label="Buyer Type">
        <option value="strategic">Strategic</option>
      </SelectInput>
    );

    expect(screen.getByLabelText("Buyer Type")).toHaveDisplayValue("Strategic");
  });

  it("disables buttons while showing loading text", () => {
    render(
      <Button isLoading loadingText="Saving...">
        Save Profile
      </Button>
    );

    const button = screen.getByRole("button", { name: "Saving..." });
    expect(button).toBeDisabled();
  });
});
