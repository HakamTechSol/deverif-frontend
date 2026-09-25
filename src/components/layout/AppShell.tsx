import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import notificationSound from "@/assets/NotificationSound/universfield-new-notification-040-493469.mp3";
import {
  LayoutDashboard,
  Send,
  Inbox,
  CreditCard,
  Settings,
  Users,
  Building2,
  FileCheck2,
  AlertTriangle,
  Wallet,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
  Bell,
  CheckCheck,
  MessageSquare,
  History,
  ScrollText,
  Hourglass,
  CalendarDays,
  CalendarClock,
  ClipboardCheck,
  Headset,
  Languages,
  ShieldCheck,
  Lock,
  BadgeCheck,
} from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authStore, useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { authService, requestsService, notificationService, type ModuleFlags } from "@/services";
import type { FileRouteTypes } from "@/routeTree.gen";
import { cn, resolveAssetUrl, formatDateTime } from "@/lib/utils";
import { setLanguage, getLanguage, type Language } from "@/i18n";
import { useOrgSubscription } from "@/hooks/useOrgSubscription";
import { SubscriptionBanner } from "@/components/common/SubscriptionLocked";
import { usePermissions } from "@/lib/permissions";
import type { LucideIcon } from "lucide-react";

type NavItem = { to: string; labelKey: string; icon: LucideIcon; badge?: number };

