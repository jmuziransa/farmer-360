import { createFileRoute } from "@tanstack/react-router";
import { HandCoins } from "lucide-react";
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
  EmptyState,
  Field,
  Input,
  PageHeader,
  Progress,
  Select,
  Skeleton,
  Table,
  TD,
  TH,
} from "@/components/ui";
import { applyLoan, myLoans, repayLoan } from "@/lib/market.functions";
import { formatDate, statusMeta, ugx } from "@/lib/utils";

export const Route = createFileRoute("/desk/loans")({ component: LoansPage });

function LoansPage() {
  const { profile } = useDeskSession();
  const [rows, setRows] = useState<Awaited<ReturnType<typeof myLoans>> | null>(null);
  const [amount, setAmount] = useState("200000");
  const [purpose, setPurpose] = useState("");
  const [term, setTerm] = useState("6");
  const [busy, setBusy] = useState(false);

  function load() {
    void myLoans()
      .then(setRows)
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Could not load loans."));
  }
  useEffect(() => {
    load();
  }, []);

  const monthly = Math.ceil(Number(amount || 0) / Math.max(1, Number(term || 1)));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Money"
        title="Loans"
        description="Applications wait for an administrator. After approval, an officer or the member records repayments. The plan splits the amount into equal months — it is a desk record, not a bank offer."
      />

      {profile.role !== "admin" ? (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Apply for a loan</CardTitle>
              <p className="mt-1 text-[12.5px] text-muted">
                Minimum UGX 50,000 · 1 to 24 months.
              </p>
            </div>
            <span className="grid size-8 shrink-0 place-items-center rounded-md border border-primary/15 bg-primary-xsoft text-primary">
              <HandCoins className="size-4" strokeWidth={1.7} />
            </span>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 sm:grid-cols-3"
              onSubmit={(event) => {
                event.preventDefault();
                setBusy(true);
                void applyLoan({ data: { amountUgx: Number(amount), purpose, termMonths: Number(term) } })
                  .then(() => {
                    toast.success("Application sent. It is pending in Administration.");
                    setPurpose("");
                    load();
                  })
                  .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Could not apply."))
                  .finally(() => setBusy(false));
              }}
            >
              <Field label="Amount (UGX)" htmlFor="loan-amount">
                <Input id="loan-amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </Field>
              <Field label="Term" htmlFor="loan-term">
                <Select id="loan-term" value={term} onChange={(e) => setTerm(e.target.value)}>
                  {Array.from({ length: 24 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {m} {m === 1 ? "month" : "months"}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Purpose" htmlFor="loan-purpose">
                <Input id="loan-purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} required placeholder="Drying racks before the rains" />
              </Field>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 sm:col-span-3">
                <p className="text-[12.5px] text-muted">
                  Repayment preview{" "}
                  <span className="ml-1 font-mono text-[13px] font-medium text-ink tabular-nums">
                    about {ugx(monthly)} each month
                  </span>
                </p>
                <Button type="submit" disabled={busy}>
                  {busy ? "Sending…" : "Apply"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <div>
            <CardTitle>The loan book</CardTitle>
            <p className="mt-1 text-[12.5px] text-muted">
              {profile.role === "admin" || profile.role === "officer" ? "Every member's loans." : "Your loans and where they stand."}
            </p>
          </div>
        </CardHeader>
        {!rows ? (
          <CardContent className="space-y-2 pt-1">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </CardContent>
        ) : rows.length === 0 ? (
          <EmptyState icon={HandCoins} title="No loans yet" body="Applications appear here with their status, balance and repayment plan." />
        ) : (
          <Table>
            <thead>
              <tr>
                <TH>Loan</TH>
                <TH>Purpose</TH>
                <TH>Repaid</TH>
                <TH>Status</TH>
                <TH className="text-right">Repayment</TH>
              </tr>
            </thead>
            <tbody>
              {rows.map((loan) => {
                const meta = statusMeta(loan.status);
                const owed = Math.max(loan.amountUgx - loan.paid, 0);
                const pct = loan.amountUgx > 0 ? Math.min(100, Math.round((loan.paid / loan.amountUgx) * 100)) : 0;
                const open = loan.status === "approved" || loan.status === "active";
                return (
                  <tr key={loan.id}>
                    <TD>
                      <p className="font-mono text-[13.5px] font-medium text-ink tabular-nums">{ugx(loan.amountUgx)}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-muted">
                        {loan.memberName} · {loan.termMonths} months · {formatDate(loan.createdAt, true)}
                      </p>
                      {open ? (
                        <div className="mt-1.5 w-36">
                          <Progress value={pct} tone={loan.mine ? "primary" : "ink"} />
                          <p className="mt-1 font-mono text-[9px] text-muted-soft">{pct}% repaid</p>
                        </div>
                      ) : null}
                    </TD>
                    <TD className="max-w-[220px]">
                      <p className="text-[12.5px] leading-snug text-ink">{loan.purpose}</p>
                      {loan.rejectionNote ? (
                        <p className="mt-0.5 text-[11px] leading-snug text-danger">{loan.rejectionNote}</p>
                      ) : null}
                    </TD>
                    <TD>
                      <p className="font-mono text-[12px] text-ink tabular-nums">{ugx(loan.paid)}</p>
                      <p className="font-mono text-[10px] text-muted">{ugx(owed)} left</p>
                    </TD>
                    <TD>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </TD>
                    <TD className="text-right">
                      {open ? (
                        <form
                          className="flex justify-end gap-1.5"
                          onSubmit={(event) => {
                            event.preventDefault();
                            const input = (event.currentTarget.elements.namedItem("pay") as HTMLInputElement).value;
                            void repayLoan({ data: { id: loan.id, amountUgx: Number(input) } })
                              .then(() => {
                                toast.success("Repayment recorded.");
                                load();
                              })
                              .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Could not record payment."));
                          }}
                        >
                          <Input name="pay" className="h-8 w-28 text-[12px]" placeholder="UGX" inputMode="numeric" required />
                          <Button type="submit" size="sm" variant="outline">
                            Record
                          </Button>
                        </form>
                      ) : (
                        <span className="font-mono text-[10px] tracking-[0.08em] text-muted-soft uppercase">Closed</span>
                      )}
                    </TD>
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
