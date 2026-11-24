import { Link } from "@tanstack/react-router";
import { Check, LogOut, Settings, Sprout, UserPlus } from "lucide-react";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { DropdownCheck, DropdownItem, DropdownLabel } from "@/components/overlays";
import { Avatar, Badge } from "@/components/ui";
import { signOut, switchAccount } from "@/lib/auth/client";
import type { AppUser } from "@/lib/auth/use-current-user";
import { DEMO_ACCOUNTS, type DemoAccount } from "@/lib/demo";
import type { Profile } from "@/lib/market.functions";
import { cn, roleLabel } from "@/lib/utils";

/**
 * The desk's account switcher.
 *
 * One shared implementation for every surface that shows the signed-in
 * identity — the sidebar user row and the top-bar user menu — so switching
 * accounts behaves identically everywhere. Farm switching deliberately does
 * NOT live here; it has its own menu (farm-menu.tsx, sidebar workspace card).
 * Switching signs the visitor in as another account (the demo personas ship
 * with their credentials) and hard-navigates so every role-scoped view
 * refetches under the new identity; an overlay animation covers the gap so
 * the swap feels deliberate instead of a blank flash.
 *
 * "Add account" opens the sign-in page for an account that is not a demo
 * persona; it always sits immediately above "Sign out".
 *
 * Two render variants exist for the same actions:
 *  - `dropdown` — Radix DropdownMenu items (sidebar user row, top menu).
 *    DropdownItem CRASHES outside a DropdownMenu root, so non-dropdown
 *    surfaces use…
 *  - `rows` — plain styled links/buttons.
 */

type AccountSwitchValue = {
  /** Display name of the account being switched to, null when idle. */
  pending: string | null;
  switchTo: (account: DemoAccount) => void;
};

const AccountSwitchContext = createContext<AccountSwitchValue | null>(null);

function useAccountSwitch(): AccountSwitchValue {
  const value = useContext(AccountSwitchContext);
  if (!value) {
    throw new Error("useAccountSwitch must be used inside AccountSwitchProvider.");
  }
  return value;
}

export function AccountSwitchProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<string | null>(null);
  const busyRef = useRef(false);

  const switchTo = useCallback((account: DemoAccount) => {
    if (busyRef.current) return; // one switch at a time
    busyRef.current = true;
    setPending(account.name);
    void switchAccount(account.email, account.password).catch((err: unknown) => {
      busyRef.current = false;
      setPending(null);
      toast.error(err instanceof Error ? err.message : "Could not switch account.");
    });
  }, []);

  return (
    <AccountSwitchContext.Provider value={{ pending, switchTo }}>
      {children}
      {pending ? <SwitchOverlay name={pending} /> : null}
    </AccountSwitchContext.Provider>
  );
}

/** Full-screen cover shown while the identity swap reloads the desk. */
function SwitchOverlay({ name }: { name: string }) {
  return (
    <div
      role="status"
      aria-label={`Switching to ${name}`}
      className="fixed inset-0 z-[90] grid place-items-center bg-canvas/95 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="flex w-full max-w-xs flex-col items-center gap-5 px-6 text-center animate-in fade-in slide-in-from-bottom-6 duration-300">
        <span className="relative grid size-16 place-items-center rounded-full border border-primary/25 bg-primary-soft">
          <Sprout className="size-7 text-primary animate-pulse" strokeWidth={1.7} />
          <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin [animation-duration:1.4s]" />
        </span>
        <div>
          <p className="font-display text-[19px] leading-snug text-ink">Switching to {name}…</p>
          <p className="mt-1.5 font-mono text-[10px] tracking-[0.16em] text-muted uppercase">
            Opening that desk
          </p>
        </div>
        <div className="h-1 w-44 overflow-hidden rounded-full bg-paper">
          <div className="h-full w-2/5 rounded-full bg-primary animate-[switchbar_1.1s_ease-in-out_infinite]" />
        </div>
      </div>
    </div>
  );
}

const rowClass =
  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2.5 text-left text-[13px] text-ink transition-colors hover:bg-paper";

/**
 * One row per demo persona; the signed-in account is checked and disabled.
 * `variant="dropdown"` renders Radix menu items, `variant="rows"` plain
 * buttons for non-dropdown surfaces.
 */
