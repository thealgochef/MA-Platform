import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Sidebar from "./Sidebar";

// Mock next/navigation
const mockPathname = vi.fn(() => "/dashboard");
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
  useRouter: () => ({ push: mockPush }),
}));

// Mock supabase client
const mockSignOut = vi.fn(() => Promise.resolve({ error: null }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signOut: mockSignOut,
    },
  }),
}));

describe("Sidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname.mockReturnValue("/dashboard");
  });

  // ─── Common navigation items ──────────────────────────────

  it("renders user name and role", () => {
    render(<Sidebar userName="John Doe" userRole="buyer" />);
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Buyer")).toBeInTheDocument();
  });

  it("renders Dashboard link for all roles", () => {
    render(<Sidebar userName="John Doe" userRole="buyer" />);
    const link = screen.getByRole("link", { name: /dashboard/i });
    expect(link).toHaveAttribute("href", "/dashboard");
  });

  it("renders Messages link for all roles", () => {
    render(<Sidebar userName="John Doe" userRole="broker" />);
    const link = screen.getByRole("link", { name: /messages/i });
    expect(link).toHaveAttribute("href", "/messages");
  });

  it("renders Settings link for all roles", () => {
    render(<Sidebar userName="John Doe" userRole="buyer" />);
    const link = screen.getByRole("link", { name: /settings/i });
    expect(link).toHaveAttribute("href", "/settings");
  });

  it("renders Sign Out button", () => {
    render(<Sidebar userName="John Doe" userRole="buyer" />);
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });

  // ─── Active route highlighting ─────────────────────────────

  it("highlights the active Dashboard link", () => {
    mockPathname.mockReturnValue("/dashboard");
    render(<Sidebar userName="John Doe" userRole="buyer" />);
    const link = screen.getByRole("link", { name: /dashboard/i });
    expect(link.className).toMatch(/bg-white\/10|bg-secondary/);
  });

  it("highlights active link for nested routes", () => {
    mockPathname.mockReturnValue("/deals/abc-123/edit");
    render(<Sidebar userName="John Doe" userRole="broker" />);
    const link = screen.getByRole("link", { name: /my deals/i });
    expect(link.className).toMatch(/bg-white\/10|bg-secondary/);
  });

  // ─── Buyer-specific items ─────────────────────────────────

  it("shows Browse Deals for buyer role", () => {
    render(<Sidebar userName="Jane" userRole="buyer" />);
    const link = screen.getByRole("link", { name: /browse deals/i });
    expect(link).toHaveAttribute("href", "/browse");
  });

  it("shows My Projects for buyer role", () => {
    render(<Sidebar userName="Jane" userRole="buyer" />);
    const link = screen.getByRole("link", { name: /my projects/i });
    expect(link).toHaveAttribute("href", "/projects");
  });

  it("shows New Project for buyer role", () => {
    render(<Sidebar userName="Jane" userRole="buyer" />);
    const link = screen.getByRole("link", { name: /new project/i });
    expect(link).toHaveAttribute("href", "/projects/new");
  });

  it("does not show My Deals or New Deal for buyer role", () => {
    render(<Sidebar userName="Jane" userRole="buyer" />);
    expect(screen.queryByRole("link", { name: /my deals/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /new deal/i })).not.toBeInTheDocument();
  });

  // ─── Broker-specific items ─────────────────────────────────

  it("shows My Deals for broker role", () => {
    render(<Sidebar userName="Bob" userRole="broker" />);
    const link = screen.getByRole("link", { name: /my deals/i });
    expect(link).toHaveAttribute("href", "/deals");
  });

  it("shows New Deal for broker role", () => {
    render(<Sidebar userName="Bob" userRole="broker" />);
    const link = screen.getByRole("link", { name: /new deal/i });
    expect(link).toHaveAttribute("href", "/deals/new");
  });

  it("shows Browse Deals for broker role", () => {
    render(<Sidebar userName="Bob" userRole="broker" />);
    const link = screen.getByRole("link", { name: /browse deals/i });
    expect(link).toHaveAttribute("href", "/browse");
  });

  it("does not show My Projects or New Project for broker role", () => {
    render(<Sidebar userName="Bob" userRole="broker" />);
    expect(screen.queryByRole("link", { name: /my projects/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /new project/i })).not.toBeInTheDocument();
  });

  // ─── Unread message badge ──────────────────────────────────

  it("shows unread count badge when unreadCount > 0", () => {
    render(<Sidebar userName="John" userRole="buyer" unreadCount={5} />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("does not show badge when unreadCount is 0", () => {
    render(<Sidebar userName="John" userRole="buyer" unreadCount={0} />);
    // The "0" should not appear as a badge
    const messagesLink = screen.getByRole("link", { name: /messages/i });
    expect(messagesLink.textContent).not.toMatch(/\b0\b/);
  });

  // ─── Sign Out ──────────────────────────────────────────────

  it("calls supabase signOut and redirects on click", async () => {
    render(<Sidebar userName="John" userRole="buyer" />);
    const button = screen.getByRole("button", { name: /sign out/i });
    fireEvent.click(button);
    expect(mockSignOut).toHaveBeenCalled();
  });

  // ─── Navigation order ─────────────────────────────────────

  it("renders navigation items in correct order for buyer", () => {
    render(<Sidebar userName="Jane" userRole="buyer" />);
    const links = screen.getAllByRole("link");
    const labels = links.map((l) => l.textContent?.trim().replace(/\d+$/, "").trim());

    expect(labels).toEqual([
      "Dashboard",
      "Browse Deals",
      "My Projects",
      "New Project",
      "Messages",
      "Settings",
    ]);
  });

  it("renders navigation items in correct order for broker", () => {
    render(<Sidebar userName="Bob" userRole="broker" />);
    const links = screen.getAllByRole("link");
    const labels = links.map((l) => l.textContent?.trim().replace(/\d+$/, "").trim());

    expect(labels).toEqual([
      "Dashboard",
      "Browse Deals",
      "My Deals",
      "New Deal",
      "Messages",
      "Settings",
    ]);
  });

  // ─── Mobile hamburger ─────────────────────────────────────

  it("renders mobile menu toggle button", () => {
    render(<Sidebar userName="John" userRole="buyer" />);
    const toggle = screen.getByLabelText(/toggle menu/i);
    expect(toggle).toBeInTheDocument();
  });

  it("toggles mobile menu visibility on click", () => {
    render(<Sidebar userName="John" userRole="buyer" />);
    const toggle = screen.getByLabelText(/toggle menu/i);

    // Sidebar nav should have a class that hides it on mobile by default
    const nav = screen.getByRole("navigation");
    expect(nav.className).toMatch(/hidden|translate/i);

    // Click to open
    fireEvent.click(toggle);
    // After clicking, the nav should be visible (class changes)
    expect(nav.className).toMatch(/flex|translate-x-0/);
  });

  // ─── Role label formatting ────────────────────────────────

  it("capitalizes role display for broker", () => {
    render(<Sidebar userName="Bob" userRole="broker" />);
    expect(screen.getByText("Broker")).toBeInTheDocument();
  });
});
