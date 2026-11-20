import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, Page, TopBar, ugx } from "@/components/chrome";
import {
  adminStats,
  decideListing,
  decideLoan,
  listMembers,
  listQueue,
  recentActivity,
  setMemberRole,
  type ActivityEntry,
  type Role,
} from "@/lib/market.functions";
import { useDesk } from "@/lib/use-desk";

export const Route = createFileRoute("/desk/admin")({ component: AdminPage });

function AdminPage() {
  const { profile } = useDesk();
  const [stats, setStats] = useState<Awaited<ReturnType<typeof adminStats>> | null>(null);
  const [queue, setQueue] = useState<Awaited<ReturnType<typeof listQueue>> | null>(null);
  const [members, setMembers] = useState<Awaited<ReturnType<typeof listMembers>>>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [message, setMessage] = useState("");

  function load() {
    void adminStats().then(setStats).catch((err: unknown) => setMessage(err instanceof Error ? err.message : "Dashboard unavailable."));
    void recentActivity().then(setActivity).catch(() => undefined);
    if (profile?.role === "admin") {
      void listQueue().then(setQueue);
      void listMembers().then(setMembers);
    }
  }
  useEffect(() => {
    if (profile) load();
  }, [profile]);

  if (profile && profile.role !== "admin" && profile.role !== "officer") {
    return (
      <>
        <TopBar profile={profile} />
        <Page><p>Administration is for the admin and the SACCO officer.</p></Page>
      </>
    );
  }

  return (
    <>
      <TopBar profile={profile ?? undefined} />
      <Page>
        <h1 className="font-display text-4xl text-moss-deep">Administration</h1>
        <p className="mt-2 text-muted">Totals for the desk, then the queue for produce and loans.</p>
        {message ? <p className="mt-3 text-sm text-clay">{message}</p> : null}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Total listings" value={String(stats?.totalListings ?? "–")} />
          <Stat label="Pending approvals" value={String(stats?.pendingApprovals ?? "–")} hint={`${stats?.pendingListings ?? 0} listings · ${stats?.pendingLoans ?? 0} loans`} />
          <Stat label="Live on the market" value={String(stats?.liveListings ?? "–")} />
          <Stat label="SACCO balances" value={ugx(stats?.totalSavings ?? 0)} hint={`Loans out ${ugx(stats?.activeLoans ?? 0)} · liquidity ${ugx(stats?.liquidity ?? 0)}`} />
        </div>

        {profile?.role === "admin" ? (
          <>
            <h2 className="mt-10 font-display text-2xl">Produce waiting</h2>
            <ul className="mt-3 space-y-3">
              {(queue?.listings ?? []).map((listing) => (
                <li key={listing.id}>
                  <Card>
                    <h3 className="font-display text-2xl">{listing.crop}</h3>
                    <p className="text-sm">{listing.farmerName} · {listing.quantity} {listing.unit} · {ugx(listing.unitPriceUgx)} · {listing.district}</p>
                    <p className="text-sm text-muted">{listing.description}</p>
                    <input className="mt-3 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm" placeholder="Rejection note, if you reject" value={notes[`l${listing.id}`] ?? ""} onChange={(e) => setNotes({ ...notes, [`l${listing.id}`]: e.target.value })} />
                    <div className="mt-3 flex gap-2">
                      <button type="button" className="rounded-full bg-moss px-4 py-2 text-sm font-semibold text-surface" onClick={() => void decideListing({ data: { id: listing.id, decision: "live" } }).then(load)}>Approve</button>
                      <button type="button" className="rounded-full bg-clay px-4 py-2 text-sm font-semibold text-surface" onClick={() => void decideListing({ data: { id: listing.id, decision: "rejected", note: notes[`l${listing.id}`] } }).then(load)}>Reject</button>
                    </div>
                  </Card>
                </li>
              ))}
              {queue && queue.listings.length === 0 ? <p className="text-sm text-muted">No produce waiting.</p> : null}
            </ul>
            <h2 className="mt-10 font-display text-2xl">Loans waiting</h2>
            <ul className="mt-3 space-y-3">
              {(queue?.loans ?? []).map((loan) => (
                <li key={loan.id}>
                  <Card>
                    <h3 className="font-display text-2xl">{ugx(loan.amountUgx)}</h3>
                    <p className="text-sm">{loan.memberName} · {loan.termMonths} months</p>
                    <p className="text-sm text-muted">{loan.purpose}</p>
                    <input className="mt-3 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm" placeholder="Rejection note, if you reject" value={notes[`n${loan.id}`] ?? ""} onChange={(e) => setNotes({ ...notes, [`n${loan.id}`]: e.target.value })} />
                    <div className="mt-3 flex gap-2">
                      <button type="button" className="rounded-full bg-moss px-4 py-2 text-sm font-semibold text-surface" onClick={() => void decideLoan({ data: { id: loan.id, decision: "approved" } }).then(load)}>Approve</button>
                      <button type="button" className="rounded-full bg-clay px-4 py-2 text-sm font-semibold text-surface" onClick={() => void decideLoan({ data: { id: loan.id, decision: "rejected", note: notes[`n${loan.id}`] } }).then(load)}>Reject</button>
                    </div>
                  </Card>
                </li>
              ))}
              {queue && queue.loans.length === 0 ? <p className="text-sm text-muted">No loans waiting.</p> : null}
            </ul>
            <h2 className="mt-10 font-display text-2xl">Members</h2>
            <ul className="mt-3 divide-y divide-line rounded-card border border-line bg-surface">
              {members.map((member) => (
                <li key={member.userId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span>{member.fullName}<span className="text-muted"> · {member.district}</span></span>
                  <select
                    className="rounded-xl border border-line bg-paper px-3 py-2"
                    value={member.role}
                    onChange={(event) => {
                      void setMemberRole({ data: { userId: member.userId, role: event.target.value as Role } })
                        .then(load)
                        .catch((err: unknown) => setMessage(err instanceof Error ? err.message : "Could not change role."));
                    }}
                  >
                    <option value="farmer">farmer</option>
                    <option value="buyer">buyer</option>
                    <option value="officer">officer</option>
                    <option value="admin">admin</option>
                  </select>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-6 text-sm">The approval buttons are on the admin account. Sign in as jmuziransa@gmail.com.</p>
        )}

        <h2 className="mt-10 font-display text-2xl">Recent activity</h2>
        <p className="mt-1 text-sm text-muted">Every approval, rejection, disbursement and role change, newest first.</p>
        <ul className="mt-3 divide-y divide-line rounded-card border border-line bg-surface">
          {activity.map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 text-sm">
              <span>
                <span className="font-semibold">{ACTIVITY_LABELS[entry.action] ?? entry.action}</span>
                <span className="text-muted"> · {entry.detail}</span>
              </span>
              <span className="text-muted">{entry.actorName} · {entry.createdAt.slice(0, 16).replace("T", " ")}</span>
            </li>
          ))}
          {!activity.length ? <li className="px-4 py-6 text-center text-muted">No recorded activity yet.</li> : null}
        </ul>
      </Page>
    </>
  );
}

const ACTIVITY_LABELS: Record<string, string> = {
  "listing.approved": "Approved produce",
  "listing.rejected": "Rejected produce",
  "loan.approved": "Approved loan",
  "loan.rejected": "Rejected loan",
  "loan.disbursed": "Disbursed loan",
  "member.role_changed": "Changed a member's role",
};

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <p className="text-xs font-semibold uppercase text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </Card>
  );
}
