import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Bell,
  Check,
  ChevronDown,
  ClipboardCheck,
  HandCoins,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircleQuestion,
  Package,
  Search,
  Settings,
  ShieldCheck,
  Sprout,
  Store,
  Tractor,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { LogoMark, Wordmark } from "@/components/brand";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownItem,
  DropdownLabel,
  DropdownMenuTrigger,
  DropdownSeparator,
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
} from "@/components/overlays";
import { Avatar, Badge, Button } from "@/components/ui";
import { signOut } from "@/lib/auth/client";
import type { AppUser } from "@/lib/auth/use-current-user";
import {
  listNotifications,
  markNotificationsRead,
  type NotificationRow,
  type Profile,
  type Role,
} from "@/lib/market.functions";
import { cn, roleLabel, timeAgo } from "@/lib/utils";

export type DeskSessionValue = {
  user: AppUser;
  profile: Profile;
  reload: () => Promise<void>;
};

const DeskSessionContext = createContext<DeskSessionValue | null>(null);

export function useDeskSession(): DeskSessionValue {
  const value = useContext(DeskSessionContext);
  if (!value) throw new Error("useDeskSession must be used inside the desk shell.");
  return value;
}

type DeskPath =
  | "/desk"
  | "/desk/farm"
  | "/desk/advice"
  | "/market"
  | "/desk/sell"
  | "/desk/orders"
  | "/desk/loans"
  | "/desk/sacco"
  | "/desk/admin"
  | "/desk/account";

type NavItem = {
  to: DeskPath;
  label: string;
  icon: LucideIcon;
  roles?: Role[];
  hint?: string;
};

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Desk",
    items: [{ to: "/desk", label: "Overview", icon: LayoutDashboard }],
  },
  {
    label: "The farm",
    items: [
      { to: "/desk/farm", label: "Farm records", icon: Tractor },
      { to: "/desk/advice", label: "AI agronomist", icon: MessageCircleQuestion },
    ],
  },
  {
    label: "Trade",
    items: [
      { to: "/market", label: "Marketplace", icon: Store },
      { to: "/desk/sell", label: "My listings", icon: Sprout, roles: ["farmer", "admin"] },
      { to: "/desk/orders", label: "Orders", icon: Package },
    ],
  },
  {
    label: "Money",
    items: [
      { to: "/desk/loans", label: "Loans", icon: HandCoins },
      { to: "/desk/sacco", label: "SACCO book", icon: Landmark },
    ],
  },
  {
    label: "Administration",
    items: [
      { to: "/desk/admin", label: "Approvals & members", icon: ShieldCheck, roles: ["admin", "officer"] },
    ],
  },
  {
    label: "Account",
    items: [{ to: "/desk/account", label: "Settings", icon: Settings }],
  },
];

const PAGE_TITLES: Record<string, string> = {
  "/desk": "Overview",
  "/desk/farm": "Farm records",
  "/desk/advice": "AI agronomist",
  "/desk/sell": "My listings",
  "/desk/orders": "Orders",
  "/desk/loans": "Loans",
  "/desk/sacco": "SACCO book",
  "/desk/admin": "Approvals & members",
  "/desk/account": "Settings",
  "/market": "Marketplace",
};

const MOBILE_NAV: NavItem[] = [
  { to: "/desk", label: "Desk", icon: LayoutDashboard },
  { to: "/desk/farm", label: "Farm", icon: Tractor },
  { to: "/market", label: "Market", icon: Store },
  { to: "/desk/orders", label: "Orders", icon: Package },
  { to: "/desk/account", label: "Account", icon: Settings },
];

function visibleGroups(role: Role) {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.roles || item.roles.includes(role)),
  })).filter((group) => group.items.length > 0);
}

function notificationIcon(kind: string): LucideIcon {
  switch (kind) {
    case "order":
      return Package;
    case "loan":
      return HandCoins;
    case "savings":
      return Wallet;
    case "approval":
      return ClipboardCheck;
    case "member":
      return Users;
    default:
      return Sprout;
  }
}

