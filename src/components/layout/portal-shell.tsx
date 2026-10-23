
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserRound,
  CalendarDays,
  Wallet,
  ClipboardCheck,
  Banknote,
  Receipt,
  KanbanSquare,
  BrainCircuit,
  MessageCircle,
  Search,
  Bell,
  Menu,
  X,
  LogOut,
  ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { ThemeToggle } from "@/components/ui/theme-toggle";

type UserRole = "ADMIN" | "HR" | "MANAGER" | "EMPLOYEE";

type PortalUser = {
  username: string;
  name: string | null;
  employeeId: string | null;
  role: UserRole | null;
};

type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
};

type NavigationGroup = {
  heading: string;
  items: NavigationItem[];
};

const ALL_ROLES: UserRole[] = [
  "ADMIN",
  "HR",
  "MANAGER",
  "EMPLOYEE",
];

const navigation: NavigationGroup[] = [
  {
    heading: "WORKSPACE",
    items: [
      {
        label: "Home",
        href: "/",
        icon: LayoutDashboard,
        roles: ALL_ROLES,
      },
      {
        label: "My Profile",
        href: "/profile",
        icon: UserRound,
        roles: ALL_ROLES,
      },
      {
        label: "Directory",
        href: "/employees",
        icon: Users,
        roles: ["ADMIN", "HR", "MANAGER", "EMPLOYEE"],
      },
      {
        label: "Leave",
        href: "/leave",
        icon: CalendarDays,
        roles: ALL_ROLES,
      },
      {
        label: "Payslips",
        href: "/payslips",
        icon: Wallet,
        roles: ["ADMIN", "HR", "EMPLOYEE"],
      },
    ],
  },
  {
    heading: "ADMINISTRATION",
    items: [
      {
        label: "Employees",
        href: "/admin",
        icon: Users,
        roles: ["ADMIN", "HR"],
      },
      {
        label: "Approvals",
        href: "/approvals",
        icon: ClipboardCheck,
        roles: ["ADMIN", "HR", "MANAGER"],
      },
      {
        label: "Payroll",
        href: "/payroll",
        icon: Banknote,
        roles: ["ADMIN", "HR"],
      },
      {
        label: "Finance",
        href: "/finance",
        icon: Receipt,
        roles: ["ADMIN"],
      },
    ],
  },
  {
    heading: "TEAM & INSIGHTS",
    items: [
      {
        label: "Team Board",
        href: "/team-board",
        icon: KanbanSquare,
        roles: ["ADMIN", "MANAGER"],
      },
      {
        label: "AI Insights",
        href: "/insights",
        icon: BrainCircuit,
        roles: ["ADMIN", "HR", "MANAGER"],
      },
      {
        label: "HR Assistant",
        href: "/assistant",
        icon: MessageCircle,
        roles: ["ADMIN", "HR", "MANAGER", "EMPLOYEE"],
      },
    ],
  },
];


function normalizeRole(role: unknown): UserRole | null {
  if (typeof role !== "string") return null;

  const normalized = role.trim().toUpperCase();

  if (
    normalized === "ADMIN" ||
    normalized === "HR" ||
    normalized === "MANAGER" ||
    normalized === "EMPLOYEE"
  ) {
    return normalized;
  }

  return null;
}


function formatRole(role: string | null | undefined) {
  if (!role) return "Portal user";

  return role
    .toLowerCase()
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "U";
}

