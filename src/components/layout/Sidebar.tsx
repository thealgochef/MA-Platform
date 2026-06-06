"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Avatar,
  Badge,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  LayoutDashboard,
  //Search,
  FolderKanban,
  FilePlus,
  Briefcase,
  PlusCircle,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface SidebarProps {
  userName: string;
  userRole: "broker" | "buyer" | "admin";
  avatarUrl?: string;
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
  avatarUrl,
  unreadCount = 0,
}: SidebarProps) {
  const drawerWidth = 268;
  const miniDrawerWidth = 84;

  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const mobileNavigationId = "mobile-sidebar-navigation";

  const handleSignOut = async (): Promise<boolean> => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Failed to sign out", error);
        return false;
      }

      router.push("/");
      return true;
    } catch (error) {
      console.error("Failed to sign out", error);
      return false;
    }
  };

  const commonItems: NavItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={20} /> },
    //{ label: "Browse Deals", href: "/browse", icon: <Search size={20} /> },
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

  const matchesPathPrefix = (path: string, prefix: string) =>
    path === prefix || path.startsWith(`${prefix}/`);

  const getMatchSpecificity = (item: NavItem) => {
    if (pathname === item.href) {
      return item.href.length + 1000;
    }

    if (item.matchPrefix && matchesPathPrefix(pathname, item.matchPrefix)) {
      return item.matchPrefix.length;
    }

    return -1;
  };

  const activeItemHref = allItems.reduce<string | null>((currentBestHref, item) => {
    const currentBestItem = currentBestHref
      ? allItems.find((candidate) => candidate.href === currentBestHref) ?? null
      : null;

    if (!currentBestItem) {
      return getMatchSpecificity(item) >= 0 ? item.href : null;
    }

    return getMatchSpecificity(item) > getMatchSpecificity(currentBestItem)
      ? item.href
      : currentBestHref;
  }, null);

  const isActive = (item: NavItem) => item.href === activeItemHref;

  const roleLabel = userRole.charAt(0).toUpperCase() + userRole.slice(1);
  const initials =
    userName
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  const renderNavItem = (item: NavItem, expanded: boolean, onAction?: () => void) => {
    const selected = isActive(item);

    return (
      <ListItem key={item.href} disablePadding sx={{ display: "block" }}>
        <Tooltip title={item.label} placement="right" disableHoverListener={expanded}>
          <ListItemButton
            component={Link}
            href={item.href}
            onClick={onAction}
            aria-label={item.label}
            aria-current={selected ? "page" : undefined}
            sx={{
              minHeight: 46,
              mx: 1,
              my: 0.25,
              px: 1.5,
              borderRadius: 1.5,
              justifyContent: expanded ? "initial" : "center",
              color: selected ? "var(--color-bg)" : "rgba(255, 255, 255, 0.76)",
              bgcolor: selected ? "var(--color-secondary)" : "transparent",
              "&:hover": {
                bgcolor: selected ? "var(--color-secondary)" : "rgba(255, 255, 255, 0.1)",
                color: "var(--color-bg)",
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: expanded ? 1.75 : 0,
                justifyContent: "center",
                color: "inherit",
              }}
            >
              {item.badge != null ? (
                <Badge
                  badgeContent={item.badge}
                  sx={{
                    "& .MuiBadge-badge": {
                      bgcolor: "var(--color-surface-alt)",
                      color: "var(--color-primary)",
                      fontWeight: 700,
                      fontSize: "0.65rem",
                      minWidth: 18,
                      height: 18,
                    },
                  }}
                >
                  {item.icon}
                </Badge>
              ) : (
                item.icon
              )}
            </ListItemIcon>
            {expanded ? (
              <ListItemText
                primary={item.label}
                slotProps={{
                  primary: {
                    sx: {
                      fontSize: 14,
                      fontWeight: 600,
                    },
                  },
                }}
              />
            ) : null}
          </ListItemButton>
        </Tooltip>
      </ListItem>
    );
  };

  const drawerContent = (
    expanded: boolean,
    onAction?: () => void,
    allowCollapse?: boolean,
    asNavigation?: boolean,
    navigationId?: string,
    navigationLabel?: string,
  ) => (
    <Box
      component={asNavigation ? "nav" : "div"}
      role={asNavigation ? "navigation" : undefined}
      id={asNavigation ? navigationId : undefined}
      aria-label={asNavigation ? navigationLabel : undefined}
      sx={{ height: "100%", display: "flex", flexDirection: "column" }}
    >
      <Box sx={{ p: 1.5, borderBottom: "1px solid rgba(255, 255, 255, 0.12)" }}>
        {allowCollapse ? (
          <Box sx={{ display: "flex", justifyContent: expanded ? "flex-end" : "center", mb: 1 }}>
            <IconButton
              aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
              onClick={() => setDesktopOpen((current) => !current)}
              sx={{
                color: "rgba(255, 255, 255, 0.8)",
                bgcolor: "rgba(255, 255, 255, 0.08)",
                "&:hover": {
                  bgcolor: "rgba(255, 255, 255, 0.16)",
                  color: "var(--color-bg)",
                },
              }}
            >
              {expanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            </IconButton>
          </Box>
        ) : null}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: expanded ? "flex-start" : "center",
            gap: 1.5,
          }}
        >
          <Avatar
            src={avatarUrl}
            alt={`${userName} profile picture`}
            sx={{
              width: 44,
              height: 44,
              bgcolor: "rgba(255, 255, 255, 0.15)",
              color: "var(--color-bg)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            {initials}
          </Avatar>
          {expanded ? (
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ color: "var(--color-bg)", fontSize: 14, fontWeight: 700 }} noWrap>
                {userName}
              </Typography>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.62)", fontSize: 12 }}>
                {roleLabel}
              </Typography>
            </Box>
          ) : null}
        </Box>
      </Box>

      <Box sx={{ flex: 1, py: 1 }}>
        <List sx={{ px: 0.5 }}>{allItems.map((item) => renderNavItem(item, expanded, onAction))}</List>
      </Box>

      <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.12)" }} />

      <List sx={{ px: 0.5, py: 1.25 }}>
        <ListItem disablePadding sx={{ display: "block" }}>
          <Tooltip title="Sign Out" placement="right" disableHoverListener={expanded}>
            <ListItemButton
              onClick={async () => {
                const didSignOut = await handleSignOut();

                if (didSignOut) {
                  onAction?.();
                }
              }}
              aria-label="Sign Out"
              sx={{
                minHeight: 46,
                mx: 1,
                px: 1.5,
                borderRadius: 1.5,
                justifyContent: expanded ? "initial" : "center",
                color: "rgba(255, 255, 255, 0.76)",
                "&:hover": {
                  bgcolor: "rgba(255, 255, 255, 0.1)",
                  color: "var(--color-bg)",
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: expanded ? 1.75 : 0,
                  justifyContent: "center",
                  color: "inherit",
                }}
              >
                <LogOut size={20} />
              </ListItemIcon>
              {expanded ? (
                <ListItemText
                  primary="Sign Out"
                  slotProps={{
                    primary: {
                      sx: {
                        fontSize: 14,
                        fontWeight: 600,
                      },
                    },
                  }}
                />
              ) : null}
            </ListItemButton>
          </Tooltip>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <>
      <IconButton
        aria-label="Toggle menu"
        aria-expanded={mobileOpen}
        aria-controls={mobileNavigationId}
        onClick={() => setMobileOpen(!mobileOpen)}
        sx={{
          position: "fixed",
          top: 16,
          left: 16,
          zIndex: (theme) => theme.zIndex.drawer + 2,
          display: { xs: "inline-flex", lg: "none" },
          bgcolor: "var(--color-primary)",
          color: "var(--color-bg)",
          borderRadius: 1.5,
          boxShadow: "0 10px 24px rgba(0, 0, 0, 0.24)",
          "&:hover": {
            bgcolor: "var(--color-btn-hover)",
          },
        }}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </IconButton>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        sx={{
          display: { xs: "block", lg: "none" },
          "& .MuiBackdrop-root": {
            backgroundColor: "rgba(0, 0, 0, 0.45)",
          },
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            bgcolor: "var(--color-primary)",
            color: "var(--color-bg)",
            borderRight: "1px solid rgba(255, 255, 255, 0.12)",
            boxSizing: "border-box",
          },
        }}
      >
        {drawerContent(
          true,
          () => setMobileOpen(false),
          false,
          true,
          mobileNavigationId,
          "Mobile sidebar navigation",
        )}
      </Drawer>

      <Drawer
        variant="permanent"
        open={desktopOpen}
        sx={{
          display: { xs: "none", lg: "block" },
          width: desktopOpen ? drawerWidth : miniDrawerWidth,
          flexShrink: 0,
          whiteSpace: "nowrap",
          boxSizing: "border-box",
          "& .MuiDrawer-paper": {
            width: desktopOpen ? drawerWidth : miniDrawerWidth,
            overflowX: "hidden",
            bgcolor: "var(--color-primary)",
            color: "var(--color-bg)",
            borderRight: "1px solid rgba(255, 255, 255, 0.12)",
            boxSizing: "border-box",
            transition: (theme) =>
              theme.transitions.create("width", {
                easing: theme.transitions.easing.sharp,
                duration: desktopOpen
                  ? theme.transitions.duration.enteringScreen
                  : theme.transitions.duration.leavingScreen,
              }),
          },
        }}
      >
        {drawerContent(
          desktopOpen,
          undefined,
          true,
          true,
          undefined,
          "Desktop sidebar navigation",
        )}
      </Drawer>
    </>
  );
}
