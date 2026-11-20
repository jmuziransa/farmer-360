import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Check, ClipboardCheck, HandCoins, Landmark, Package, Quote, Sprout, Store, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { MarketingFooter, MarketingHeader, Wordmark } from "@/components/brand";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/overlays";
import { Badge, Button, Card, CardContent } from "@/components/ui";
import { publicDemoFarm, type DemoFarmSnapshot } from "@/lib/farm.functions";
import { displayDate, moduleLabels } from "@/lib/farm-entry-rules";
import { getPublicStats } from "@/lib/market.functions";
import { ugx, ugxCompact } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Home });

const STEPS = [
  {
    icon: Sprout,
    title: "Record the farm",
    body: "Crops, livestock, poultry, milk and eggs — every entry dated, with the store ledger and the season's money alongside.",
  },
  {
    icon: ClipboardCheck,
    title: "List and approve",
    body: "A farmer submits produce with a price in UGX. An administrator reviews it before it reaches the market.",
  },
  {
    icon: Package,
    title: "Order and deliver",
    body: "Buyers filter the approved listings, place a request, and the farmer accepts, fulfils or declines it.",
  },
  {
    icon: Landmark,
    title: "Save and borrow",
    body: "The SACCO officer keeps the savings book, disburses approved loans and records every repayment.",
  },
] as const;

const FAQS = [
  {
    q: "Is Farmer 360 free to use?",
    a: "Yes. The desk is a Light Academy community project built for smallholder farmers, buyers and SACCOs. Every feature on this page — records, marketplace, loans and savings — is available to registered members at no cost.",
  },
  {
    q: "Who can see my farm records?",
    a: "Your farm workspace is private to your account. Only the produce you explicitly list reaches the marketplace, and only after an administrator approves it. The public landing page shows totals, never your personal sales.",
  },
  {
    q: "How do loans work?",
    a: "A member applies with an amount, a purpose and a term. An administrator approves or declines it, a SACCO officer disburses it, and repayments are recorded against the loan until it closes. It is a desk record for the co-operative, not a bank offer.",
  },
  {
    q: "What is the AI agronomist?",
    a: "A question-and-answer page inside the desk where members describe what they see in the field or the shed and get practical advice tuned to Ugandan growing conditions. Every answer is saved so you can compare it with what actually happens.",
  },
  {
    q: "Can I try it without registering?",
    a: "Yes — the login page carries four demo accounts (farmer, buyer, SACCO officer, administrator) with a full season of records already written. Pick one, sign in, and explore the whole desk.",
  },
] as const;

