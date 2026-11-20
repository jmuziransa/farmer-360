import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  ClipboardCheck,
  HandCoins,
  Landmark,
  Package,
  Plus,
  ShoppingBasket,
  Sprout,
  Store,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useDeskSession } from "@/components/desk-shell";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
  Skeleton,
  StatCard,
  Table,
  TD,
  TH,
} from "@/components/ui";
import { getDeskOverview, type DeskOverview } from "@/lib/market.functions";
import { cn, formatDate, greeting, longDate, statusMeta, timeAgo, ugx, ugxCompact } from "@/lib/utils";

export const Route = createFileRoute("/desk/")({ component: DeskHome });

function DeskHome() {
  const { profile } = useDeskSession();
  const [data, setData] = useState<DeskOverview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    void getDeskOverview()
      .then((next) => {
        if (alive) setData(next);
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof Error ? err.message : "Could not load the overview.");
      });
    return () => {
      alive = false;
    };
  }, []);

  const firstName = profile.fullName.split(" ")[0];
  const role = profile.role;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Overview · ${longDate()}`}
        title={`${greeting()}, ${firstName}.`}
        description={
          role === "farmer"
            ? "Your harvest, orders and savings book — everything the desk knows about this season, in one place."
            : role === "buyer"
              ? "Produce you have requested, what is on the market today, and the money you hold with the SACCO."
              : role === "officer"
                ? "The savings book, the loan portfolio and every member the co-operative serves."
                : "Approvals waiting, the trading floor and the SACCO position for the whole desk."
        }
        actions={
          role === "farmer" || role === "admin" ? (
            <Button asChild variant="primary" size="sm">
              <Link to="/desk/sell">
                <Plus className="size-3.5" /> List produce
              </Link>
            </Button>
          ) : (
            <Button asChild variant="primary" size="sm">
              <Link to="/market">
                <Store className="size-3.5" /> Browse market
              </Link>
            </Button>
          )
        }
      />

      {error ? (
        <p className="rounded-md border border-danger/25 bg-danger-soft px-3.5 py-3 text-[12.5px] text-danger">
          {error}
        </p>
      ) : null}

      {!data ? (
        <OverviewSkeleton />
      ) : (
        <>
          <StatGrid data={data} />
          <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
            <div className="space-y-4">
              <CashFlowCard data={data} />
              <OrdersCard data={data} />
              <ListingsCard data={data} />
            </div>
            <div className="space-y-4">
              <AttentionCard data={data} />
              <ActivityCard data={data} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────── Stats ─────────────────────────────── */

function StatGrid({ data }: { data: DeskOverview }) {
  const { stats, role } = data;
  const cards =
    role === "farmer"
      ? [
          { label: "My listings", value: stats.myListings, hint: `${stats.liveListings} live across the desk`, icon: Sprout, tone: "olive" as const },
          { label: "Orders waiting", value: stats.pendingOrders, hint: "Requests you have not answered", icon: Package, tone: "amber" as const },
          { label: "Sales settled", value: ugxCompact(stats.sales), hint: "Fulfilled orders to date", icon: TrendingUp, tone: "blue" as const },
          { label: "Savings book", value: ugxCompact(stats.savings), hint: "Deposits minus withdrawals", icon: Wallet, tone: "rust" as const },
        ]
      : role === "buyer"
        ? [
            { label: "My orders", value: stats.myOrders, hint: "Requests you have placed", icon: ShoppingBasket, tone: "blue" as const },
            { label: "Awaiting farmers", value: stats.pendingOrders, hint: "Not yet accepted", icon: Package, tone: "amber" as const },
            { label: "Produce on market", value: stats.liveListings, hint: "Approved and available", icon: Sprout, tone: "olive" as const },
            { label: "Savings book", value: ugxCompact(stats.savings), hint: "Held with the SACCO", icon: Wallet, tone: "rust" as const },
          ]
        : role === "officer"
          ? [
              { label: "Members", value: stats.members, hint: "Registered on the desk", icon: Users, tone: "blue" as const },
              { label: "Savings on book", value: ugxCompact(stats.savings), hint: "Your own balance", icon: Wallet, tone: "olive" as const },
              { label: "Loans outstanding", value: ugxCompact(stats.loanOutstanding), hint: "Approved and repaying", icon: HandCoins, tone: "amber" as const },
              { label: "Awaiting review", value: stats.pendingApprovals, hint: "Listings and loan requests", icon: ClipboardCheck, tone: "rust" as const },
            ]
          : [
              { label: "Members", value: stats.members, hint: "Farmers, buyers and staff", icon: Users, tone: "blue" as const },
              { label: "Live listings", value: stats.liveListings, hint: "On the market right now", icon: Sprout, tone: "olive" as const },
              { label: "Awaiting review", value: stats.pendingApprovals, hint: "Listings and loans", icon: ClipboardCheck, tone: "amber" as const },
              { label: "Trade settled", value: ugxCompact(stats.sales), hint: "Fulfilled orders to date", icon: TrendingUp, tone: "rust" as const },
            ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <StatCard key={card.label} {...card} />
      ))}
    </div>
  );
}

/* ─────────────────────────────── Cash flow ─────────────────────────────── */

function CashFlowCard({ data }: { data: DeskOverview }) {
  const max = Math.max(1, ...data.monthly.flatMap((month) => [month.deposits, month.withdrawals]));
  const totalIn = data.monthly.reduce((sum, month) => sum + month.deposits, 0);
  const totalOut = data.monthly.reduce((sum, month) => sum + month.withdrawals, 0);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>The last six months</CardTitle>
          <p className="mt-1 text-[12.5px] text-muted">
            Money moving through the SACCO book, month by month.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3 font-mono text-[9.5px] tracking-[0.1em] uppercase">
          <span className="inline-flex items-center gap-1.5 text-muted">
            <span className="size-2 rounded-sm bg-olive" /> In
          </span>
          <span className="inline-flex items-center gap-1.5 text-muted">
            <span className="size-2 rounded-sm bg-primary/60" /> Out
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex h-[150px] items-end gap-2 sm:gap-4">
          {data.monthly.map((month) => {
            const inHeight = Math.round((month.deposits / max) * 100);
            const outHeight = Math.round((month.withdrawals / max) * 100);
            return (
              <div key={month.label} className="flex h-full flex-1 flex-col justify-end gap-1.5">
                <div className="flex flex-1 items-end justify-center gap-1">
                  <div
                    className="w-full max-w-3 rounded-t-sm bg-olive/85 transition-[height] duration-500"
                    style={{ height: `${Math.max(inHeight, month.deposits > 0 ? 4 : 0)}%` }}
                    title={`In ${ugx(month.deposits)}`}
                  />
                  <div
                    className="w-full max-w-3 rounded-t-sm bg-primary/60 transition-[height] duration-500"
                    style={{ height: `${Math.max(outHeight, month.withdrawals > 0 ? 4 : 0)}%` }}
                    title={`Out ${ugx(month.withdrawals)}`}
                  />
                </div>
                <p className="text-center font-mono text-[9.5px] tracking-[0.1em] text-muted uppercase">
                  {month.label}
                </p>
              </div>
            );
          })}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3">
          <div>
            <p className="font-mono text-[9.5px] tracking-[0.12em] text-muted uppercase">Deposits</p>
            <p className="mt-1 font-mono text-[15px] text-ink tabular-nums">{ugx(totalIn)}</p>
          </div>
          <div>
            <p className="font-mono text-[9.5px] tracking-[0.12em] text-muted uppercase">Withdrawals</p>
            <p className="mt-1 font-mono text-[15px] text-ink tabular-nums">{ugx(totalOut)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────────── Orders ─────────────────────────────── */

function OrdersCard({ data }: { data: DeskOverview }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Latest orders</CardTitle>
          <p className="mt-1 text-[12.5px] text-muted">Requests, acceptances and deliveries.</p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/desk/orders">
            All orders <ArrowUpRight className="size-3.5" />
          </Link>
        </Button>
      </CardHeader>
      {data.recentOrders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No orders yet"
          body="When a buyer requests your produce it will appear here with its full history."
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <TH>Produce</TH>
              <TH>Counterparty</TH>
              <TH className="text-right">Value</TH>
              <TH>Status</TH>
            </tr>
          </thead>
          <tbody>
            {data.recentOrders.map((order) => {
              const meta = statusMeta(order.status);
              return (
                <tr key={order.id}>
                  <TD>
                    <p className="text-[13px] font-semibold text-ink">{order.crop}</p>
                    <p className="font-mono text-[10.5px] text-muted">
                      {order.quantity} {order.unit} · {formatDate(order.createdAt, true)}
                    </p>
                  </TD>
                  <TD className="text-[12.5px] text-muted">
                    {order.incoming ? `From ${order.buyerName}` : "Requested by you"}
                  </TD>
                  <TD className="text-right font-mono text-[12px] text-ink tabular-nums">
                    {ugxCompact(order.quantity * order.unitPriceUgx)}
                  </TD>
                  <TD>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </TD>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </Card>
  );
}

/* ─────────────────────────────── Listings ─────────────────────────────── */

function ListingsCard({ data }: { data: DeskOverview }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Produce on the record</CardTitle>
          <p className="mt-1 text-[12.5px] text-muted">The most recent listings across the desk.</p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/market">
            Marketplace <ArrowUpRight className="size-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-2.5 pt-1">
        {data.recentListings.length === 0 ? (
          <p className="py-6 text-center text-[12.5px] text-muted">No listings yet.</p>
        ) : (
          data.recentListings.map((listing) => {
            const meta = statusMeta(listing.status);
            return (
              <div
                key={listing.id}
                className="flex items-center justify-between gap-3 rounded-md border border-line bg-paper/60 px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-md border border-olive/15 bg-olive-soft text-olive">
                    <Sprout className="size-3.5" strokeWidth={1.8} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-semibold text-ink">{listing.crop}</p>
                    <p className="truncate font-mono text-[10px] text-muted">
                      {listing.quantity} {listing.unit} · {listing.district}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="hidden font-mono text-[11px] text-ink tabular-nums sm:block">
                    {ugx(listing.unitPriceUgx)}
                  </span>
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────────── Attention ─────────────────────────────── */

type AttentionPath = "/desk/orders" | "/desk/sell" | "/desk/loans" | "/desk/sacco" | "/desk/admin" | "/market" | "/desk/farm" | "/desk/advice";

function AttentionCard({ data }: { data: DeskOverview }) {
  const { stats, role } = data;
  const rows: { label: string; body: string; count: number; to: AttentionPath; icon: typeof Bell }[] = [];

  if (role === "farmer") {
    rows.push(
      {
        label: "Orders to answer",
        body: "Accept, fulfil or decline a buyer request.",
        count: stats.pendingOrders,
        to: "/desk/orders",
        icon: Package,
      },
      {
        label: "Farm records",
        body: "Crops, livestock, the store and this season's money.",
        count: 0,
        to: "/desk/farm",
        icon: Sprout,
      },
      {
        label: "Loan balance",
        body: stats.loanOutstanding > 0 ? "Record a repayment with the SACCO." : "Nothing outstanding.",
        count: stats.loanOutstanding > 0 ? 1 : 0,
        to: "/desk/loans",
        icon: HandCoins,
      },
    );
  } else if (role === "buyer") {
    rows.push(
      {
        label: "Requests in progress",
        body: "Follow what the farmers have answered.",
        count: stats.pendingOrders,
        to: "/desk/orders",
        icon: Package,
      },
      {
        label: "Produce available",
        body: "Approved listings you can order today.",
        count: stats.liveListings,
        to: "/market",
        icon: Store,
      },
      {
        label: "Loan balance",
        body: stats.loanOutstanding > 0 ? "A repayment is still open." : "Nothing outstanding.",
        count: stats.loanOutstanding > 0 ? 1 : 0,
        to: "/desk/loans",
        icon: HandCoins,
      },
    );
  } else if (role === "officer") {
    rows.push(
      {
        label: "Approvals waiting",
        body: "Produce and loan requests in the queue.",
        count: stats.pendingApprovals,
        to: "/desk/admin",
        icon: ClipboardCheck,
      },
      {
        label: "Loans outstanding",
        body: "Approved loans still being repaid.",
        count: stats.loanOutstanding > 0 ? 1 : 0,
        to: "/desk/loans",
        icon: HandCoins,
      },
      {
        label: "SACCO book",
        body: "Record a deposit or withdrawal.",
        count: 0,
        to: "/desk/sacco",
        icon: Landmark,
      },
    );
  } else {
    rows.push(
      {
        label: "Approvals waiting",
        body: "Listings and loans the desk is holding.",
        count: stats.pendingApprovals,
        to: "/desk/admin",
        icon: ClipboardCheck,
      },
      {
        label: "Members to review",
        body: "Roles and access for every account.",
        count: stats.members,
        to: "/desk/admin",
        icon: Users,
      },
      {
        label: "AI agronomist",
        body: "Field questions from the co-operative.",
        count: 0,
        to: "/desk/advice",
        icon: Bell,
      },
    );
  }

  return (
    <Card className="bg-navy text-sidebar-foreground">
      <CardHeader>
        <div>
          <p className="font-mono text-[9.5px] tracking-[0.16em] text-[#8fbaff] uppercase">Needs you</p>
          <h3 className="mt-1.5 font-display text-[17px] leading-snug text-white">The desk at a glance</h3>
        </div>
        <Badge tone="outline" className="border-white/20 bg-white/5 text-sidebar-muted">
          {role === "admin" ? "Admin" : role === "officer" ? "Officer" : role === "buyer" ? "Buyer" : "Farmer"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {rows.map((row) => (
          <Link
            key={row.label}
            to={row.to}
            className="group flex items-start gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2.5 transition-colors hover:border-white/25 hover:bg-white/[0.06]"
          >
            <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md border border-white/10 bg-white/[0.04] text-[#8fbaff]">
              <row.icon className="size-3.5" strokeWidth={1.8} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="text-[12.5px] font-semibold text-white">{row.label}</span>
                {row.count > 0 ? (
                  <span className="rounded-full border border-primary/40 bg-primary/25 px-1.5 py-0.5 font-mono text-[9px] text-[#a9c9ff]">
                    {row.count}
                  </span>
                ) : (
                  <Check className="size-3.5 text-olive-soft" />
                )}
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-sidebar-muted">{row.body}</span>
            </span>
          </Link>
        ))}
        <Link
          to="/desk/account"
          className="mt-2 flex items-center justify-between px-1 pt-2 font-mono text-[9.5px] tracking-[0.12em] text-sidebar-muted uppercase transition-colors hover:text-white"
        >
          Account settings <ArrowRight className="size-3" />
        </Link>
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────────── Activity ─────────────────────────────── */

function ActivityCard({ data }: { data: DeskOverview }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Activity</CardTitle>
          <p className="mt-1 text-[12.5px] text-muted">
            {data.unread > 0 ? `${data.unread} unread updates` : "Everything is read"}
          </p>
        </div>
        <span className="grid size-7 shrink-0 place-items-center rounded-md border border-primary/20 bg-primary-soft text-primary">
          <Bell className="size-3.5" strokeWidth={1.8} />
        </span>
      </CardHeader>
      <CardContent className="pt-1">
        {data.activity.length === 0 ? (
          <p className="py-6 text-center text-[12.5px] text-muted">Nothing has happened yet.</p>
        ) : (
          <ol className="relative space-y-3.5 pl-4">
            <span aria-hidden className="absolute top-1.5 bottom-1.5 left-[3px] w-px bg-line" />
            {data.activity.map((item) => (
              <li key={item.id} className="relative">
                <span
                  className={cn(
                    "absolute top-1.5 -left-4 size-[7px] rounded-full border",
                    item.readAt ? "border-line-strong bg-paper" : "border-primary bg-primary",
                  )}
                />
                <p className={cn("text-[12px] leading-snug", item.readAt ? "text-ink/70" : "font-semibold text-ink")}>
                  {item.title}
                </p>
                {item.body ? (
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted">{item.body}</p>
                ) : null}
                <p className="mt-0.5 font-mono text-[9px] tracking-[0.08em] text-muted-soft uppercase">
                  {timeAgo(item.createdAt)}
                </p>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────────── Loading ─────────────────────────────── */

function OverviewSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-[104px]" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <div className="space-y-4">
          <Skeleton className="h-[280px]" />
          <Skeleton className="h-[240px]" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-[280px]" />
          <Skeleton className="h-[240px]" />
        </div>
      </div>
    </div>
  );
}