export function AccountSwitchItems({
  session,
  variant = "dropdown",
}: {
  session: { user: AppUser; profile: Profile };
  variant?: "dropdown" | "rows";
}) {
  const { pending, switchTo } = useAccountSwitch();
  const activeEmail = session.user.primaryEmail?.toLowerCase() ?? null;
  const heading =
    variant === "dropdown" ? (
      <DropdownLabel className="px-2.5 pb-1 font-mono text-[9px] tracking-[0.14em] text-muted uppercase">
        Switch account
      </DropdownLabel>
    ) : (
      <p className="px-2.5 pb-1 pt-2 font-mono text-[9px] tracking-[0.14em] text-muted uppercase">
        Switch account
      </p>
    );

  return (
    <>
      {heading}
      {DEMO_ACCOUNTS.map((account) => {
        const active = account.email.toLowerCase() === activeEmail;
        const content = (
          <>
            <Avatar name={account.name} size="xs" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-semibold text-ink">
                {account.name}
              </span>
              <span className="block truncate font-mono text-[9px] tracking-[0.06em] text-muted uppercase">
                {roleLabel(account.role)}
              </span>
            </span>
            {variant === "dropdown" ? (
              <DropdownCheck checked={active} />
            ) : active ? (
              <Check className="size-4 shrink-0 text-primary" />
            ) : null}
          </>
        );
        if (variant === "dropdown") {
          return (
            <DropdownItem
              key={account.email}
              disabled={pending !== null || active}
              onSelect={(event) => {
                event.preventDefault();
                switchTo(account);
              }}
              className="gap-2.5"
            >
              {content}
            </DropdownItem>
          );
        }
        return (
          <button
            key={account.email}
            type="button"
            disabled={pending !== null || active}
            onClick={() => switchTo(account)}
            className={cn(rowClass, active && "bg-primary-soft", pending !== null && "opacity-60")}
          >
            {content}
          </button>
        );
      })}
    </>
  );
}

/** The "add another account" row — always placed directly above Sign out. */
export function AddAccountItem({ className }: { className?: string }) {
  return (
    <DropdownItem asChild className={className}>
      <Link to="/login">
        <UserPlus className="size-3.5" /> Add account
      </Link>
    </DropdownItem>
  );
}

export function SignOutDropdownItem({ redirectTo = "/" }: { redirectTo?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <DropdownItem
      disabled={busy}
      onSelect={(event) => {
        event.preventDefault();
        setBusy(true);
        void signOut(redirectTo).catch((err: unknown) => {
          setBusy(false);
          toast.error(err instanceof Error ? err.message : "Could not sign out.");
        });
      }}
      className="text-danger data-[highlighted]:bg-danger-soft"
    >
      <LogOut className="size-3.5" /> {busy ? "Signing out…" : "Sign out"}
    </DropdownItem>
  );
}

/* ── Row variants for surfaces that are NOT Radix dropdowns (the mobile sheet) ── */

export function AccountSettingsRow({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link to="/desk/account" className={rowClass} onClick={onNavigate}>
      <Settings className="size-3.5" /> Account settings
    </Link>
  );
}

export function AddAccountRow({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link to="/login" className={rowClass} onClick={onNavigate}>
      <UserPlus className="size-3.5" /> Add account
    </Link>
  );
}

export function SignOutRow({ redirectTo = "/" }: { redirectTo?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        void signOut(redirectTo).catch((err: unknown) => {
          setBusy(false);
          toast.error(err instanceof Error ? err.message : "Could not sign out.");
        });
      }}
      className={cn(rowClass, "text-danger hover:bg-danger-soft")}
    >
      <LogOut className="size-3.5" /> {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}

/** Header block describing the signed-in identity, for the wider menus. */
export function AccountIdentityHeader({
  session,
}: {
  session: { user: AppUser; profile: Profile };
}) {
  const { profile, user } = session;
  return (
    <div className="px-2.5 py-2">
      <div className="flex items-center gap-2.5">
        <Avatar name={profile.fullName} size="md" />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-ink">{profile.fullName}</p>
          <p className="truncate font-mono text-[10px] text-muted">{user.primaryEmail}</p>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <Badge tone="neutral">{roleLabel(profile.role)}</Badge>
        {profile.district ? <Badge tone="outline">{profile.district}</Badge> : null}
      </div>
    </div>
  );
}
