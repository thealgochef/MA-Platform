import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import Sidebar from "./Sidebar";

// Mock next/navigation
const mockPathname = vi.fn(() => "/dashboard");
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
  useRouter: () => ({ push: mockPush }),
}));

// Mock supabase client
type MockSignOutResult = { error: unknown | null };
const mockSignOut = vi
  .fn<() => Promise<MockSignOutResult>>()
  .mockResolvedValue({ error: null });
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signOut: mockSignOut,
    },
  }),
}));

describe("Sidebar", () => {
  const getDesktopNav = () => screen.getByRole("navigation", { name: /desktop sidebar navigation/i });
  const getMobileToggle = () => screen.getByLabelText(/toggle menu/i);
  const openMobileDrawer = () => {
    fireEvent.click(getMobileToggle());
    return screen.getByRole("navigation", { name: /mobile sidebar navigation/i });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname.mockReturnValue("/dashboard");
  });

  // ─── Common navigation items ──────────────────────────────

  it("renders user name and role", () => {
    render(<Sidebar userName="John Doe" userRole="buyer" />);
    const desktopNav = getDesktopNav();
    expect(within(desktopNav).getByText("John Doe")).toBeInTheDocument();
    expect(within(desktopNav).getByText("Buyer")).toBeInTheDocument();
  });

  it("renders Dashboard link for all roles", () => {
    render(<Sidebar userName="John Doe" userRole="buyer" />);
    const link = within(getDesktopNav()).getByRole("link", { name: /dashboard/i });
    expect(link).toHaveAttribute("href", "/dashboard");
  });

  it("renders Messages link for all roles", () => {
    render(<Sidebar userName="John Doe" userRole="broker" />);
    const link = within(getDesktopNav()).getByRole("link", { name: /messages/i });
    expect(link).toHaveAttribute("href", "/messages");
  });

  it("renders Settings link for all roles", () => {
    render(<Sidebar userName="John Doe" userRole="buyer" />);
    const link = within(getDesktopNav()).getByRole("link", { name: /settings/i });
    expect(link).toHaveAttribute("href", "/settings");
  });

  it("renders Sign Out button", () => {
    render(<Sidebar userName="John Doe" userRole="buyer" />);
    expect(within(getDesktopNav()).getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });

  // ─── Active route highlighting ─────────────────────────────

  it("highlights the active Dashboard link", () => {
    mockPathname.mockReturnValue("/dashboard");
    render(<Sidebar userName="John Doe" userRole="buyer" />);
    const link = within(getDesktopNav()).getByRole("link", { name: /dashboard/i });
    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("highlights active link for nested routes", () => {
    mockPathname.mockReturnValue("/deals/abc-123/edit");
    render(<Sidebar userName="John Doe" userRole="broker" />);
    const link = within(getDesktopNav()).getByRole("link", { name: /my deals/i });
    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("marks only New Deal as current on /deals/new", () => {
    mockPathname.mockReturnValue("/deals/new");
    render(<Sidebar userName="John Doe" userRole="broker" />);

    const desktopNav = getDesktopNav();
    const activeLinks = within(desktopNav).getAllByRole("link", { current: "page" });
    const newDealLink = within(desktopNav).getByRole("link", { name: /new deal/i });
    const myDealsLink = within(desktopNav).getByRole("link", { name: /my deals/i });

    expect(activeLinks).toHaveLength(1);
    expect(newDealLink).toHaveAttribute("aria-current", "page");
    expect(myDealsLink).not.toHaveAttribute("aria-current", "page");
  });

  it("marks only New Project as current on /projects/new", () => {
    mockPathname.mockReturnValue("/projects/new");
    render(<Sidebar userName="John Doe" userRole="buyer" />);

    const desktopNav = getDesktopNav();
    const activeLinks = within(desktopNav).getAllByRole("link", { current: "page" });
    const newProjectLink = within(desktopNav).getByRole("link", { name: /new project/i });
    const myProjectsLink = within(desktopNav).getByRole("link", { name: /my projects/i });

    expect(activeLinks).toHaveLength(1);
    expect(newProjectLink).toHaveAttribute("aria-current", "page");
    expect(myProjectsLink).not.toHaveAttribute("aria-current", "page");
  });

  // ─── Buyer-specific items ─────────────────────────────────

  it("shows Browse Deals for buyer role", () => {
    render(<Sidebar userName="Jane" userRole="buyer" />);
    const link = within(getDesktopNav()).getByRole("link", { name: /browse deals/i });
    expect(link).toHaveAttribute("href", "/browse");
  });

  it("shows My Projects for buyer role", () => {
    render(<Sidebar userName="Jane" userRole="buyer" />);
    const link = within(getDesktopNav()).getByRole("link", { name: /my projects/i });
    expect(link).toHaveAttribute("href", "/projects");
  });

  it("shows New Project for buyer role", () => {
    render(<Sidebar userName="Jane" userRole="buyer" />);
    const link = within(getDesktopNav()).getByRole("link", { name: /new project/i });
    expect(link).toHaveAttribute("href", "/projects/new");
  });

  it("does not show My Deals or New Deal for buyer role", () => {
    render(<Sidebar userName="Jane" userRole="buyer" />);
    const desktopNav = getDesktopNav();
    expect(within(desktopNav).queryByRole("link", { name: /my deals/i })).not.toBeInTheDocument();
    expect(within(desktopNav).queryByRole("link", { name: /new deal/i })).not.toBeInTheDocument();
  });

  // ─── Broker-specific items ─────────────────────────────────

  it("shows My Deals for broker role", () => {
    render(<Sidebar userName="Bob" userRole="broker" />);
    const link = within(getDesktopNav()).getByRole("link", { name: /my deals/i });
    expect(link).toHaveAttribute("href", "/deals");
  });

  it("shows New Deal for broker role", () => {
    render(<Sidebar userName="Bob" userRole="broker" />);
    const link = within(getDesktopNav()).getByRole("link", { name: /new deal/i });
    expect(link).toHaveAttribute("href", "/deals/new");
  });

  it("shows Browse Deals for broker role", () => {
    render(<Sidebar userName="Bob" userRole="broker" />);
    const link = within(getDesktopNav()).getByRole("link", { name: /browse deals/i });
    expect(link).toHaveAttribute("href", "/browse");
  });

  it("does not show My Projects or New Project for broker role", () => {
    render(<Sidebar userName="Bob" userRole="broker" />);
    const desktopNav = getDesktopNav();
    expect(within(desktopNav).queryByRole("link", { name: /my projects/i })).not.toBeInTheDocument();
    expect(within(desktopNav).queryByRole("link", { name: /new project/i })).not.toBeInTheDocument();
  });

  // ─── Unread message badge ──────────────────────────────────

  it("shows unread count badge when unreadCount > 0", () => {
    render(<Sidebar userName="John" userRole="buyer" unreadCount={5} />);
    expect(within(getDesktopNav()).getByText("5")).toBeInTheDocument();
  });

  it("does not show badge when unreadCount is 0", () => {
    render(<Sidebar userName="John" userRole="buyer" unreadCount={0} />);
    // The "0" should not appear as a badge
    const messagesLink = within(getDesktopNav()).getByRole("link", { name: /messages/i });
    expect(messagesLink.textContent).not.toMatch(/\b0\b/);
  });

  // ─── Sign Out ──────────────────────────────────────────────

  it("calls supabase signOut and redirects on click", async () => {
    render(<Sidebar userName="John" userRole="buyer" />);
    const button = within(getDesktopNav()).getByRole("button", { name: /sign out/i });
    fireEvent.click(button);
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/");
    });
  });

  it("does not redirect and logs error when sign out fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const signOutError = { message: "Sign out failed" };
    mockSignOut.mockResolvedValueOnce({ error: signOutError });

    render(<Sidebar userName="John" userRole="buyer" />);
    fireEvent.click(within(getDesktopNav()).getByRole("button", { name: /sign out/i }));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to sign out", signOutError);
    });

    consoleErrorSpy.mockRestore();
  });

  it("does not redirect and logs error when sign out throws", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const thrownError = new Error("Network down");
    mockSignOut.mockRejectedValueOnce(thrownError);

    render(<Sidebar userName="John" userRole="buyer" />);
    fireEvent.click(within(getDesktopNav()).getByRole("button", { name: /sign out/i }));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to sign out", thrownError);
    });

    consoleErrorSpy.mockRestore();
  });

  // ─── Navigation order ─────────────────────────────────────

  it("renders navigation items in correct order for buyer", () => {
    render(<Sidebar userName="Jane" userRole="buyer" />);
    const links = within(getDesktopNav()).getAllByRole("link");
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
    const links = within(getDesktopNav()).getAllByRole("link");
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

  it("toggles mobile menu accessibility state and controlled region", () => {
    render(<Sidebar userName="John" userRole="buyer" />);
    const toggle = screen.getByLabelText(/toggle menu/i);

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("navigation", { name: /mobile sidebar navigation/i })).not.toBeInTheDocument();
    const controlsId = toggle.getAttribute("aria-controls");
    expect(controlsId).toBeTruthy();

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const mobileNav = screen.getByRole("navigation", { name: /mobile sidebar navigation/i });
    expect(mobileNav).toHaveAttribute("id", controlsId);
  });

  it("closes mobile drawer after successful sign out", async () => {
    render(<Sidebar userName="John" userRole="buyer" />);
    const mobileNav = openMobileDrawer();

    fireEvent.click(within(mobileNav).getByRole("button", { name: /sign out/i }));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(screen.queryByRole("navigation", { name: /mobile sidebar navigation/i })).not.toBeInTheDocument();
    });
  });

  it("keeps mobile drawer open when sign out returns error", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockSignOut.mockResolvedValueOnce({ error: new Error("Sign out failed") });
    render(<Sidebar userName="John" userRole="buyer" />);
    const mobileNav = openMobileDrawer();

    fireEvent.click(within(mobileNav).getByRole("button", { name: /sign out/i }));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });
    expect(screen.getByRole("navigation", { name: /mobile sidebar navigation/i })).toBeInTheDocument();
    consoleErrorSpy.mockRestore();
  });

  it("collapses and expands desktop nav item labels", () => {
    render(<Sidebar userName="John" userRole="buyer" />);
    const desktopNav = getDesktopNav();

    expect(within(desktopNav).getByText("Dashboard")).toBeInTheDocument();

    fireEvent.click(within(desktopNav).getByRole("button", { name: /collapse sidebar/i }));
    expect(within(desktopNav).queryByText("Dashboard")).not.toBeInTheDocument();
    expect(within(desktopNav).getByRole("button", { name: /expand sidebar/i })).toBeInTheDocument();

    fireEvent.click(within(desktopNav).getByRole("button", { name: /expand sidebar/i }));
    expect(within(desktopNav).getByText("Dashboard")).toBeInTheDocument();
  });

  it("keeps desktop links accessible by label in mini variant", () => {
    render(<Sidebar userName="John" userRole="buyer" />);
    const desktopNav = getDesktopNav();

    fireEvent.click(within(desktopNav).getByRole("button", { name: /collapse sidebar/i }));

    expect(within(desktopNav).queryByText("Dashboard")).not.toBeInTheDocument();
    expect(within(desktopNav).getByRole("link", { name: /dashboard/i })).toBeInTheDocument();
    expect(within(desktopNav).getByRole("link", { name: /messages/i })).toBeInTheDocument();
  });

  // ─── Role label formatting ────────────────────────────────

  it("capitalizes role display for broker", () => {
    render(<Sidebar userName="Bob" userRole="broker" />);
    expect(within(getDesktopNav()).getByText("Broker")).toBeInTheDocument();
  });
});
