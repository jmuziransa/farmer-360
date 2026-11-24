import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { LogoMark, Wordmark } from "@/components/brand";
import { DEMO_ACCOUNTS, type DemoAccount } from "@/lib/demo";
import { cn } from "@/lib/utils";

/**
 * Split-screen auth shell: the navy panel on the left carries the product
 * story and the demo accounts; the form sits on white to the right.
 */
export function AuthShell({
  children,
  onPick,
  activeEmail,
  seeding,
}: {
  children: ReactNode;
  onPick?: (account: DemoAccount) => void;
  activeEmail?: string;
  seeding?: boolean;
}) {
  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
      <aside className="relative hidden overflow-hidden bg-navy px-10 py-9 text-sidebar-foreground lg:flex lg:flex-col">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-28 -right-28 size-[380px] rounded-full border border-white/10"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -bottom-20 size-[240px] rounded-full border border-primary/40"
        />
        <Link to="/" className="relative w-fit">
          <Wordmark onDark />
        </Link>

        <div className="relative mt-16 max-w-md">
          <p className="eyebrow text-[#8fbaff]">One desk for the whole season</p>
          <h2 className="mt-4 font-display text-[34px] leading-[1.14] text-white">
            A record the farm, the buyer and the SACCO can all agree on.
          </h2>
          <p className="mt-4 text-[13.5px] leading-relaxed text-sidebar-muted">
            The same desk the pilot uses in Mukono, Kampala and Masaka. Sign in with a demo account
            and every row is already written.
          </p>
        </div>

        <div className="relative mt-10">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[9.5px] tracking-[0.18em] text-sidebar-muted uppercase">
              Demo accounts
            </p>
            {seeding ? (
              <span className="inline-flex items-center gap-1.5 font-mono text-[9px] text-sidebar-muted uppercase">
                <Loader2 className="size-3 animate-spin" /> Preparing
              </span>
            ) : (
              <span className="font-mono text-[9px] text-sidebar-muted uppercase">Ready</span>
            )}
          </div>
          <div className="mt-3 space-y-2">
            {DEMO_ACCOUNTS.map((account) => {
              const active = activeEmail === account.email;
              return (
                <button
                  key={account.email}
                  type="button"
                  // Fill works even while the demo desk is still preparing —
                  // clicks during the "Preparing" window used to be swallowed
                  // (the QA "needs two interactions" report).
                  disabled={!onPick}
                  onClick={() => onPick?.(account)}
                  title="Click to fill the form"
                  className={cn(
                    "group flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border px-3.5 py-3 text-left transition-colors disabled:cursor-wait disabled:opacity-60",
                    active
                      ? "border-primary bg-primary/20"
                      : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-semibold text-white">
                      {account.label}
                    </span>
                    <span className="mt-0.5 block truncate font-mono text-[10px] text-sidebar-muted">
                      {account.email}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="hidden font-mono text-[9px] text-sidebar-muted sm:block">
                      {account.password}
                    </span>
                    <span className="font-mono text-[8.5px] tracking-[0.1em] text-[#8fbaff] uppercase opacity-0 transition-opacity group-hover:opacity-100">
                      Fill
                    </span>
                    <ArrowUpRight className="size-3.5 text-[#8fbaff] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-3 font-mono text-[9px] leading-relaxed text-sidebar-muted/80">
            Choosing an account fills the form. Nothing is shared outside this workspace.
          </p>
        </div>

        <div className="relative mt-auto flex items-center gap-2 pt-10 font-mono text-[9px] tracking-[0.14em] text-sidebar-muted uppercase">
          <LogoMark className="size-5" />
          Farmer 360 · Light Academy community project
        </div>
      </aside>

      <main className="flex min-h-screen flex-col">
        <div className="flex items-center justify-between gap-3 px-5 py-5 sm:px-8">
          <Link to="/" className="lg:hidden">
            <Wordmark compact />
          </Link>
          <div className="ml-auto flex items-center gap-4">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted transition-colors hover:text-ink"
            >
              <ArrowLeft className="size-3.5" /> Back to the site
            </Link>
          </div>
        </div>

        <div className="flex flex-1 items-start justify-center px-5 pt-4 pb-14 sm:px-8 lg:items-center lg:pt-0">
          <div className="w-full max-w-[430px]">
            {children}
            {onPick ? (
              <div className="mt-8 lg:hidden">
                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-line" />
                  <span className="font-mono text-[9px] tracking-[0.16em] text-muted uppercase">
                    Demo accounts
                  </span>
                  <span className="h-px flex-1 bg-line" />
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {DEMO_ACCOUNTS.map((account) => (
                    <button
                      key={account.email}
                      type="button"
                      disabled={seeding}
                      onClick={() => onPick(account)}
                      className="flex items-center justify-between gap-2 rounded-md border border-line bg-surface px-3 py-2 text-left transition-colors hover:border-line-strong disabled:opacity-60"
                    >
                      <span>
                        <span className="block text-[11.5px] font-semibold text-ink">
                          {account.label}
                        </span>
                        <span className="mt-0.5 block truncate font-mono text-[9px] text-muted">
                          {account.email}
                        </span>
                      </span>
                      <ArrowUpRight className="size-3 shrink-0 text-primary" />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}

export function AuthError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p
      className="rounded-md border border-danger/25 bg-danger-soft px-3.5 py-3 text-[12.5px] text-danger"
      role="alert"
    >
      {message}
    </p>
  );
}
