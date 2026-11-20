import { createFileRoute } from "@tanstack/react-router";
import { Landmark, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useDeskSession } from "@/components/desk-shell";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  Input,
  PageHeader,
  Select,
  Skeleton,
  StatCard,
  Table,
  TD,
  TH,
} from "@/components/ui";
import { disburseLoan, listMembers, myLoans, mySavings, recordSavings } from "@/lib/market.functions";
import { formatDate, statusMeta, ugx } from "@/lib/utils";

export const Route = createFileRoute("/desk/sacco")({ component: SaccoPage });

function SaccoPage() {
  const { profile } = useDeskSession();
  const [book, setBook] = useState<Awaited<ReturnType<typeof mySavings>> | null>(null);
  const [members, setMembers] = useState<Awaited<ReturnType<typeof listMembers>>>([]);
  const [loans, setLoans] = useState<Awaited<ReturnType<typeof myLoans>>>([]);
  const [memberId, setMemberId] = useState("");
  const [kind, setKind] = useState<"deposit" | "withdrawal">("deposit");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const officer = profile.role === "officer" || profile.role === "admin";

  function load() {
    void mySavings().then(setBook).catch(() => undefined);
    void myLoans().then(setLoans).catch(() => undefined);
    if (officer) {
      void listMembers().then((rows) => {
        setMembers(rows);
        setMemberId((current) => current || rows[0]?.userId || "");
      }).catch(() => undefined);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [officer]);

  const approved = loans.filter((loan) => loan.status === "approved");
  const deposits = (book?.entries ?? []).filter((e) => e.memberId === profile.userId && e.kind === "deposit").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Money"
        title="SACCO book"
        description="Your savings balance is deposits minus withdrawals. Officers record movements; loans move to active only after an administrator approves them."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Your savings"
          value={book ? ugx(book.balance) : "—"}
          hint="Deposits minus withdrawals"
          icon={Landmark}
          tone="rust"
        />
        <StatCard label="Entries on your book" value={String(deposits)} hint="Deposit lines recorded" icon={TrendingUp} tone="olive" />
        <StatCard
          label={officer ? "Ledger lines (recent)" : "Approved, awaiting disbursement"}
          value={officer ? String(book?.entries.length ?? 0) : String(approved.length)}
          hint={officer ? "Newest 80 movements" : "An officer releases these"}
          icon={TrendingDown}
          tone="amber"
        />
        <StatCard
          label="Loans disbursing"
          value={String(loans.filter((l) => l.status === "active").length)}
          hint="Approved and repaying"
          icon={Landmark}
          tone="blue"
        />
      </div>

      {officer ? (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Record a movement</CardTitle>
              <p className="mt-1 text-[12.5px] text-muted">Post a deposit or withdrawal to a member's book.</p>
            </div>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                setBusy(true);
                void recordSavings({ data: { memberId, kind, amountUgx: Number(amount), note } })
                  .then(() => {
                    toast.success("Saved to the ledger.");
                    setAmount("");
                    setNote("");
                    load();
                  })
                  .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Could not save."))
                  .finally(() => setBusy(false));
              }}
            >
              <Field label="Member" htmlFor="sacco-member">
                <Select id="sacco-member" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
                  {members.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.fullName} · {member.role}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Kind" htmlFor="sacco-kind">
                <Select id="sacco-kind" value={kind} onChange={(e) => setKind(e.target.value as "deposit" | "withdrawal")}>
                  <option value="deposit">Deposit</option>
                  <option value="withdrawal">Withdrawal</option>
                </Select>
              </Field>
              <Field label="Amount (UGX)" htmlFor="sacco-amount">
                <Input id="sacco-amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </Field>
              <Field label="Note" htmlFor="sacco-note">
                <Input id="sacco-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Maize sale proceeds" />
              </Field>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={busy}>
                  {busy ? "Posting…" : "Post to ledger"}
                </Button>
              </div>
            </form>

            {approved.length > 0 ? (
              <div className="mt-6 rounded-md border border-amber/20 bg-amber-soft p-4">
                <p className="font-mono text-[9.5px] font-medium tracking-[0.14em] text-amber uppercase">
                  Approved, not yet active
                </p>
                <ul className="mt-2.5 space-y-2">
                  {approved.map((loan) => (
                    <li key={loan.id} className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
                      <span className="text-ink">
                        {loan.memberName} · <span className="font-mono tabular-nums">{ugx(loan.amountUgx)}</span>
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          void disburseLoan({ data: { id: loan.id } })
                            .then(() => {
                              toast.success("Loan disbursed — it is now active.");
                              load();
                            })
                            .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Could not disburse."));
                        }}
                      >
                        Disburse
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <div>
            <CardTitle>The ledger</CardTitle>
            <p className="mt-1 text-[12.5px] text-muted">
              {officer ? "Every member's movements, newest first." : "Your savings history, newest first."}
            </p>
          </div>
        </CardHeader>
        {!book ? (
          <CardContent className="space-y-2 pt-1">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </CardContent>
        ) : book.entries.length === 0 ? (
          <p className="px-5 py-10 text-center text-[12.5px] text-muted">No savings recorded yet.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <TH>Member</TH>
                <TH>Kind</TH>
                <TH>Note</TH>
                <TH className="text-right">Amount</TH>
                <TH className="text-right">Date</TH>
              </tr>
            </thead>
            <tbody>
              {book.entries.map((entry) => {
                const meta = statusMeta(entry.kind);
                return (
                  <tr key={entry.id}>
                    <TD className="text-[12.5px] font-semibold text-ink">{entry.memberName}</TD>
                    <TD>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </TD>
                    <TD className="max-w-[260px] text-[12px] text-muted">{entry.note ?? "—"}</TD>
                    <TD
                      className={`text-right font-mono text-[12.5px] tabular-nums ${
                        entry.kind === "deposit" ? "text-olive" : "text-danger"
                      }`}
                    >
                      {entry.kind === "deposit" ? "+" : "−"} {ugx(entry.amountUgx)}
                    </TD>
                    <TD className="text-right font-mono text-[11px] text-muted">{formatDate(entry.createdAt, true)}</TD>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
