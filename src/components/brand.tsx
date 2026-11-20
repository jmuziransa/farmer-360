import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useState } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/overlays";

/** The Farmer 360 sprout mark on the navy brand block. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      role="img"
      aria-label="Farmer 360"
      className={cn("size-9 shrink-0", className)}
    >
      <rect width="40" height="40" rx="10" fill="#002761" />
      <path d="M20 31.5V17.5" stroke="#ffffff" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M20 22.4c0-5.1 4.1-8.4 9.3-8.4 0 5.1-4.2 8.4-9.3 8.4Z" fill="#3587fc" />
      <path d="M20 26.6c0-4.1-3.2-6.6-7.4-6.6 0 4.1 3.3 6.6 7.4 6.6Z" fill="#ffffff" opacity="0.88" />
      <circle cx="20" cy="10.6" r="2.1" fill="#ffffff" />
    </svg>
  );
}

export function Wordmark({
  className,
  onDark = false,
  compact = false,
}: {
  className?: string;
  onDark?: boolean;
  compact?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className={compact ? "size-8" : "size-9"} />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-display text-[18px] font-semibold tracking-[-0.03em]",
            onDark ? "text-sidebar-foreground" : "text-ink",
          )}
        >
          Farmer <span className="text-primary">360</span>
        </span>
        <span
          className={cn(
            "mt-1 font-mono text-[8px] tracking-[0.22em] uppercase",
            onDark ? "text-sidebar-muted" : "text-muted",
          )}
        >
          Community agriculture desk
        </span>
      </span>
    </span>
  );
}

const NAV = [
  { href: "#platform", label: "Platform" },
  { href: "#how", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
] as const;

export function MarketingHeader() {
  const { user } = useCurrentUserState();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-canvas/90 backdrop-blur-md">
      <div className="container-page flex h-[68px] items-center justify-between gap-4">
        <Link to="/" aria-label="Farmer 360 home" className="shrink-0">
          <Wordmark />
        </Link>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Main">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-[14px] font-semibold text-ink transition-colors hover:text-primary"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <Button asChild size="sm" variant="primary">
              <Link to="/desk">
                My desk <ArrowUpRight className="size-3.5" />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild size="sm" variant="ghost" className="hidden sm:inline-flex">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm" variant="primary">
                <Link to="/signup">Get started</Link>
              </Button>
            </>
          )}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-canvas text-ink">
              <div className="flex h-[68px] items-center justify-between border-b border-line px-5">
                <Wordmark compact />
                <SheetClose asChild>
                  <Button variant="ghost" size="icon" aria-label="Close menu">
                    <X className="size-5" />
                  </Button>
                </SheetClose>
              </div>
              <nav className="flex flex-col px-3 py-4" aria-label="Mobile">
                {NAV.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-3 font-display text-lg text-ink hover:bg-paper"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
              <div className="mt-auto space-y-2 border-t border-line p-5">
                <Button asChild variant="outline" className="w-full">
                  <Link to="/login" onClick={() => setOpen(false)}>
                    Sign in
                  </Link>
                </Button>
                <Button asChild variant="primary" className="w-full">
                  <Link to="/signup" onClick={() => setOpen(false)}>
                    Create an account
                  </Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

const FOOTER_COLUMNS = [
  {
    title: "Platform",
    links: [
      { label: "Marketplace", href: "/market" },
      { label: "My desk", href: "/desk" },
      { label: "Farm records", href: "/desk/farm" },
      { label: "AI advice", href: "/desk/advice" },
    ],
  },
  {
    title: "The co-operative",
    links: [
      { label: "Pricing", href: "#pricing" },
      { label: "How it works", href: "#how" },
      { label: "SACCO ledger", href: "#platform" },
      { label: "Demo accounts", href: "/login" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Frequently asked", href: "#faq" },
      { label: "Sign in", href: "/login" },
      { label: "Create an account", href: "/signup" },
      { label: "Back to top", href: "#top" },
    ],
  },
] as const;

export function MarketingFooter() {
  return (
    <footer className="border-t border-navy/10 bg-navy text-sidebar-foreground">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Wordmark onDark />
          <p className="mt-5 max-w-xs text-[13px] leading-relaxed text-sidebar-muted">
            One honest record for produce, orders and the village SACCO — built from the
            Community Desk project at Light Academy Secondary School.
          </p>
          <p className="mt-6 font-mono text-[10px] tracking-[0.16em] text-sidebar-muted uppercase">
            Kampala · Uganda
          </p>
        </div>
        {FOOTER_COLUMNS.map((column) => (
          <div key={column.title}>
            <p className="font-mono text-[10px] tracking-[0.16em] text-sidebar-muted uppercase">
              {column.title}
            </p>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-[13px] text-sidebar-foreground/80 transition-colors hover:text-white"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-5 font-mono text-[10px] tracking-[0.1em] text-sidebar-muted uppercase sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 Farmer 360 · A Light Academy community project</span>
          <span>Built for smallholder farmers, buyers and SACCOs</span>
        </div>
      </div>
    </footer>
  );
}