export function DeskShell({ session, children }: { session: DeskSessionValue; children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const title = PAGE_TITLES[pathname] ?? "Desk";
  const groups = visibleGroups(session.profile.role);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <DeskSessionContext.Provider value={session}>
      <div className="min-h-screen bg-canvas">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] lg:block">
          <SidebarContent session={session} groups={groups} />
        </aside>

        <div className="lg:pl-[264px]">
          <header className="sticky top-0 z-20 border-b border-line bg-canvas/90 backdrop-blur-md">
            <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
                    <Menu className="size-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[286px] max-w-[86vw] p-0">
                  <SidebarContent
                    session={session}
                    groups={groups}
                    onNavigate={() => setMobileOpen(false)}
                    withClose
                  />
                </SheetContent>
              </Sheet>

              <div className="hidden min-w-0 items-center gap-2 sm:flex">
                <span className="font-mono text-[9.5px] tracking-[0.14em] text-muted uppercase">
                  Desk
                </span>
                <span className="text-muted-soft">/</span>
                <span className="truncate text-[13px] font-semibold text-ink">{title}</span>
              </div>

              <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
                <QuickFind groups={groups} />
                <NotificationBell />
                <UserMenu session={session} />
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1200px] px-4 pt-6 pb-24 sm:px-6 lg:px-8 lg:pt-8 lg:pb-10">
            {children}
          </main>
        </div>

        <MobileTabBar role={session.profile.role} pathname={pathname} />
      </div>
    </DeskSessionContext.Provider>
  );
}

/* ─────────────────────────────── Sidebar ─────────────────────────────── */

function SidebarContent({
  session,
  groups,
  onNavigate,
  withClose,
}: {
  session: DeskSessionValue;
  groups: { label: string; items: NavItem[] }[];
  onNavigate?: () => void;
  withClose?: boolean;
}) {
  const { profile } = session;
  const workspace = profile.farmName ?? (profile.role === "admin" ? "Farmer 360 desk" : profile.fullName);

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center justify-between gap-2 border-b border-white/10 px-4">
        <Link to="/" onClick={onNavigate} aria-label="Farmer 360 home">
          <Wordmark onDark compact />
        </Link>
        {withClose ? (
          <SheetClose asChild>
            <Button variant="ghost" size="icon" className="text-sidebar-muted hover:bg-white/5 hover:text-white" aria-label="Close navigation">
              <X className="size-5" />
            </Button>
          </SheetClose>
        ) : null}
      </div>

      <div className="px-3 pt-4">
        <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-primary/20 text-[#8fbaff]">
              <Sprout className="size-4" strokeWidth={1.7} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12.5px] font-semibold text-white">{workspace}</p>
              <p className="mt-0.5 truncate font-mono text-[9.5px] text-sidebar-muted">
                {profile.district ?? "Uganda"} · {roleLabel(profile.role)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <nav className="desk-scroll mt-4 flex-1 overflow-y-auto px-3 pb-4" aria-label="Desk">
        {groups.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="mb-1.5 px-2.5 font-mono text-[9px] tracking-[0.18em] text-sidebar-muted/70 uppercase">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  activeProps={{ className: "bg-white/[0.09] text-white" }}
                  activeOptions={{ exact: item.to === "/desk" }}
                  className="sidebar-link group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px]"
                >
                  <item.icon
                    className="size-4 shrink-0 text-sidebar-muted transition-colors group-hover:text-[#8fbaff]"
                    strokeWidth={1.7}
                  />
                  <span className="truncate">{item.label}</span>
                  {item.to === "/desk/admin" ? (
                    <span className="ml-auto rounded-full border border-primary/40 bg-primary/25 px-1.5 py-0.5 font-mono text-[8px] text-[#a9c9ff]">
                      Queue
                    </span>
                  ) : null}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 font-mono text-[9px] tracking-[0.12em] text-sidebar-muted uppercase">
              <Sprout className="size-3" /> Season 2026
            </span>
            <span className="font-mono text-[9px] text-sidebar-muted">Second planting</span>
          </div>
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-[62%] rounded-full bg-primary" />
          </div>
          <p className="mt-2 text-[10.5px] leading-snug text-sidebar-muted">
            The desk is in good standing. Keep every entry dated.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 border-t border-white/10 px-4 py-3">
        <Avatar name={profile.fullName} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold text-white">{profile.fullName}</p>
          <p className="truncate font-mono text-[9px] text-sidebar-muted">{roleLabel(profile.role)}</p>
        </div>
        <SignOutButton />
      </div>
    </div>
  );
}

function SignOutButton() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      aria-label="Sign out"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        void signOut("/").catch((err: unknown) => {
          setBusy(false);
          toast.error(err instanceof Error ? err.message : "Could not sign out.");
        });
      }}
      className="grid size-8 place-items-center rounded-md text-sidebar-muted transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50"
    >
      <LogOut className="size-4" />
    </button>
  );
}

