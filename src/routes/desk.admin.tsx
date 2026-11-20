import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCheck, HandCoins, Sprout, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useDeskSession } from "@/components/desk-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/overlays";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  PageHeader,
  Select,
  Skeleton,
  StatCard,
  Table,
  TD,
  TH,
} from "@/components/ui";
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
import { formatDate, ugx } from "@/lib/utils";

export const Route = createFileRoute("/desk/admin")({ component: AdminPage });

function AdminPage() {
  const { profile } = useDeskSession();
  const [stats, setStats] = useState<Awaited<ReturnType<typeof adminStats>> | null>(null);
  const [queue, setQueue] = useState<Awaited<ReturnType<typeof listQueue>> | null>(null);
  const [members, setMembers] = useState<Awaited<ReturnType<typeof listMembers>>>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [activity, setActivity] = useState<ActivityEntry[]>([]);

  const isAdmin = profile.role === "admin";
  const isOfficer = profile.role === "officer";

  function load() {
    void adminStats().then(setStats).catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Dashboard unavailable."));
    void recentActivity().then(setActivity).catch(() => undefined);
    if (isAdmin) {
      void listQueue().then(setQueue).catch(() => undefined);
      void listMembers().then(setMembers).catch(() => undefined);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  if (!isAdmin && !isOfficer) {
    return (
      <Card>
        <EmptyState
          icon={Users}
          title="Administration is staff-only"
          body="The approval queue and member roles belong to the administrator and the SACCO officer."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Approvals & members"
        description="Totals for the desk, the queue for produce and loans, and the member register."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total listings"
          value={stats ? String(stats.totalListings) : "—"}
          hint={stats ? `${stats.liveListings} live on the market` : undefined}
          icon={Sprout}
          tone="olive"
        />
        <StatCard
          label="Pending approvals"
          value={stats ? String(stats.pendingApprovals) : "—"}
          hint={stats ? `${stats.pendingListings} listings · ${stats.pendingLoans} loans` : undefined}
          icon={ClipboardCheck}
          tone="amber"
        />
        <StatCard
          label="SACCO balances"
          value={stats ? ugxCompactSafe(stats.totalSavings) : "—"}
          hint={stats ? `Loans out ${ugxCompactSafe(stats.activeLoans)}` : undefined}
          icon={HandCoins}
          tone="rust"
        />
        <StatCard
          label="Members"
          value={stats ? String(stats.members) : "—"}
          hint={stats ? `${stats.orders} orders all-time` : undefined}
          icon={Users}
          tone="blue"
        />
      </div>

      {isAdmin ? (
        <Tabs defaultValue="queue">
          <TabsList>
            <TabsTrigger value="queue">
              Queue
              {queue && queue.listings.length + queue.loans.length > 0 ? (
                <span className="ml-1 font-mono text-[10px] text-amber">{queue.listings.length + queue.loans.length}</span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="queue">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Produce waiting</CardTitle>
                    <p className="mt-1 text-[12.5px] text-muted">Approve to publish, or return it with a note.</p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-1">
                  {!queue ? (
                    <div className="space-y-2">
                      {[0, 1].map((i) => (
                        <Skeleton key={i} className="h-24" />
                      ))}
                    </div>
                  ) : queue.listings.length === 0 ? (
                    <EmptyState icon={Sprout} title="No produce waiting" body="The queue is clear." />
                  ) : (
                    queue.listings.map((listing) => (
                      <div key={listing.id} className="rounded-md border border-line bg-paper/50 p-4">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="text-[13.5px] font-semibold text-ink">{listing.crop}</p>
                          <span className="font-mono text-[11px] text-muted tabular-nums">
                            {listing.quantity} {listing.unit} · {ugx(listing.unitPriceUgx)} each · {listing.district}
                          </span>
                        </div>
                        <p className="mt-1 text-[12px] text-muted">
                          {listing.farmerName}
                          {listing.harvestDate ? ` · harvested ${formatDate(listing.harvestDate, true)}` : ""}
                          {listing.qualityGrade ? ` · ${listing.qualityGrade}` : ""}
                        </p>
                        {listing.description ? (
                          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink/80">{listing.description}</p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Input
                            className="h-9 max-w-xs flex-1 text-[12.5px]"
                            placeholder="Rejection note, if you return it"
                            value={notes[`l${listing.id}`] ?? ""}
                            onChange={(e) => setNotes({ ...notes, [`l${listing.id}`]: e.target.value })}
                          />
                          <Button
                            size="sm"
                            onClick={() => {
                              void decideListing({ data: { id: listing.id, decision: "live" } })
                                .then(() => {
                                  toast.success(`${listing.crop} approved and live.`);
                                  load();
                                })
                                .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Could not approve."));
                            }}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              void decideListing({ data: { id: listing.id, decision: "rejected", note: notes[`l${listing.id}`] } })
                                .then(() => {
                                  toast.success("Returned to the farmer with your note.");
                                  load();
                                })
                                .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Could not reject."));
                            }}
                          >
                            Return
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Loans waiting</CardTitle>
                    <p className="mt-1 text-[12.5px] text-muted">Approval moves the loan to the SACCO for disbursement.</p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-1">
                  {!queue ? (
                    <div className="space-y-2">
                      {[0].map((i) => (
                        <Skeleton key={i} className="h-24" />
                      ))}
                    </div>
                  ) : queue.loans.length === 0 ? (
                    <EmptyState icon={HandCoins} title="No loans waiting" body="Every application has a decision." />
                  ) : (
                    queue.loans.map((loan) => (
                      <div key={loan.id} className="rounded-md border border-line bg-paper/50 p-4">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="font-mono text-[13.5px] font-medium text-ink tabular-nums">{ugx(loan.amountUgx)}</p>
                          <span className="font-mono text-[11px] text-muted">
                            {loan.memberName} · {loan.termMonths} months
                          </span>
                        </div>
                        <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink/80">{loan.purpose}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Input
                            className="h-9 max-w-xs flex-1 text-[12.5px]"
                            placeholder="Rejection note, if you decline"
                            value={notes[`n${loan.id}`] ?? ""}
                            onChange={(e) => setNotes({ ...notes, [`n${loan.id}`]: e.target.value })}
                          />
                          <Button
                            size="sm"
                            onClick={() => {
                              void decideLoan({ data: { id: loan.id, decision: "approved" } })
                                .then(() => {
                                  toast.success("Loan approved. The SACCO can disburse it.");
                                  load();
                                })
                                .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Could not approve."));
                            }}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              void decideLoan({ data: { id: loan.id, decision: "rejected", note: notes[`n${loan.id}`] } })
                                .then(() => {
                                  toast.success("Loan declined with your note.");
                                  load();
                                })
                                .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Could not decline."));
                            }}
                          >
                            Decline
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="members">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Member register</CardTitle>
                  <p className="mt-1 text-[12.5px] text-muted">Change a member's role from the dropdown.</p>
                </div>
              </CardHeader>
              <Table>
                <thead>
                  <tr>
                    <TH>Member</TH>
                    <TH>District</TH>
                    <TH>Phone</TH>
                    <TH className="text-right">Role</TH>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.userId}>
                      <TD className="text-[12.5px] font-semibold text-ink">{member.fullName}</TD>
                      <TD className="text-[12px] text-muted">{member.district ?? "—"}</TD>
                      <TD className="font-mono text-[11.5px] text-muted">{member.phone ?? "—"}</TD>
                      <TD className="text-right">
                        <Select
                          className="h-8 w-32 text-[12px]"
                          value={member.role}
                          onChange={(event) => {
                            void setMemberRole({ data: { userId: member.userId, role: event.target.value as Role } })
                              .then(() => {
                                toast.success("Role updated.");
                                load();
                              })
                              .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Could not change role."));
                          }}
                        >
                          <option value="farmer">farmer</option>
                          <option value="buyer">buyer</option>
                          <option value="officer">officer</option>
                          <option value="admin">admin</option>
                        </Select>
                      </TD>
                    </tr>
                  ))}
                  {members.length === 0 ? (
                    <tr>
                      <TD colSpan={4}>
                        <p className="py-8 text-center text-[12.5px] text-muted">No members yet.</p>
                      </TD>
                    </tr>
                  ) : null}
                </tbody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <ActivityTable activity={activity} />
          </TabsContent>
        </Tabs>
      ) : (
        <ActivityTable activity={activity} />
      )}
    </div>
  );
}

function ActivityTable({ activity }: { activity: ActivityEntry[] }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Recent activity</CardTitle>
          <p className="mt-1 text-[12.5px] text-muted">
            Every approval, rejection, disbursement and role change, newest first.
          </p>
        </div>
      </CardHeader>
      <Table>
        <thead>
          <tr>
            <TH>Action</TH>
            <TH>Detail</TH>
            <TH className="text-right">When</TH>
          </tr>
        </thead>
        <tbody>
          {activity.map((entry) => (
            <tr key={entry.id}>
              <TD>
                <Badge tone={entry.action.includes("rejected") ? "danger" : entry.action.includes("approved") ? "olive" : "blue"}>
                  {ACTIVITY_LABELS[entry.action] ?? entry.action}
                </Badge>
              </TD>
              <TD className="max-w-[320px]">
                <p className="text-[12.5px] text-ink">{entry.detail}</p>
                <p className="mt-0.5 font-mono text-[10px] text-muted">by {entry.actorName}</p>
              </TD>
              <TD className="text-right font-mono text-[11px] text-muted">
                {entry.createdAt.slice(0, 16).replace("T", " ")}
              </TD>
            </tr>
          ))}
          {activity.length === 0 ? (
            <tr>
              <TD colSpan={3}>
                <p className="py-8 text-center text-[12.5px] text-muted">No recorded activity yet.</p>
              </TD>
            </tr>
          ) : null}
        </tbody>
      </Table>
    </Card>
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

function ugxCompactSafe(value: number): string {
  return ugx(value);
}