export function PortalShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<PortalUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [sessionError, setSessionError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      try {
        const response = await fetch("/api/v1/auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        if (!response.ok) {
          throw new Error("Could not verify your session.");
        }

        const result = await response.json();

        if (!result?.user) {
          throw new Error("User information is unavailable.");
        }

       
if (!cancelled) {
  setUser({
    username: result.user.username,
    name: result.user.name ?? null,
    employeeId: result.user.employeeId ?? null,
    role: normalizeRole(result.user.role),
  });

  setSessionError("");
}

      } catch {
        if (!cancelled) {
          setSessionError(
            "Unable to verify your session. Check your connection and try again.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingUser(false);
        }
      }
    }

    void loadUser();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [mobileMenuOpen]);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      const response = await fetch("/api/v1/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Logout failed.");
      }

      router.replace("/login");
      router.refresh();
    } catch {
      setSessionError("Logout failed. Please try again.");
      setLoggingOut(false);
    }
  }

  const role: UserRole = user?.role ?? "EMPLOYEE";

  const visibleGroups = navigation
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(role)),
    }))
    .filter((group) => group.items.length > 0);

  const currentPage =
    navigation
      .flatMap((group) => group.items)
      .find((item) => item.href === pathname)?.label ??
    (pathname.split("/").filter(Boolean).pop() || "Home")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());

  const displayName = user?.name || user?.username || "Portal user";
  const initials = getInitials(displayName);

  function renderNavigation() {
    return (
      <nav
        aria-label="Main navigation"
        className="flex-1 space-y-6 overflow-y-auto p-4"
      >
        {visibleGroups.map((group) => (
          <section key={group.heading}>
            <p className="mb-2 px-3 text-xs font-bold tracking-wider text-muted">
              {group.heading}
            </p>

            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMobileMenuOpen(false)}
                    className={[
                      "flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5",
                      "text-sm font-medium transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      active
                        ? "bg-primary-soft text-primary"
                        : "text-muted hover:bg-primary-soft hover:text-primary",
                    ].join(" ")}
                  >
                    <Icon aria-hidden="true" className="size-4 shrink-0" />
                    <span>{item.label}</span>
                    {active && (
                      <span className="ml-auto" aria-hidden="true">
                        <ChevronRight className="size-4" />
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </nav>
    );
  }

  function renderUserCard() {
    return (
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3 rounded-lg bg-background p-3">
          <div
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft font-bold text-primary"
          >
            {initials}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{displayName}</p>
            <p className="truncate text-xs text-muted">
              {user?.employeeId || formatRole(user?.role)}
            </p>
            <p className="text-xs text-muted">{formatRole(user?.role)}</p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            aria-label="Log out"
            title="Log out"
            className="rounded-md p-2 text-muted hover:bg-primary-soft hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
          >
            <LogOut aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>
    );
  }

  function renderBrand() {
    return (
      <Link
        href="/"
        onClick={() => setMobileMenuOpen(false)}
        className="flex min-h-20 items-center gap-3 border-b border-border p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">
          H
        </span>

        <span>
          <span className="block font-bold">Horizon Portal</span>
          <span className="block text-xs text-muted">Aura Workforce</span>
        </span>
      </Link>
    );
  }

  if (loadingUser) {
    return (
      <main
        className="min-h-screen bg-background p-4 sm:p-8"
        aria-busy="true"
        aria-label="Loading Horizon Portal"
      >
        <div className="mx-auto max-w-7xl animate-pulse space-y-6">
          <div className="h-8 w-48 rounded-md bg-border" />
          <div className="h-4 w-72 max-w-full rounded-md bg-border" />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-32 rounded-xl border border-border bg-surface"
              />
            ))}
          </div>

          <p className="text-sm text-muted">Loading your workspace…</p>
        </div>
      </main>
    );
  }

  if (sessionError && !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <section
          role="alert"
          className="w-full max-w-lg rounded-xl border border-border bg-surface p-6"
        >
          <h1 className="text-xl font-bold">Unable to load your workspace</h1>
          <p className="mt-2 text-sm text-muted">{sessionError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Try again
          </button>
        </section>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-surface md:sticky md:top-0 md:flex md:h-screen md:flex-col">
        {renderBrand()}
        {renderNavigation()}
        {renderUserCard()}
      </aside>

      {/* Mobile navigation backdrop */}
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          tabIndex={-1}
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 cursor-default bg-black/50 md:hidden"
        />
      )}

      {/* Mobile sidebar */}
      <aside
        id="mobile-navigation"
        aria-label="Mobile navigation"
        aria-hidden={!mobileMenuOpen}
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col",
          "border-r border-border bg-surface shadow-xl transition-transform duration-200 md:hidden",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="flex items-center justify-between">
          {renderBrand()}
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileMenuOpen(false)}
            className="mr-3 rounded-md p-2 hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="size-5" />
          </button>
        </div>

        {renderNavigation()}
        {renderUserCard()}
      </aside>

      {/* Main workspace */}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-border bg-surface px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
              aria-controls="mobile-navigation"
              aria-expanded={mobileMenuOpen}
              className="rounded-md border border-border p-2 hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:hidden"
            >
              {mobileMenuOpen ? (
                <X aria-hidden="true" className="size-5" />
              ) : (
                <Menu aria-hidden="true" className="size-5" />
              )}
            </button>

            <div className="hidden items-center gap-2 rounded-md border border-border bg-background px-3 sm:flex">
              <Search aria-hidden="true" className="size-4 text-muted" />
              <input
                aria-label="Search portal"
                placeholder="Search portal..."
                className="h-10 w-36 bg-transparent text-sm outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-primary sm:w-48"
              />
            </div>

            <span className="truncate font-bold sm:hidden">
              Horizon Portal
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span className="hidden text-sm text-muted lg:block">
              {formatRole(user?.role)}
            </span>

            <button
              type="button"
              aria-label="Notifications"
              title="Notifications"
              className="relative rounded-md border border-border p-2 hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Bell aria-hidden="true" className="size-5" />
              <span
                aria-hidden="true"
                className="absolute right-1 top-1 size-2 rounded-full bg-primary"
              />
            </button>

            <ThemeToggle />
          </div>
        </header>

        {/* Breadcrumbs */}
        <nav
          aria-label="Breadcrumb"
          className="border-b border-border bg-background px-4 py-3 sm:px-6"
        >
          <ol className="flex items-center gap-2 text-sm">
            <li>
              <Link
                href="/"
                className="text-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Home
              </Link>
            </li>

            {pathname !== "/" && (
              <>
                <li aria-hidden="true">
                  <ChevronRight className="size-4 text-muted" />
                </li>
                <li aria-current="page" className="truncate font-medium">
                  {currentPage}
                </li>
              </>
            )}
          </ol>
        </nav>

        <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
          {sessionError && (
            <div
              role="alert"
              className="mb-5 rounded-lg border border-border p-4 text-sm"
            >
              {sessionError}
            </div>
          )}

          {children}
        </main>

        <footer className="border-t border-border px-6 py-4 text-xs text-muted">
          Horizon Portal · GrowMar · Aura Workforce
        </footer>
      </div>
    </div>
  );
}