/* ─────────────────────────────── Mobile tab bar ─────────────────────────────── */

function MobileTabBar({ role, pathname }: { role: Role; pathname: string }) {
  const items = MOBILE_NAV.filter((item) => !item.roles || item.roles.includes(role));
  return (
    <nav
      aria-label="Desk sections"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas/95 backdrop-blur-md lg:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {items.map((item) => {
          const active = item.to === "/desk" ? pathname === "/desk" : pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors",
                active ? "text-primary" : "text-muted",
              )}
            >
              <item.icon className="size-5" strokeWidth={active ? 2 : 1.7} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/* ─────────────────────────────── Quick find ─────────────────────────────── */

function QuickFind({ groups }: { groups: { label: string; items: NavItem[] }[] }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const items = useMemo(() => groups.flatMap((group) => group.items), [groups]);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 5);
    return items.filter((item) => item.label.toLowerCase().includes(q));
  }, [items, query]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={boxRef} className="relative hidden md:block">
      <div className="flex h-9 w-56 items-center gap-2 rounded-md border border-line bg-paper px-2.5">
        <Search className="size-3.5 shrink-0 text-muted" />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && results[0]) {
              setOpen(false);
              setQuery("");
              void navigate({ to: results[0].to });
            }
          }}
          placeholder="Quick find…"
          aria-label="Quick find a page"
          className="w-full bg-transparent text-[12.5px] text-ink placeholder:text-muted-soft focus:outline-none"
        />
      </div>
      {open ? (
        <div className="absolute top-10 right-0 z-30 w-64 overflow-hidden rounded-lg border border-line bg-surface p-1.5 shadow-[0_20px_50px_-20px_rgba(15,17,20,0.35)]">
          {results.length === 0 ? (
            <p className="px-2.5 py-3 text-[12px] text-muted">No page matches that.</p>
          ) : (
            results.map((item) => (
              <button
                key={item.to}
                type="button"
                onClick={() => {
                  setOpen(false);
                  setQuery("");
                  void navigate({ to: item.to });
                }}
                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[12.5px] text-ink hover:bg-paper"
              >
                <item.icon className="size-3.5 text-muted" />
                {item.label}
                <ArrowUpRight className="ml-auto size-3 text-muted-soft" />
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

/* ─────────────────────────────── Notifications ─────────────────────────────── */

function NotificationBell() {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    void listNotifications()
      .then((next) => {
        setItems(next.items);
        setUnread(next.unread);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 60_000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  function markAll() {
    void markNotificationsRead({ data: { all: true } }).then(() => {
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
      setUnread(0);
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}>
          <Bell className="size-[18px]" />
          {unread > 0 ? (
            <span className="absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-danger px-1 font-mono text-[8px] leading-4 text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[340px] p-0" align="end">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <p className="font-display text-[15px] text-ink">Notifications</p>
            <p className="mt-0.5 font-mono text-[9px] tracking-[0.1em] text-muted uppercase">
              {unread} unread · {items.length} recent
            </p>
          </div>
          <button
            type="button"
            onClick={markAll}
            disabled={unread === 0}
            className="rounded-md border border-line px-2 py-1 font-mono text-[9px] tracking-[0.06em] text-muted uppercase transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
          >
            Mark all
          </button>
        </div>
        <div className="desk-scroll max-h-[360px] overflow-y-auto">
          {loading ? (
            <div className="space-y-2 p-3">
              {[0, 1, 2].map((index) => (
                <div key={index} className="h-14 animate-pulse rounded-md bg-paper" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Check className="mx-auto size-5 text-olive" />
              <p className="mt-2 text-[12.5px] text-muted">Nothing new. The desk is quiet.</p>
            </div>
          ) : (
            items.map((item) => {
              const Icon = notificationIcon(item.kind);
              return (
                <DropdownItem key={item.id} asChild className="items-start gap-3 rounded-none border-b border-line/70 px-4 py-3 last:border-b-0">
                  <a href={item.href ?? "/desk"} onClick={() => { void markNotificationsRead({ data: { id: item.id } }); }}>
                    <span
                      className={cn(
                        "mt-0.5 grid size-7 shrink-0 place-items-center rounded-md border",
                        item.readAt
                          ? "border-line bg-paper text-muted"
                          : "border-primary/20 bg-primary-soft text-primary",
                      )}
                    >
                      <Icon className="size-3.5" strokeWidth={1.7} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-[12px] leading-snug", item.readAt ? "text-ink/70" : "font-semibold text-ink")}>
                        {item.title}
                      </span>
                      {item.body ? (
                        <span className="mt-0.5 line-clamp-2 block text-[11px] leading-snug text-muted">
                          {item.body}
                        </span>
                      ) : null}
                      <span className="mt-1 block font-mono text-[8.5px] tracking-[0.08em] text-muted-soft uppercase">
                        {timeAgo(item.createdAt)}
                      </span>
                    </span>
                    {!item.readAt ? <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" /> : null}
                  </a>
                </DropdownItem>
              );
            })
          )}
        </div>
        <div className="border-t border-line px-4 py-2.5">
          <Link to="/desk" className="flex items-center justify-between text-[11.5px] font-semibold text-muted hover:text-ink">
            Open the overview <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ─────────────────────────────── User menu ─────────────────────────────── */

function UserMenu({ session }: { session: DeskSessionValue }) {
  const { profile, user } = session;
  const [busy, setBusy] = useState(false);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-md border border-transparent py-1 pr-1.5 pl-1 transition-colors hover:border-line hover:bg-paper"
          aria-label="Account menu"
        >
          <Avatar name={profile.fullName} size="sm" />
          <span className="hidden min-w-0 text-left lg:block">
            <span className="block max-w-32 truncate text-[11.5px] leading-tight font-semibold text-ink">
              {profile.fullName}
            </span>
            <span className="block font-mono text-[8.5px] tracking-[0.08em] text-muted uppercase">
              {roleLabel(profile.role)}
            </span>
          </span>
          <ChevronDown className="hidden size-3.5 text-muted lg:block" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        <div className="px-2.5 py-2">
          <p className="text-[13px] font-semibold text-ink">{profile.fullName}</p>
          <p className="mt-0.5 truncate font-mono text-[10px] text-muted">{user.primaryEmail}</p>
          <div className="mt-2 flex items-center gap-1.5">
            <Badge tone="neutral">{roleLabel(profile.role)}</Badge>
            {profile.district ? <Badge tone="outline">{profile.district}</Badge> : null}
          </div>
        </div>
        <DropdownSeparator />
        <DropdownItem asChild>
          <Link to="/desk/account">
            <Settings className="size-3.5" /> Account settings
          </Link>
        </DropdownItem>
        <DropdownItem asChild>
          <Link to="/market">
            <Store className="size-3.5" /> Marketplace
          </Link>
        </DropdownItem>
        <DropdownItem asChild>
          <Link to="/">
            <ArrowUpRight className="size-3.5" /> Public site
          </Link>
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem
          disabled={busy}
          onSelect={(event) => {
            event.preventDefault();
            setBusy(true);
            void signOut("/").catch((err: unknown) => {
              setBusy(false);
              toast.error(err instanceof Error ? err.message : "Could not sign out.");
            });
          }}
          className="text-danger data-[highlighted]:bg-danger-soft"
        >
          <LogOut className="size-3.5" /> {busy ? "Signing out…" : "Sign out"}
        </DropdownItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ─────────────────────────────── Loading / missing profile ─────────────────────────────── */

export function DeskLoading() {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas">
      <div className="flex flex-col items-center gap-3">
        <LogoMark className="size-11 animate-pulse" />
        <p className="font-mono text-[10px] tracking-[0.16em] text-muted uppercase">
          Opening your desk…
        </p>
      </div>
    </div>
  );
}

export function DeskMissingProfile({ email }: { email: string | null }) {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-5">
      <div className="w-full max-w-md rounded-card border border-line bg-surface p-7">
        <LogoMark className="size-10" />
        <h1 className="mt-5 font-display text-[26px] leading-tight text-ink">
          Your desk needs a role.
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          {email ? `${email} is signed in, ` : ""}but no profile is attached yet. Complete
          the short sign-up form so the desk knows whether you are a farmer, buyer or
          SACCO officer.
        </p>
        <Button asChild className="mt-5 w-full">
          <Link to="/signup">Complete sign-up</Link>
        </Button>
        <Button asChild variant="ghost" className="mt-2 w-full">
          <Link to="/">Back to the site</Link>
        </Button>
      </div>
    </div>
  );
}
