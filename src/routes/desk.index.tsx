import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, Page, TopBar } from "@/components/chrome";
import { useDesk } from "@/lib/use-desk";

export const Route = createFileRoute("/desk/")({ component: DeskHome });

function DeskHome() {
  const { profile, isPending, error } = useDesk();
  if (isPending || profile === undefined) {
    return (
      <>
        <TopBar />
        <Page><p>Loading your desk…</p></Page>
      </>
    );
  }
  return (
    <>
      <TopBar profile={profile} />
      <Page>
        <h1 className="font-display text-4xl text-moss-deep">My desk</h1>
        {error ? <p className="mt-2 text-sm text-clay">{error}</p> : null}
        {!profile ? (
          <Card className="mt-6">
            <p>Your account has no role yet.</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link to="/signup" className="font-semibold text-moss-deep">Complete sign-up</Link>
              <Link to="/desk/farm" className="font-semibold text-moss-deep">Start farm records anyway</Link>
            </div>
          </Card>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Card>
              <p className="text-xs font-semibold uppercase text-muted">{profile.role}</p>
              <h2 className="font-display text-2xl">{profile.fullName}</h2>
              <p className="text-sm text-muted">{profile.district} {profile.phone ? `· ${profile.phone}` : ""}</p>
            </Card>
            <Card>
              <h2 className="font-display text-2xl">Next step</h2>
              <ul className="mt-2 space-y-2 text-sm font-semibold">
                <li><Link to="/desk/farm">Farm records, store and export</Link></li>
                {profile.role === "farmer" || profile.role === "admin" ? <li><Link to="/desk/sell">Submit a produce listing</Link></li> : null}
                <li><Link to="/desk/loans">Loans and repayment plan</Link></li>
                <li><Link to="/desk/orders">Orders</Link></li>
                <li><Link to="/desk/sacco">Savings summary</Link></li>
                <li><Link to="/market">Live marketplace</Link></li>
                {profile.role === "admin" || profile.role === "officer" ? <li><Link to="/desk/admin">Administration</Link></li> : null}
                <li><Link to="/desk/account">Change password</Link></li>
              </ul>
            </Card>
          </div>
        )}
      </Page>
    </>
  );
}
