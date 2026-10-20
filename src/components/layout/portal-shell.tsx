
import Link from "next/link";
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
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const navigation = [
  {
    heading: "WORKSPACE",
    items: [
      { label: "Home", href: "/", icon: LayoutDashboard },
      { label: "My Profile", href: "/profile", icon: UserRound },
      { label: "Directory", href: "/employees", icon: Users },
      { label: "Leave", href: "/leave", icon: CalendarDays },
      { label: "Payslips", href: "/payslips", icon: Wallet },
    ],
  },
  {
    heading: "ADMINISTRATION",
    items: [
      { label: "Employees", href: "/admin", icon: Users },
      { label: "Approvals", href: "/approvals", icon: ClipboardCheck },
      { label: "Payroll", href: "/payroll", icon: Banknote },
      { label: "Finance", href: "/finance", icon: Receipt },
    ],
  },
  {
    heading: "TEAM & INSIGHTS",
    items: [
      { label: "Team Board", href: "/team-board", icon: KanbanSquare },
      { label: "AI Insights", href: "/insights", icon: BrainCircuit },
      { label: "HR Assistant", href: "/assistant", icon: MessageCircle },
    ],
  },
];

export function PortalShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground md:flex">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-surface md:flex md:flex-col">
        <Link href="/" className="flex items-center gap-3 border-b border-border p-6">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
            H
          </span>
          <span>
            <span className="block font-bold">Horizon Portal</span>
            <span className="block text-xs text-muted">Aura Workforce</span>
          </span>
        </Link>

        <nav className="flex-1 space-y-6 overflow-y-auto p-4">
          {navigation.map((group) => (
            <section key={group.heading}>
              <p className="mb-2 px-3 text-xs font-bold tracking-wider text-muted">
                {group.heading}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-primary-soft hover:text-primary"
                    >
                      <Icon aria-hidden="true" className="size-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </nav>

        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3 rounded-lg bg-background p-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-primary-soft font-bold text-primary">
              NS
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Navaneetha S</p>
              <p className="text-xs text-muted">Demo employee</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between gap-3 border-b border-border bg-surface px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-md border border-border p-2 md:hidden"
              aria-label="Mobile navigation is available in the desktop sidebar"
              title="Navigation"
            >
              <Menu className="size-5" />
            </button>
            <div className="hidden items-center gap-2 rounded-md border border-border bg-background px-3 sm:flex">
              <Search className="size-4 text-muted" />
              <input
                aria-label="Search"
                placeholder="Search portal..."
                className="h-10 w-48 bg-transparent text-sm outline-none"
              />
            </div>
            <span className="font-bold sm:hidden">Horizon</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="relative rounded-md border border-border p-2"
              aria-label="Notifications"
            >
              <Bell className="size-5" />
              <span className="absolute right-1 top-1 size-2 rounded-full bg-primary" />
            </button>
            <ThemeToggle />
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
          {children}
        </main>

        <footer className="border-t border-border px-6 py-4 text-xs text-muted">
          Horizon Portal · GrowMar · Aura Workforce
        </footer>
      </div>
    </div>
  );
}