const userNavItems: NavItem[] = [
  { to: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { to: "/requests", labelKey: "nav.myRequests", icon: Send },
  { to: "/leaves", labelKey: "nav.leaves", icon: CalendarDays },
  { to: "/inbox", labelKey: "nav.inbox", icon: Inbox },
  { to: "/auto-verified", labelKey: "nav.autoVerified", icon: BadgeCheck },
];

const memberNavItems: NavItem[] = [
  { to: "/attendance", labelKey: "nav.attendance", icon: ClipboardCheck },
  { to: "/payroll", labelKey: "nav.payroll", icon: Wallet },
  { to: "/org/support", labelKey: "nav.support", icon: Headset },
];

const orgAdminNavItems: NavItem[] = [
  { to: "/org/team", labelKey: "nav.myTeam", icon: Users },
  { to: "/org/admins", labelKey: "nav.orgAdmins", icon: ShieldCheck },
  { to: "/org/leaves", labelKey: "nav.leaveRequests", icon: CalendarClock },
  { to: "/org/attendance", labelKey: "nav.attendance", icon: ClipboardCheck },
  { to: "/org/salary-components", labelKey: "nav.payrollComponents", icon: Wallet },
  { to: "/org/payroll", labelKey: "nav.payroll", icon: Wallet },
  { to: "/org/support", labelKey: "nav.support", icon: Headset },
  { to: "/payments", labelKey: "nav.payments", icon: CreditCard },
];

const adminNav: NavItem[] = [
  { to: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { to: "/admin/users", labelKey: "nav.users", icon: Users },
  { to: "/admin/organizations", labelKey: "nav.organizations", icon: Building2 },
  { to: "/admin/requests", labelKey: "nav.verificationRequests", icon: FileCheck2 },
  { to: "/admin/null-requests", labelKey: "nav.unmatchedOrgs", icon: AlertTriangle },
  { to: "/admin/unresponsive", labelKey: "nav.unresponsive", icon: Hourglass },
  { to: "/admin/payments", labelKey: "nav.payments", icon: Wallet },
  { to: "/admin/leads", labelKey: "nav.leads", icon: MessageSquare },
  { to: "/admin/login-history", labelKey: "nav.loginHistory", icon: History },
  { to: "/admin/activity-logs", labelKey: "nav.activityLogs", icon: ScrollText },
  { to: "/admin/support", labelKey: "nav.supportTickets", icon: Headset },
  { to: "/settings", labelKey: "nav.settings", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { isLocked, isModuleFlagOff } = useOrgSubscription();
  const pathModule: Record<string, keyof ModuleFlags> = {
    "/org/team": "employee_management",
    "/org/admins": "user_management",
    "/org/leaves": "leave_management",
    "/org/attendance": "attendance_management",
    "/org/salary-components": "payroll_management",
    "/org/payroll": "payroll_management",
    "/leaves": "leave_management",
    "/attendance": "attendance_management",
    "/payroll": "payroll_management",
  };
  const modulePaths = Object.keys(pathModule);
  const moduleLockedPaths = new Set(
    !isAdmin && isLocked
      ? modulePaths
      : modulePaths.filter((path) => isModuleFlagOff(pathModule[path])),
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => setMounted(true), []);

  const onLogout = async () => {
    try {
      if (user?.role === "admin") await authService.adminLogout();
      else await authService.userLogout();
    } catch {
      // ignore network error
    }
    authStore.clear();
    toast.success("Signed out");
    router.navigate({ to: user?.role === "admin" ? "/system-admin/login" : "/login" });
  };

  const isOrgAdmin = !isAdmin && user?.org_role === "org_admin";
  const isSubAdmin = !isAdmin && user?.org_role === "sub_admin";
  const perms = usePermissions();
  const canApprove = isOrgAdmin || perms.approve_request;
  const canGenerate = isOrgAdmin || perms.generate_request;

  const inboxCount = useQuery({
    queryKey: ["inbox-count"],
    queryFn: () => requestsService.myInboxCount(),
    enabled: mounted && !!user && !isAdmin && canApprove,
    refetchInterval: 30_000,
    retry: false,
  });

  const meSync = useQuery({
    queryKey: ["me-sync"],
    queryFn: () => authService.me(),
    enabled: mounted && !!user && !isAdmin,
    retry: false,
  });

  useEffect(() => {
    if (!user || isAdmin || !meSync.data) return;
    const synced = meSync.data as { org_role?: "employee" | "org_admin" | "sub_admin"; feature_access?: Record<string, boolean> | null };
    const updates: Record<string, unknown> = {};
    if (synced.org_role !== user.org_role) updates.org_role = synced.org_role ?? "employee";
    if (synced.feature_access !== undefined) updates.feature_access = synced.feature_access;
    if (Object.keys(updates).length) authStore.updateUser({ ...user, ...updates });
  }, [meSync.data, user, isAdmin]);

  const userNavVisible = userNavItems.filter((it) => {
    if (it.to === "/requests") return isOrgAdmin ? canGenerate : perms.generate_request;
    if (it.to === "/leaves") return isOrgAdmin || isSubAdmin ? false : perms.leave;
    if (it.to === "/inbox") return canApprove;
    if (it.to === "/auto-verified") return canApprove;
    return true;
  });

  const memberServiceVisible = memberNavItems.filter((it) => {
    if (isOrgAdmin || isSubAdmin) return false;
    if (it.to === "/attendance") return perms.attendance;
    if (it.to === "/payroll") return perms.payroll;
    return true;
  });

  // org_admin gets full operational org access. sub_admin only gets the org
  // pages matching their granted feature_access permissions, and never
  // sub-admin management, org billing, or org settings.
  const subAdminForbidden = new Set(["/org/admins", "/payments"]);
  const orgNavVisible: NavItem[] = isOrgAdmin || isSubAdmin
    ? isOrgAdmin
      ? orgAdminNavItems
      : orgAdminNavItems.filter((it) => {
          if (subAdminForbidden.has(it.to)) return false;
          if (it.to === "/org/team") return perms.manage_employees;
          if (it.to === "/org/leaves") return perms.leave;
          if (it.to === "/org/attendance") return perms.attendance;
          if (it.to === "/org/salary-components" || it.to === "/org/payroll") return perms.payroll;
          return true;
        })
    : [];

  const items: NavItem[] = isAdmin
    ? adminNav
    : [
        ...userNavVisible.map((it) =>
          it.to === "/inbox" ? { ...it, badge: inboxCount.data ?? 0 } : it,
        ),
        ...(isOrgAdmin || isSubAdmin ? [] : memberServiceVisible),
        ...orgNavVisible,
        { to: "/settings", labelKey: "nav.settings", icon: Settings },
      ];

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
        <SidebarInner
          items={items}
          pathname={pathname}
          onNavigate={() => {}}
          onLogout={onLogout}
          locked={!isAdmin && isLocked}
          lockedPaths={moduleLockedPaths}
        />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-sidebar-border bg-sidebar">
            <SidebarInner
              items={items}
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
              onLogout={onLogout}
              locked={!isAdmin && isLocked}
              lockedPaths={moduleLockedPaths}
            />
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <TopBar onMenuClick={() => setMobileOpen(true)} />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {isAdmin && <div className="sr-only">admin</div>}
          {!isAdmin && isLocked && <SubscriptionBanner />}
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarInner({
  items,
  pathname,
  onNavigate,
  onLogout,
  locked,
  lockedPaths,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate: () => void;
  onLogout: () => void;
  locked: boolean;
  lockedPaths: Set<string>;
}) {
  const { t } = useTranslation();
  return (
    <>
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
        <Logo />
        <button
          className="rounded-md p-1.5 text-sidebar-foreground hover:bg-sidebar-accent lg:hidden"
          onClick={onNavigate}
          aria-label={t("nav.closeMenu")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((it) => {
          const active =
            pathname === it.to || (it.to !== "/dashboard" && pathname.startsWith(it.to));
          return (
            <Link
              key={it.to}
              to={it.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <it.icon
                className={cn("h-4 w-4", active ? "text-sidebar-primary" : "text-muted-foreground")}
              />
              {t(it.labelKey)}
              {lockedPaths.has(it.to) ? (
                <Lock className="ml-auto h-3.5 w-3.5 text-muted-foreground/60" />
              ) : null}
              {it.badge && it.badge > 0 ? (
                <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                  {it.badge > 99 ? "99+" : it.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-xs font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-destructive"
        >
          <LogOut className="h-3.5 w-3.5" />
          {t("nav.signOut")}
        </button>
      </div>
    </>
  );
}

function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { theme, toggle } = useTheme();
  const { user } = useAuth();
  const qc = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isAdmin = user?.role === "admin";

  const unreadCount = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: () => notificationService.unreadCount(),
    enabled: mounted && !!user && !isAdmin,
    refetchInterval: 15_000,
    retry: false,
  });

  const prevUnread = useRef<number | null>(null);

  // Play a sound when a new notification arrives (unread count increases).
  useEffect(() => {
    const current = unreadCount.data ?? 0;
    if (prevUnread.current === null) {
      prevUnread.current = current;
      return;
    }
    if (current > prevUnread.current) {
      const audio = new Audio(notificationSound);
      audio.volume = 0.6;
      audio.play().catch(() => {});
    }
    prevUnread.current = current;
  }, [unreadCount.data]);

  const [notifOpen, setNotifOpen] = useState(false);

  const notifs = useQuery({
    queryKey: ["notifications", 1],
    queryFn: () => notificationService.list({ page: 1, limit: 10 }),
    enabled: mounted && !!user && !isAdmin && notifOpen,
    retry: false,
  });

  const markRead = async (id: number) => {
    await notificationService.markRead(id);
    qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  const markAllRead = async () => {
    await notificationService.markAllRead();
    qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  const notifItems = notifs.data?.items ?? [];
  const unread = unreadCount.data ?? 0;

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button
        className="rounded-md p-2 text-muted-foreground hover:bg-accent lg:hidden"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1" />

      {!isAdmin && <LanguageToggle />}

      <Button
        variant="ghost"
        size="icon"
        onClick={toggle}
        aria-label="Toggle theme"
        className="text-muted-foreground"
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>

      {!isAdmin ? (
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="relative text-muted-foreground"
            onClick={() => setNotifOpen(!notifOpen)}
          >
            <Bell className="h-4 w-4" />
            {unread > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destruct-foreground">
                {unread > 99 ? "99+" : unread}
              </span>
            ) : null}
          </Button>

          {notifOpen ? (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-border bg-card shadow-lg">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <span className="text-sm font-semibold text-foreground">
                    {t("notifications.title")}
                  </span>
                  {unread > 0 ? (
                    <button
                      onClick={markAllRead}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <CheckCheck className="h-3.5 w-3.5" /> {t("notifications.markAllRead")}
                    </button>
                  ) : null}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifItems.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                      {t("notifications.noNotifications")}
                    </div>
                  ) : (
                    notifItems.map((n) => (
                      <button
                        key={n.id}
                        className={`flex w-full flex-col gap-0.5 border-b border-border/50 px-4 py-3 text-left transition-colors hover:bg-accent/50 ${
                          !n.read_at ? "bg-primary/5" : ""
                        }`}
                        onClick={() => {
                          markRead(n.id);
                          if (n.link) {
                            router.navigate({ to: n.link as FileRouteTypes["to"] });
                            setNotifOpen(false);
                          }
                        }}
                      >
                        <div className="flex items-start gap-2">
                          {!n.read_at ? (
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                          ) : (
                            <span className="mt-1.5 h-2 w-2 shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-foreground">{n.title}</div>
                            {n.message ? (
                              <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                                {n.message}
                              </div>
                            ) : null}
                            <div className="mt-1 text-[10px] text-muted-foreground">
                              {formatDateTime(n.created_at)}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <Avatar className="h-7 w-7">
          <AvatarImage
            src={resolveAssetUrl(user?.profile_image) ?? undefined}
            alt={user?.full_name}
          />
          <AvatarFallback className="bg-primary/10 text-[10px] font-medium text-primary">
            {(user?.full_name ?? "U")
              .split(" ")
              .map((p) => p[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="hidden max-w-[180px] truncate text-xs text-muted-foreground sm:inline">
          {user?.email}
        </span>
      </div>
    </header>
  );
}

function LanguageToggle() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const lang = getLanguage();

  const onChange = (next: string) => {
    const value = next as Language;
    if (value === lang) return;
    setLanguage(value);
    if (!user) return;
    const persist =
      user.role === "admin"
        ? authService.setAdminPreferredLanguage(value)
        : authService.setPreferredLanguage(value);
    persist
      .then(() => {
        authStore.updateUser({ ...user, preferred_language: value });
      })
      .catch(() => {
        // preference still applies locally for this session
      });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("lang.language")}
          className="text-muted-foreground"
        >
          <Languages className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>{t("lang.language")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={lang} onValueChange={onChange}>
          <DropdownMenuRadioItem value="en">{t("lang.english")}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="ur">{t("lang.urdu")}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
