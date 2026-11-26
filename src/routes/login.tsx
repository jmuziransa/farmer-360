import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthError, AuthShell } from "@/components/auth-shell";
import { Button, Card, Field, Input } from "@/components/ui";
import { authClient } from "@/lib/auth/client";
import { DEMO_ACCOUNTS, type DemoAccount } from "@/lib/demo";
import { seedDesk } from "@/lib/market.functions";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [seeding, setSeeding] = useState(true);
  const [seedError, setSeedError] = useState(false);

  // The demo desk seeds itself the first time anyone opens the login page —
  // the quick-fill accounts only work once their rows exist. A failed seed is
  // NOT silent: quick-fill sign-ins would all fail with "Invalid email or
  // password" and the visitor would have no idea why.
  useEffect(() => {
    let alive = true;
    void seedDesk()
      .catch(() => {
        if (alive) {
          setSeedError(true);
          toast.error("The demo desk could not be prepared — reload the page to retry.");
        }
      })
      .finally(() => {
        if (alive) setSeeding(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  function pick(account: DemoAccount) {
    setEmail(account.email);
    setPassword(account.password);
    setError("");
  }

  return (
    <AuthShell onPick={pick} activeEmail={email} seeding={seeding}>
      <Card className="border-none p-0 shadow-none">
        <h1 className="font-display text-[28px] leading-tight text-ink">Welcome back</h1>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
          Sign in to your desk, or pick a demo account from the panel.
        </p>
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setBusy(true);
            setError("");
            void authClient.signIn
              .email({ email, password, callbackURL: "/desk" })
              .then((result) => {
                if (result.error) {
                  setError(result.error.message ?? "Could not sign in.");
                  setBusy(false);
                  return;
                }
                toast.success("Signed in. Opening your desk…");
                void navigate({ to: "/desk" });
              })
              .catch(() => {
                setError("Could not sign in.");
                setBusy(false);
              });
          }}
        >
          <Field label="Email" htmlFor="login-email">
            <Input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </Field>
          <Field label="Password" htmlFor="login-password">
            <Input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </Field>
          <AuthError message={error} />
          <Button type="submit" className="w-full" size="lg" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p className="mt-5 text-center text-[13px] text-muted">
          New to Farmer 360?{" "}
          <a href="/signup" className="font-semibold text-primary hover:underline">
            Create an account
          </a>
        </p>
        {seeding ? (
          <p className="mt-3 text-center font-mono text-[9.5px] tracking-[0.12em] text-muted-soft uppercase">
            Preparing the demo desk…
          </p>
        ) : seedError ? (
          <p className="mt-3 text-center font-mono text-[9.5px] tracking-[0.12em] text-danger uppercase">
            Demo desk failed to prepare — reload to retry
          </p>
        ) : (
          <p className="mt-3 text-center font-mono text-[9.5px] tracking-[0.12em] text-muted-soft uppercase">
            {DEMO_ACCOUNTS.length} demo accounts ready
          </p>
        )}
      </Card>
    </AuthShell>
  );
}
