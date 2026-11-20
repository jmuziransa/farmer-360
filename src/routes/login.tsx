import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Card, Field, inputClass, Page, Primary, TopBar } from "@/components/chrome";
import { authClient } from "@/lib/auth/client";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("jmuziransa@gmail.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <>
      <TopBar />
      <Page>
        <Card className="mx-auto max-w-md">
          <h1 className="font-display text-3xl">Log in</h1>
          <p className="mt-1 text-sm text-muted">Use a ready account from the About page, or one you created.</p>
          <form
            className="mt-5 space-y-4"
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
                  void navigate({ to: "/desk" });
                })
                .catch(() => {
                  setError("Could not sign in.");
                  setBusy(false);
                });
            }}
          >
            <Field label="Email">
              <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>
            <Field label="Password">
              <input className={inputClass} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </Field>
            {error ? <p className="text-sm text-clay">{error}</p> : null}
            <Primary type="submit" disabled={busy}>{busy ? "Signing in…" : "Log in"}</Primary>
          </form>
          <p className="mt-4 text-sm">No account? <Link to="/signup" className="font-semibold text-moss-deep">Sign up</Link></p>
        </Card>
      </Page>
    </>
  );
}