function Home() {
  const [demo, setDemo] = useState<DemoFarmSnapshot | null>(null);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getPublicStats>> | null>(null);

  useEffect(() => {
    // Seed first, then read the public demo snapshot — a fresh deployment has
    // no farm data until the seed claims its gate row.
    void seedAndLoad();
    async function seedAndLoad() {
      const { seedDesk } = await import("@/lib/market.functions");
      try {
        await seedDesk();
      } catch (err) {
        console.error("[seed] failed", err);
      }
      await Promise.all([
        publicDemoFarm().then(setDemo).catch(() => undefined),
        getPublicStats().then(setStats).catch(() => undefined),
      ]);
    }
  }, []);

  return (
    <div id="top" className="min-h-screen bg-canvas">
      <MarketingHeader />

      {/* Hero: the Coursera split — navy pitch card beside white discovery tiles. */}
      <section className="container-page pt-10 pb-14 lg:pt-16 lg:pb-20">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
          <div className="rounded-card bg-navy p-8 text-sidebar-foreground sm:p-10">
            <p className="eyebrow text-[#8fbaff]">Community agriculture desk</p>
            <h1 className="mt-4 font-display text-[32px] leading-[1.12] text-white sm:text-[40px]">
              A recorded place for your farm, produce, orders and the SACCO.
            </h1>
            <p className="mt-4 max-w-lg text-[14.5px] leading-relaxed text-sidebar-muted">
              Farmer 360 keeps the whole season in one honest record — the fields, the
              store, the marketplace and the savings book — so the farmer, the buyer
              and the co-operative all see the same numbers.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/signup">
                  Join for free <ArrowUpRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="border-white/20 bg-white/5 text-white hover:bg-white/10">
                <Link to="/login">Open the demo desk</Link>
              </Button>
            </div>
            {stats ? (
              <dl className="mt-9 grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
                <div>
                  <dd className="font-mono text-[20px] text-white tabular-nums">{stats.members}</dd>
                  <dt className="mt-1 font-mono text-[9px] tracking-[0.12em] text-sidebar-muted uppercase">Members</dt>
                </div>
                <div>
                  <dd className="font-mono text-[20px] text-white tabular-nums">{stats.liveListings}</dd>
                  <dt className="mt-1 font-mono text-[9px] tracking-[0.12em] text-sidebar-muted uppercase">Live listings</dt>
                </div>
                <div>
                  <dd className="font-mono text-[20px] text-white tabular-nums">{ugxCompact(stats.savings)}</dd>
                  <dt className="mt-1 font-mono text-[9px] tracking-[0.12em] text-sidebar-muted uppercase">SACCO savings</dt>
                </div>
              </dl>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {STEPS.map((step, index) => (
              <Card key={step.title} className="surface-hover">
                <CardContent className="p-5">
                  <span className="grid size-9 place-items-center rounded-md border border-primary/15 bg-primary-xsoft text-primary">
                    <step.icon className="size-4.5" strokeWidth={1.7} />
                  </span>
                  <p className="mt-4 font-display text-[16px] text-ink">{step.title}</p>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{step.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Demo farm snapshot: real seeded records, shown as the farmer sees them. */}
      {demo ? (
        <section id="platform" className="border-y border-line bg-paper/60 py-14 lg:py-18">
          <div className="container-page">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="eyebrow text-primary">From the demo farm</p>
                <h2 className="mt-2 font-display text-[26px] text-ink sm:text-[30px]">{demo.name}</h2>
                <p className="mt-1.5 text-[13.5px] text-muted">
                  {demo.district}
                  {demo.village ? ` · ${demo.village}` : ""} · {demo.sizeAcres} acres · records seeded in this deployment
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/login">
                  Sign in as the farmer <ArrowUpRight className="size-3.5" />
                </Link>
              </Button>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Growing crops" value={String(demo.cropCount)} />
              <Stat label="Head of animals" value={String(demo.animalCount)} />
              <Stat label="Recorded income" value={ugx(demo.financeIncome)} />
              <Stat label="Recorded spending" value={ugx(demo.financeExpense)} />
            </div>
            <Card className="mt-6 overflow-hidden">
              <ul className="divide-y divide-line">
                {demo.records.slice(0, 8).map((r) => (
                  <li key={`${r.module}-${r.name}-${r.recordDate}`} className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-3 text-[13px]">
                    <span>
                      <span className="font-semibold text-ink">{r.name}</span>
                      <span className="text-muted"> · {moduleLabels[r.module as keyof typeof moduleLabels] ?? r.module}</span>
                    </span>
                    <span className="font-mono text-[11px] text-muted">
                      {r.status} · {r.quantity} {r.unit} · {displayDate(r.recordDate)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
            <p className="mt-3 text-xs text-muted">
              Totals come from the farm's finance records; individual sale amounts and personal details stay private to the account.
            </p>
          </div>
        </section>
      ) : null}

      {/* Roles */}
      <section id="how" className="py-14 lg:py-18">
        <div className="container-page">
          <p className="eyebrow text-primary">How the desk works</p>
          <h2 className="mt-2 max-w-2xl font-display text-[26px] text-ink sm:text-[30px]">
            Four roles, one record.
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <RoleCard
              icon={Sprout}
              role="Farmer"
              body="Lists produce, follows its approval, applies for loans and watches the savings book."
            />
            <RoleCard
              icon={Store}
              role="Buyer"
              body="Filters approved produce by crop, district and price, then places a tracked order."
            />
            <RoleCard
              icon={Users}
              role="SACCO officer"
              body="Records deposits and withdrawals, disburses approved loans, posts repayments."
            />
            <RoleCard
              icon={ClipboardCheck}
              role="Administrator"
              body="Runs the approval queue for produce and loans, and manages member roles."
            />
          </div>
        </div>
      </section>

      {/* Testimonial band (navy) */}
      <section className="py-14 lg:py-18">
        <div className="container-page">
          <div className="rounded-card bg-navy px-8 py-10 text-sidebar-foreground sm:px-12 lg:px-16">
            <Quote className="size-7 text-[#8fbaff]" />
            <blockquote className="mt-5 max-w-3xl font-display text-[22px] leading-[1.35] text-white sm:text-[26px]">
              Before the desk, my maize record was a notebook and memory. Now the buyer,
              the SACCO and I read the same page — and the loan meeting takes minutes,
              not an afternoon.
            </blockquote>
            <p className="mt-6 font-mono text-[10px] tracking-[0.14em] text-sidebar-muted uppercase">
              Amina Nakato · Nakato Family Farm · Mukono
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-y border-line bg-paper/60 py-14 lg:py-18">
        <div className="container-page">
          <p className="eyebrow text-primary">Pricing</p>
          <h2 className="mt-2 font-display text-[26px] text-ink sm:text-[30px]">Free for the co-operative.</h2>
          <div className="mt-8 grid gap-4 lg:grid-cols-[1.15fr_1fr]">
            <Card>
              <CardContent className="p-7">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <p className="font-display text-[19px] text-ink">The community desk</p>
                  <Badge tone="rust">Free</Badge>
                </div>
                <p className="mt-1 font-mono text-[28px] text-ink tabular-nums">UGX 0<span className="text-[14px] text-muted"> / forever</span></p>
                <ul className="mt-5 space-y-2.5 text-[13.5px]">
                  {[
                    "Farm records: crops, livestock, poultry, eggs, milk, tasks, finance",
                    "Store ledger with stock movements and CSV export",
                    "Marketplace listings with administrator approval",
                    "Orders, SACCO savings, loans and repayments",
                    "AI agronomist and notification bell",
                    "Demo accounts with a full season of data",
                  ].map((line) => (
                    <li key={line} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 size-4 shrink-0 text-olive" />
                      {line}
                    </li>
                  ))}
                </ul>
                <Button asChild className="mt-7 w-full" size="lg">
                  <Link to="/signup">Create an account</Link>
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-7">
                <p className="font-display text-[19px] text-ink">For district offices</p>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
                  Running several co-operatives? The same desk keeps every SACCO book
                  separate while giving the district office its own approvals and
                  member roles. Talk to us about a deployment for your offices.
                </p>
                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-3 rounded-md border border-line bg-paper/60 px-3.5 py-3">
                    <HandCoins className="size-4 text-primary" />
                    <p className="text-[13px] text-ink">Savings and loan portfolio per office</p>
                  </div>
                  <div className="flex items-center gap-3 rounded-md border border-line bg-paper/60 px-3.5 py-3">
                    <Users className="size-4 text-primary" />
                    <p className="text-[13px] text-ink">Member roles across co-operatives</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-14 lg:py-18">
        <div className="container-page grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="eyebrow text-primary">FAQ</p>
            <h2 className="mt-2 font-display text-[26px] text-ink sm:text-[30px]">Frequently asked</h2>
            <p className="mt-2 max-w-sm text-[13.5px] leading-relaxed text-muted">
              Everything members ask before their first market day. Still curious? The
              demo desk answers the rest.
            </p>
          </div>
          <Accordion type="single" collapsible className="rounded-card border border-line bg-surface px-5">
            {FAQS.map((faq, index) => (
              <AccordionItem key={faq.q} value={`faq-${index}`}>
                <AccordionTrigger>{faq.q}</AccordionTrigger>
                <AccordionContent>{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-line bg-paper/60 py-14">
        <div className="container-page flex flex-col items-center gap-5 text-center">
          <Wordmark />
          <h2 className="max-w-xl font-display text-[24px] text-ink sm:text-[28px]">
            Open the desk. The season is already waiting.
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/signup">Get started</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/market">Browse the marketplace</Link>
            </Button>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <p className="font-mono text-[9.5px] font-medium tracking-[0.14em] text-muted uppercase">{label}</p>
      <p className="mt-2 font-mono text-[20px] text-ink tabular-nums">{value}</p>
    </div>
  );
}

function RoleCard({ icon: Icon, role, body }: { icon: typeof Sprout; role: string; body: string }) {
  return (
    <Card className="surface-hover">
      <CardContent className="p-5">
        <span className="grid size-9 place-items-center rounded-md border border-primary/15 bg-primary-xsoft text-primary">
          <Icon className="size-4.5" strokeWidth={1.7} />
        </span>
        <p className="mt-4 font-display text-[16px] text-ink">{role}</p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{body}</p>
      </CardContent>
    </Card>
  );
}
