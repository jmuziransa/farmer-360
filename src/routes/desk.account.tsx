import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, Field, inputClass, Page, Primary, TopBar } from "@/components/chrome";
import { authClient } from "@/lib/auth/client";
import { useDesk } from "@/lib/use-desk";

export const Route = createFileRoute("/desk/account")({ component: AccountPage });

function AccountPage() {
  const { profile, user } = useDesk();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <>
      <TopBar profile={profile ?? undefined} />
      <Page>
        <h1 className="font-display text-4xl text-moss-deep">Account</h1>
        <p className="mt-2 text-sm text-muted">{user?.primaryEmail} {profile ? `· ${profile.role}` : ""}</p>
        <Card className="mt-6 max-w-md">
          <h2 className="font-display text-2xl">Change password</h2>
          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              setBusy(true);
              setMessage("");
              void authClient
                .changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: true })
                .then((result) => {
                  if (result.error) setMessage(result.error.message ?? "Could not change the password.");
                  else {
                    setMessage("Password updated. Use the new one next time you log in.");
                    setCurrent("");
                    setNext("");
                  }
                  setBusy(false);
                })
                .catch(() => {
                  setMessage("Could not change the password.");
                  setBusy(false);
                });
            }}
          >
            <Field label="Current password"><input className={inputClass} type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required /></Field>
            <Field label="New password"><input className={inputClass} type="password" minLength={8} value={next} onChange={(e) => setNext(e.target.value)} required /></Field>
            {message ? <p className="text-sm font-semibold">{message}</p> : null}
            <Primary type="submit" disabled={busy}>{busy ? "Saving…" : "Update password"}</Primary>
          </form>
        </Card>
      </Page>
    </>
  );
}
