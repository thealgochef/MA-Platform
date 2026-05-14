type UserInfo = {
  role: string;
  status: string;
  membership_agreement_signed?: boolean;
};

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/pending-approval",
  "/api/auth/callback",
  "/for-buyers",
  "/for-brokers",
  "/about",
  "/how-it-works",
  "/contact",
  "/privacy",
  "/terms",
];

const PUBLIC_PREFIXES = ["/shared/", "/api/auth/"];

// These routes require authentication but are accessible to pending users
const SIGNUP_FLOW_ROUTES = [
  "/signup/select-role",
  "/signup/broker",
  "/signup/buyer",
  "/pending-approval",
  "/api/signup/broker",
  "/api/signup/buyer",
];

const BROKER_ROUTES = ["/deals/new"];
const BROKER_EXACT_ROUTES = ["/deals"];
const BUYER_ROUTES = ["/projects/", "/browse"];
const ADMIN_ROUTES = ["/admin"];

function isSharedDealRoute(pathname: string): boolean {
  // Shared workspace routes: /deals/:id and buyer workflow pages under a deal
  return /^\/deals\/[^/]+(?:\/(nda|ioi|loi|close))?$/.test(pathname);
}

function isBrokerDealManagementRoute(pathname: string): boolean {
  // Broker-only management pages under a deal
  return /^\/deals\/[^/]+\/(edit|preview|ioi-compare|loi-compare)$/.test(pathname);
}


export function isProtectedRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return false;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return false;
  return true;
}

export function isPublicOnlyRoute(pathname: string): boolean {
  return pathname === "/login";
}

export function getRequiredRole(pathname: string): string | null {
  if (BROKER_EXACT_ROUTES.includes(pathname)) return "broker";
  if (BROKER_ROUTES.some((r) => pathname.startsWith(r))) return "broker";
  if (isBrokerDealManagementRoute(pathname)) return "broker";
  if (isSharedDealRoute(pathname)) return null;
  if (BUYER_ROUTES.some((r) => pathname.startsWith(r))) return "buyer";
  if (ADMIN_ROUTES.some((r) => pathname.startsWith(r))) return "admin";
  return null;
}

export function getRedirectForUser(
  user: UserInfo,
  pathname: string
): string | null {
  // Allow users to access signup flow pages regardless of status
  if (SIGNUP_FLOW_ROUTES.includes(pathname)) {
    return null;
  }

  // Hard blocks — rejected/suspended/banned users cannot access anything
  if (user.status === "rejected") {
    return "/login?error=rejected";
  }
  if (user.status === "suspended") {
    return "/login?error=suspended";
  }
  if (user.status === "banned") {
    return "/login?error=banned";
  }

  // Users who haven't completed the signup form must finish it first,
  // regardless of whether status is 'pending' or 'approved' (DEV auto-approve)
  if (!user.membership_agreement_signed) {
    if (!isProtectedRoute(pathname)) return null;
    return "/signup/select-role";
  }

  // Pending users who completed signup wait for admin approval
  if (user.status === "pending") {
    if (!isProtectedRoute(pathname)) return null;
    return "/pending-approval";
  }

  // Approved user — check role-based access
  if (user.status === "approved") {
    const requiredRole = getRequiredRole(pathname);

    if (requiredRole === null) {
      // Shared route (dashboard, messages, settings) — any approved role
      return null;
    }

    if (requiredRole !== user.role) {
      return "/dashboard";
    }

    return null;
  }

  return "/login";
}
