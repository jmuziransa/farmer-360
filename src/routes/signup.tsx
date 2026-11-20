import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Card, Field, inputClass, Page, Primary, TopBar } from "@/components/chrome";
import { authClient } from "@/lib/auth/client";
import { saveProfile, type Role } from "@/lib/market.functions";

export const Route = createFileRoute("/signup")({ component: SignupPage });

function SignupPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("farmer");
  const [district, setDistrict] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <>
      <TopBar />
      <Page>
        <Card className="mx-auto max-w-md">
          <h1 className="font-display text-3xl">Sign up</h1>
          <p className="mt-1 text-sm text-muted">Farmers, buyers, and SACCO officers can register. Admin accounts are assigned later.</p>
          <form
            className="mt-5 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              setBusy(true);
              setError("");
              void authClient.signUp
                .email({ email, password, name: fullName, callbackURL: "/desk" })
                .then(async (result) => {
                  if (result.error) {
                    setError(result.error.message ?? "Could not create the account.");
                    setBusy(false);
                    return;
                  }
                  await saveProfile({ data: { fullName, role, phone, district } });
                  void navigate({ to: "/desk" });
                })
                .catch((err: unknown) => {
                  setError(err instanceof Error ? err.message : "Could not create the account.");
                  setBusy(false);
                });
            }}
          >
            <Field label="Full name"><input className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} required /></Field>
            <Field label="Email"><input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
            <Field label="Password"><input className={inputClass} type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
            <Field label="I am joining as">
              <select className={inputClass} value={role} onChange={(e) => setRole(e.target.value as Role)}>
                <option value="farmer">Farmer</option>
                <option value="buyer">Buyer</option>
                <option value="officer">SACCO officer</option>
              </select>
            </Field>
            <Field label="District"><input className={inputClass} value={district} onChange={(e) => setDistrict(e.target.value)} /></Field>
            <Field label="Phone"><input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
            {error ? <p className="text-sm text-clay">{error}</p> : null}
            <Primary type="submit" disabled={busy}>{busy ? "Creating…" : "Create account"}</Primary>
          </form>
          <p className="mt-4 text-sm">Already registered? <Link to="/login" className="font-semibold text-moss-deep">Log in</Link></p>
        </Card>
      </Page>
    </>
  );
}
