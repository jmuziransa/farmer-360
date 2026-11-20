import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AuthError, AuthShell } from "@/components/auth-shell";
import { Button, Card, Field, Input, Select } from "@/components/ui";
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
  const [farmName, setFarmName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <AuthShell>
      <Card className="border-none p-0 shadow-none">
        <h1 className="font-display text-[28px] leading-tight text-ink">Create your desk</h1>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
          Farmers, buyers and SACCO officers can register. Admin accounts are assigned
          by the desk.
        </p>
        <form
          className="mt-6 space-y-4"
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
                try {
                  await saveProfile({ data: { fullName, role, phone, district, farmName } });
                } catch {
                  // The account exists; the profile completes after the first
                  // desk visit when the missing-profile screen offers the form.
                }
                toast.success("Account created. Opening your desk…");
                void navigate({ to: "/desk" });
              })
              .catch((err: unknown) => {
                setError(err instanceof Error ? err.message : "Could not create the account.");
                setBusy(false);
              });
          }}
        >
          <Field label="Full name" htmlFor="su-name">
            <Input id="su-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required autoComplete="name" />
          </Field>
          <Field label="Email" htmlFor="su-email">
            <Input id="su-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </Field>
          <Field label="Password" hint="At least 8 characters." htmlFor="su-password">
            <Input id="su-password" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
          </Field>
          <Field label="I am joining as" htmlFor="su-role">
            <Select id="su-role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              <option value="farmer">Farmer</option>
              <option value="buyer">Buyer</option>
              <option value="officer">SACCO officer</option>
            </Select>
          </Field>
          {role === "farmer" ? (
            <Field label="Farm or group name" htmlFor="su-farm">
              <Input id="su-farm" value={farmName} onChange={(e) => setFarmName(e.target.value)} placeholder="Nakato Family Farm" />
            </Field>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="District" htmlFor="su-district">
              <Input id="su-district" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Mukono" />
            </Field>
            <Field label="Phone" htmlFor="su-phone">
              <Input id="su-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0700 000 000" />
            </Field>
          </div>
          <AuthError message={error} />
          <Button type="submit" className="w-full" size="lg" disabled={busy}>
            {busy ? "Creating…" : "Create account"}
          </Button>
        </form>
        <p className="mt-5 text-center text-[13px] text-muted">
          Already registered?{" "}
          <a href="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </a>
        </p>
      </Card>
    </AuthShell>
  );
}
