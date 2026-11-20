import { Link } from "@tanstack/react-router";
import { Menu, Sprout, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import type { Profile } from "@/lib/market.functions";

export function ugx(value: number) {
  return `UGX ${Math.round(value).toLocaleString("en-UG")}`;
}

const NAV = [
  { to: "/", label: "About" },
  { to: "/market", label: "Marketplace" },
  { to: "/desk", label: "My desk" },
  { to: "/desk/farm", label: "Farm records" },
  { to: "/desk/advice", label: "AI advice" },
  { to: "/desk/sell", label: "List produce" },
  { to: "/desk/loans", label: "Loans" },
  { to: "/desk/orders", label: "Orders" },
  { to: "/desk/sacco", label: "SACCO" },
  { to: "/desk/admin", label: "Administration" },
] as const;

export function TopBar({ profile }: { profile?: Profile | null }) {
  const { user, isPending } = useCurrentUserState();
  const [left, setLeft] = useState(false);
  const [right, setRight] = useState(false);

  useEffect(() => {
    document.body.style.overflow = left || right ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [left, right]);

  const close = () => {
    setLeft(false);
    setRight(false);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <button
          type="button"
          className="grid size-11 place-items-center rounded-full border border-line bg-surface md:hidden"
          aria-label="Open navigation"
          onClick={() => {
            setRight(false);
            setLeft(true);
          }}
        >
          <Menu className="size-5" />
        </button>
        <Link to="/" className="flex items-center gap-2 font-display text-xl text-moss-deep">
          <Sprout className="size-5 text-moss" />
          Akatale Desk
        </Link>
        <nav className="ml-6 hidden items-center gap-4 text-sm font-semibold md:flex">
          <Link to="/" className="text-muted hover:text-ink">About</Link>
          <Link to="/market" className="text-muted hover:text-ink">Marketplace</Link>
          {user ? <Link to="/desk/farm" className="text-muted hover:text-ink">Farm</Link> : null}
          {user ? <Link to="/desk/advice" className="text-muted hover:text-ink">AI advice</Link> : null}
          {user ? <Link to="/desk" className="text-muted hover:text-ink">My desk</Link> : null}
          {profile && (profile.role === "admin" || profile.role === "officer") ? (
            <Link to="/desk/admin" className="text-muted hover:text-ink">Administration</Link>
          ) : null}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {!isPending && !user ? (
            <>
              <Link to="/login" className="rounded-full px-3 py-2 text-sm font-semibold text-ink">Log in</Link>
              <Link to="/signup" className="rounded-full bg-moss px-4 py-2 text-sm font-semibold text-surface">Sign up</Link>
            </>
          ) : null}
          {user ? (
            <button
              type="button"
              className="grid size-11 place-items-center rounded-full border border-line bg-surface text-sm font-semibold md:hidden"
              aria-label="Open account menu"
              onClick={() => {
                setLeft(false);
                setRight(true);
              }}
            >
              {(profile?.fullName ?? user.displayName ?? "A").charAt(0).toUpperCase()}
            </button>
          ) : null}
          {user ? (
            <div className="hidden items-center gap-3 md:flex">
              <span className="text-sm">
                <span className="font-semibold">{profile?.fullName ?? user.displayName}</span>
                {profile ? <span className="ml-2 rounded-full bg-moss/10 px-2 py-0.5 text-xs font-semibold uppercase text-moss-deep">{profile.role}</span> : null}
              </span>
              <Link to="/desk/account" className="text-sm font-semibold text-moss-deep">Account</Link>
              <button type="button" className="text-sm font-semibold text-muted" onClick={() => void signOut("/")}>Sign out</button>
            </div>
          ) : null}
        </div>
      </div>
      {left || right ? <button type="button" aria-label="Close menu" className="fixed inset-0 z-40 bg-ink/40 md:hidden" onClick={close} /> : null}
      <aside className={`drawer-ease fixed inset-y-0 left-0 z-50 w-72 border-r border-line bg-surface p-5 md:hidden ${left ? "translate-x-0" : "-translate-x-full"}`}>
        <DrawerHead title="Navigate" onClose={close} />
        <ul className="mt-4 space-y-1">
          {NAV.filter((item) => item.to !== "/desk/admin" || profile?.role === "admin" || profile?.role === "officer").map((item) => (
            <li key={item.to}>
              <Link to={item.to} onClick={close} className="block rounded-xl px-3 py-3 text-base font-semibold hover:bg-paper">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </aside>
      <aside className={`drawer-ease fixed inset-y-0 right-0 z-50 w-72 border-l border-line bg-surface p-5 md:hidden ${right ? "translate-x-0" : "translate-x-full"}`}>
        <DrawerHead title="Account" onClose={close} />
        <p className="mt-4 font-display text-2xl">{profile?.fullName ?? user?.displayName ?? "Guest"}</p>
        <p className="text-sm text-muted">{user?.primaryEmail}</p>
        {profile ? <p className="mt-2 inline-block rounded-full bg-paper px-3 py-1 text-xs font-semibold uppercase text-moss-deep">{profile.role}</p> : null}
        <ul className="mt-5 space-y-1">
          <li><Link to="/desk/account" onClick={close} className="block rounded-xl px-3 py-3 font-semibold hover:bg-paper">Change password</Link></li>
          <li><Link to="/desk" onClick={close} className="block rounded-xl px-3 py-3 font-semibold hover:bg-paper">My desk</Link></li>
          {(profile?.role === "admin" || profile?.role === "officer") && (
            <li><Link to="/desk/admin" onClick={close} className="block rounded-xl px-3 py-3 font-semibold hover:bg-paper">Administration</Link></li>
          )}
          <li>
            <button type="button" className="block w-full rounded-xl px-3 py-3 text-left font-semibold text-clay hover:bg-paper" onClick={() => void signOut("/")}>
              Sign out
            </button>
          </li>
        </ul>
      </aside>
    </header>
  );
}

function DrawerHead({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
      <button type="button" aria-label="Close" className="grid size-11 place-items-center rounded-full border border-line" onClick={onClose}>
        <X className="size-5" />
      </button>
    </div>
  );
}

export function Page({ children }: { children: ReactNode }) {
  return <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-card border border-line bg-surface p-5 ${className}`}>{children}</section>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1 text-sm font-semibold">
      <span>{label}</span>
      {children}
    </label>
  );
}

export const inputClass = "w-full rounded-xl border border-line bg-paper px-3 py-3 text-base font-normal outline-none focus:border-moss";

export function Primary({ children, type = "button", disabled }: { children: ReactNode; type?: "button" | "submit"; disabled?: boolean }) {
  return (
    <button type={type} disabled={disabled} className="rounded-full bg-moss px-5 py-3 text-sm font-semibold text-surface disabled:opacity-60">
      {children}
    </button>
  );
}
