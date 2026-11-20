import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useDeskSession } from "@/components/desk-shell";
import { Avatar, Badge, Button, Card, CardContent, CardHeader, CardTitle, Field, Input, PageHeader } from "@/components/ui";
import { authClient } from "@/lib/auth/client";
import { saveProfile } from "@/lib/market.functions";
import { roleLabel } from "@/lib/utils";

export const Route = createFileRoute("/desk/account")({ component: AccountPage });

function AccountPage() {
  const { profile, user, reload } = useDeskSession();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);

  const [fullName, setFullName] = useState(profile.fullName);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [district, setDistrict] = useState(profile.district ?? "");
  const [farmName, setFarmName] = useState(profile.farmName ?? "");
  const [profileBusy, setProfileBusy] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Your desk identity, and the password you sign in with."
      />

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-4">
            <Avatar name={profile.fullName} size="lg" />
            <div className="min-w-0">
              <p className="font-display text-[19px] text-ink">{profile.fullName}</p>
              <p className="mt-0.5 truncate font-mono text-[11px] text-muted">{user.primaryEmail}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Badge tone="neutral">{roleLabel(profile.role)}</Badge>
                {profile.district ? <Badge tone="outline">{profile.district}</Badge> : null}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Profile details</CardTitle>
              <p className="mt-1 text-[12.5px] text-muted">What the desk shows next to your entries.</p>
            </div>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                setProfileBusy(true);
                void saveProfile({
                  data: { fullName, role: profile.role, phone, district, farmName },
                })
                  .then(async () => {
                    toast.success("Profile saved.");
                    await reload();
                  })
                  .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Could not save."))
                  .finally(() => setProfileBusy(false));
              }}
            >
              <Field label="Full name" htmlFor="ac-name">
                <Input id="ac-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Phone" htmlFor="ac-phone">
                  <Input id="ac-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </Field>
                <Field label="District" htmlFor="ac-district">
                  <Input id="ac-district" value={district} onChange={(e) => setDistrict(e.target.value)} />
                </Field>
              </div>
              <Field label="Farm or group name" htmlFor="ac-farm">
                <Input id="ac-farm" value={farmName} onChange={(e) => setFarmName(e.target.value)} />
              </Field>
              <Button type="submit" disabled={profileBusy}>
                {profileBusy ? "Saving…" : "Save profile"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Change password</CardTitle>
              <p className="mt-1 text-[12.5px] text-muted">Other sessions are signed out when it changes.</p>
            </div>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                setBusy(true);
                void authClient
                  .changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: true })
                  .then((result) => {
                    if (result.error) toast.error(result.error.message ?? "Could not change the password.");
                    else {
                      toast.success("Password updated. Use the new one next time.");
                      setCurrent("");
                      setNext("");
                    }
                    setBusy(false);
                  })
                  .catch(() => {
                    toast.error("Could not change the password.");
                    setBusy(false);
                  });
              }}
            >
              <Field label="Current password" htmlFor="ac-cur">
                <Input id="ac-cur" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" />
              </Field>
              <Field label="New password" hint="At least 8 characters." htmlFor="ac-next">
                <Input id="ac-next" type="password" minLength={8} value={next} onChange={(e) => setNext(e.target.value)} required autoComplete="new-password" />
              </Field>
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Update password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
