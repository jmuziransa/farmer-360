import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, Field, inputClass, Page, Primary, TopBar, ugx } from "@/components/chrome";
import { applyLoan, myLoans, repayLoan } from "@/lib/market.functions";
import { useDesk } from "@/lib/use-desk";

export const Route = createFileRoute("/desk/loans")({ component: LoansPage });

function LoansPage() {
  const { profile } = useDesk();
  const [rows, setRows] = useState<Awaited<ReturnType<typeof myLoans>>>([]);
  const [amount, setAmount] = useState("200000");
  const [purpose, setPurpose] = useState("");
  const [term, setTerm] = useState("6");
  const [message, setMessage] = useState("");

  function load() {
    void myLoans().then(setRows).catch((err: unknown) => setMessage(err instanceof Error ? err.message : "Could not load loans."));
  }
  useEffect(() => {
    if (profile) load();
  }, [profile]);

  return (
    <>
      <TopBar profile={profile ?? undefined} />
      <Page>
        <h1 className="font-display text-4xl text-moss-deep">Loans</h1>
        <p className="mt-2 max-w-2xl text-muted">Applications wait for an administrator. After approval, an officer or the member can record repayments. The plan splits the amount into equal months. It is a desk record, not a bank offer.</p>
        {profile && profile.role !== "admin" ? (
          <Card className="mt-6">
            <form
              className="grid gap-3 md:grid-cols-3"
              onSubmit={(event) => {
                event.preventDefault();
                void applyLoan({ data: { amountUgx: Number(amount), purpose, termMonths: Number(term) } })
                  .then(() => {
                    setMessage("Application sent. It is pending in Administration.");
                    setPurpose("");
                    load();
                  })
                  .catch((err: unknown) => setMessage(err instanceof Error ? err.message : "Could not apply."));
              }}
            >
              <Field label="Amount (UGX)"><input className={inputClass} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
              <Field label="Term (months)"><input className={inputClass} value={term} onChange={(e) => setTerm(e.target.value)} /></Field>
              <Field label="Purpose"><input className={inputClass} value={purpose} onChange={(e) => setPurpose(e.target.value)} /></Field>
              <div className="md:col-span-3"><Primary type="submit">Apply</Primary></div>
            </form>
          </Card>
        ) : null}
        {message ? <p className="mt-3 text-sm font-semibold">{message}</p> : null}
        <ul className="mt-6 space-y-3">
          {rows.map((loan) => {
            const owed = Math.max(loan.amountUgx - loan.paid, 0);
            const monthly = Math.ceil(loan.amountUgx / loan.termMonths);
            return (
              <li key={loan.id}>
                <Card>
                  <div className="flex flex-wrap justify-between gap-2">
                    <h2 className="font-display text-2xl">{ugx(loan.amountUgx)}</h2>
                    <span className="text-xs font-semibold uppercase text-moss">{loan.status}</span>
                  </div>
                  <p className="text-sm">{loan.purpose}</p>
                  <p className="text-sm text-muted">{loan.memberName} · {loan.termMonths} months · paid {ugx(loan.paid)} · still {ugx(owed)}</p>
                  {loan.rejectionNote ? <p className="text-sm text-clay">{loan.rejectionNote}</p> : null}
                  {(loan.status === "approved" || loan.status === "active") && (
                    <div className="mt-3">
                      <p className="text-sm font-semibold">Plan: about {ugx(monthly)} each month for {loan.termMonths} months.</p>
                      <form
                        className="mt-2 flex gap-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          const input = (event.currentTarget.elements.namedItem("pay") as HTMLInputElement).value;
                          void repayLoan({ data: { id: loan.id, amountUgx: Number(input) } })
                            .then(() => load())
                            .catch((err: unknown) => setMessage(err instanceof Error ? err.message : "Could not record payment."));
                        }}
                      >
                        <input name="pay" className={inputClass} placeholder="Repayment in UGX" />
                        <Primary type="submit">Record</Primary>
                      </form>
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      </Page>
    </>
  );
}
