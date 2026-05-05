"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  Search,
  FolderKanban,
  FilePlus,
  Briefcase,
  PlusCircle,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";

interface SidebarProps {
  userName: string;
  userRole: "broker" | "buyer" | "admin";
  avatarPath?: string;
  unreadCount?: number;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  matchPrefix?: string;
  badge?: number;
}

export default function Sidebar({
  userName,
  userRole,
  avatarPath,
  unreadCount = 0,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const supabase = createClient();

  const avatarUrl = avatarPath
    ? supabase.storage.from("profile-pictures").getPublicUrl(avatarPath).data.publicUrl
    : null;

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  const commonItems: NavItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={20} /> },
    { label: "Browse Deals", href: "/browse", icon: <Search size={20} /> },
  ];

  const roleItems: NavItem[] =
    userRole === "broker"
      ? [
        { label: "My Deals", href: "/deals", icon: <Briefcase size={20} />, matchPrefix: "/deals" },
        { label: "New Deal", href: "/deals/new", icon: <PlusCircle size={20} /> },
      ]
      : userRole === "buyer"
        ? [
          { label: "My Projects", href: "/projects", icon: <FolderKanban size={20} />, matchPrefix: "/projects" },
          { label: "New Project", href: "/projects/new", icon: <FilePlus size={20} /> },
        ]
        : [];

  const bottomItems: NavItem[] = [
    {
      label: "Messages",
      href: "/messages",
      icon: <MessageSquare size={20} />,
      matchPrefix: "/messages",
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    { label: "Settings", href: "/settings", icon: <Settings size={20} /> },
  ];

  const allItems = [...commonItems, ...roleItems, ...bottomItems];

  const isActive = (item: NavItem) => {
    if (item.matchPrefix) {
      return pathname.startsWith(item.matchPrefix);
    }
    return pathname === item.href;
  };

  const roleLabel = userRole.charAt(0).toUpperCase() + userRole.slice(1);

  const navContent = (
    <>
      {/* User info */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={`${userName} profile picture`}
              className="h-11 w-11 rounded-full object-cover border border-white/15"
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white">
              {userName
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{userName}</p>
            <p className="text-xs text-white/60 mt-0.5">{roleLabel}</p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <div className="flex-1 py-3 px-2 space-y-1">
        {allItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActive(item)
                ? "bg-secondary text-white"
                : "text-white/70 hover:bg-surface-alt/10 hover:text-white"
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.badge != null && (
              <span className="ml-auto bg-surface-alt text-primary text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {item.badge}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Sign out */}
      <div className="p-3 border-t border-white/10">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium text-white/70 hover:bg-surface-alt/10 hover:text-white transition-colors"
        >
          <LogOut size={20} />
          <span>Sign Out</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <button
        aria-label="Toggle menu"
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 p-2 bg-primary text-white rounded-md lg:hidden"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar nav */}
      <nav
        role="navigation"
        className={`fixed top-0 left-0 z-40 h-screen w-64 bg-primary flex flex-col transition-transform duration-200 ${mobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:static lg:flex`}
      >
        {navContent}
      </nav>
    </>
  );
}
