import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Page, TopBar, ugx } from "@/components/chrome";
import { publicDemoFarm, type DemoFarmSnapshot } from "@/lib/farm.functions";
import { displayDate, moduleLabels } from "@/lib/farm-entry-rules";
import { seedDesk } from "@/lib/market.functions";

export const Route = createFileRoute("/")({ component: Home });

const ACCOUNTS = [
  ["Admin", "jmuziransa@gmail.com", "Akatale#2026", "Approvals, dashboard, roles, password"],
  ["Farmer", "farmer.demo@akatale.ug", "Harvest#2026", "List maize, matooke, coffee; one pending loan"],
  ["Buyer", "buyer.demo@akatale.ug", "Market#2026", "Browse live produce and request an order"],
  ["SACCO officer", "officer.demo@akatale.ug", "Sacco#2026", "Savings ledger, disburse and record repayments"],
];

function Home() {
  const [demo, setDemo] = useState<DemoFarmSnapshot | null>(null);

  useEffect(() => {
    // Seed first, then read the public demo snapshot — a fresh deployment has
    // no farm data until the seed claims its gate row.
    void seedDesk()
      .catch(() => undefined)
      .then(() => publicDemoFarm())
      .then((snapshot) => setDemo(snapshot))
      .catch(() => undefined);
  }, []);

  return (
    <>
      <TopBar />
      <Page>
        <p className="text-sm font-semibold uppercase tracking-wide text-moss">How this desk works</p>
        <h1 className="mt-2 max-w-3xl font-display text-4xl text-moss-deep md:text-5xl">
          A recorded place for your farm, produce, orders, and the SACCO.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          Akatale Farm360 keeps your farm records — crops, livestock, produce, money and the store ledger — side by side with a community market and a savings cooperative. Farmers submit produce. An administrator approves it before it appears live. Members can also apply for a SACCO loan, and an officer keeps the savings book.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/signup" className="rounded-full bg-moss px-5 py-3 text-sm font-semibold text-surface">Create an account</Link>
          <Link to="/market" className="rounded-full border border-line bg-surface px-5 py-3 text-sm font-semibold">Open the marketplace</Link>
        </div>

        <section className="mt-12 grid gap-4 md:grid-cols-2">
          <article className="rounded-card border border-line bg-surface p-5">
            <h2 className="font-display text-2xl">A produce listing</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
              <li>A farmer signs in and submits crop, quantity, unit price in UGX, district, and notes.</li>
              <li>The listing stays pending. It is not public yet.</li>
              <li>Administration opens the queue and chooses Approve or Reject. A rejection can carry a note.</li>
              <li>Approved produce appears on the marketplace. Buyers filter it and place a request.</li>
            </ol>
          </article>
          <article className="rounded-card border border-line bg-surface p-5">
            <h2 className="font-display text-2xl">A SACCO loan</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
              <li>A member applies with an amount, a purpose, and a term.</li>
              <li>Administration approves or rejects it from the same queue.</li>
              <li>A SACCO officer disburses an approved loan and records repayments.</li>
              <li>The member sees status, what is still owed, and a simple monthly plan.</li>
            </ol>
          </article>
        </section>

        {demo ? (
          <section className="mt-8 rounded-card border border-line bg-surface p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-2xl">From the demo farm: {demo.name}</h2>
              <p className="text-sm text-muted">{demo.district}{demo.village ? ` · ${demo.village}` : ""} · {demo.sizeAcres} acres</p>
            </div>
            <p className="mt-1 text-sm text-muted">
              Records seeded in this deployment, shown exactly as the farmer sees them. Sign in as the farmer to edit them.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <DemoStat label="Growing crops" value={String(demo.cropCount)} />
              <DemoStat label="Head of animals" value={String(demo.animalCount)} />
              <DemoStat label="Recorded income" value={ugx(demo.financeIncome)} />
              <DemoStat label="Recorded spending" value={ugx(demo.financeExpense)} />
            </div>
            <ul className="mt-4 divide-y divide-line rounded-card border border-line">
              {demo.records.map((r) => (
                <li key={`${r.module}-${r.name}-${r.recordDate}`} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 text-sm">
                  <span>
                    <span className="font-semibold">{r.name}</span>
                    <span className="text-muted"> · {moduleLabels[r.module as keyof typeof moduleLabels] ?? r.module}</span>
                  </span>
                  <span className="text-muted">{r.status} · {r.quantity} {r.unit} · {displayDate(r.recordDate)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">
              Totals come from the farm's finance records; individual sale amounts and personal details stay private to the account.
            </p>
          </section>
        ) : null}

        <section className="mt-8 rounded-card border border-line bg-surface p-5">
          <h2 className="font-display text-2xl">Roles</h2>
          <ul className="mt-3 grid gap-3 text-sm md:grid-cols-2">
            <li><strong>Farmer.</strong> Lists produce, follows status, applies for loans, sees savings.</li>
            <li><strong>Buyer.</strong> Browses approved produce, requests an order, tracks it.</li>
            <li><strong>SACCO officer.</strong> Records deposits and withdrawals, disburses loans, posts repayments.</li>
            <li><strong>Admin.</strong> Approval queue, dashboard totals, member roles, and their own password.</li>
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="font-display text-2xl">Ready accounts</h2>
          <p className="mt-1 text-sm text-muted">These are created the first time this page loads. Sign in, then change the admin password under Account.</p>
          <div className="mt-4 overflow-x-auto rounded-card border border-line bg-surface">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Password</th>
                  <th className="px-4 py-3">What to try</th>
                </tr>
              </thead>
              <tbody>
                {ACCOUNTS.map((row) => (
                  <tr key={row[1]} className="border-b border-line last:border-0">
                    {row.map((cell) => (
                      <td key={cell} className="px-4 py-3">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </Page>
    </>
  );
}

function DemoStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-line bg-paper p-4">
      <p className="text-xs font-semibold uppercase text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl">{value}</p>
    </div>
  );
}
