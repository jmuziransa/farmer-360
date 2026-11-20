import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, Field, inputClass, Page, Primary, TopBar, ugx } from "@/components/chrome";
import { disburseLoan, listMembers, myLoans, mySavings, recordSavings } from "@/lib/market.functions";
import { useDesk } from "@/lib/use-desk";

export const Route = createFileRoute("/desk/sacco")({ component: SaccoPage });

function SaccoPage() {
  const { profile } = useDesk();
  const [book, setBook] = useState<Awaited<ReturnType<typeof mySavings>> | null>(null);
  const [members, setMembers] = useState<Awaited<ReturnType<typeof listMembers>>>([]);
  const [loans, setLoans] = useState<Awaited<ReturnType<typeof myLoans>>>([]);
  const [memberId, setMemberId] = useState("");
  const [kind, setKind] = useState<"deposit" | "withdrawal">("deposit");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");

  function load() {
    void mySavings().then(setBook);
    void myLoans().then(setLoans);
    if (profile?.role === "officer" || profile?.role === "admin") {
      void listMembers().then((rows) => {
        setMembers(rows);
        setMemberId((current) => current || rows[0]?.userId || "");
      });
    }
  }
  useEffect(() => {
    if (profile) load();
  }, [profile]);

  const officer = profile?.role === "officer" || profile?.role === "admin";

  return (
    <>
      <TopBar profile={profile ?? undefined} />
      <Page>
        <h1 className="font-display text-4xl text-moss-deep">SACCO book</h1>
        <p className="mt-2 text-muted">Your savings balance is deposits minus withdrawals. Officers record movements. Loans move to active only after an administrator approves them.</p>
        <Card className="mt-6">
          <p className="text-sm text-muted">Your savings</p>
          <p className="font-display text-4xl">{ugx(book?.balance ?? 0)}</p>
        </Card>
        {officer ? (
          <Card className="mt-4">
            <h2 className="font-display text-2xl">Record a movement</h2>
            <form
              className="mt-3 grid gap-3 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                void recordSavings({ data: { memberId, kind, amountUgx: Number(amount), note } })
                  .then(() => {
                    setMessage("Saved to the ledger.");
                    setAmount("");
                    setNote("");
                    load();
                  })
                  .catch((err: unknown) => setMessage(err instanceof Error ? err.message : "Could not save."));
              }}
            >
              <Field label="Member">
                <select className={inputClass} value={memberId} onChange={(e) => setMemberId(e.target.value)}>
                  {members.map((member) => (
                    <option key={member.userId} value={member.userId}>{member.fullName} · {member.role}</option>
                  ))}
                </select>
              </Field>
              <Field label="Kind">
                <select className={inputClass} value={kind} onChange={(e) => setKind(e.target.value as "deposit" | "withdrawal")}>
                  <option value="deposit">Deposit</option>
                  <option value="withdrawal">Withdrawal</option>
                </select>
              </Field>
              <Field label="Amount (UGX)"><input className={inputClass} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
              <Field label="Note"><input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
              <div className="md:col-span-2"><Primary type="submit">Post to ledger</Primary></div>
            </form>
            {message ? <p className="mt-3 text-sm font-semibold">{message}</p> : null}
            <h3 className="mt-6 font-display text-xl">Approved, not yet active</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {loans.filter((loan) => loan.status === "approved").map((loan) => (
                <li key={loan.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-paper px-3 py-2">
                  <span>{loan.memberName} · {ugx(loan.amountUgx)}</span>
                  <button type="button" className="rounded-full bg-moss px-3 py-2 text-xs font-semibold text-surface" onClick={() => void disburseLoan({ data: { id: loan.id } }).then(load)}>Disburse</button>
                </li>
              ))}
              {loans.every((loan) => loan.status !== "approved") ? <li className="text-muted">None waiting.</li> : null}
            </ul>
          </Card>
        ) : null}
        <h2 className="mt-8 font-display text-2xl">Ledger</h2>
        <ul className="mt-3 divide-y divide-line rounded-card border border-line bg-surface">
          {(book?.entries ?? []).map((entry) => (
            <li key={entry.id} className="flex justify-between gap-3 px-4 py-3 text-sm">
              <span>{entry.memberName} · {entry.kind}{entry.note ? ` · ${entry.note}` : ""}</span>
              <span className="font-semibold">{ugx(entry.amountUgx)}</span>
            </li>
          ))}
        </ul>
      </Page>
    </>
  );
}
