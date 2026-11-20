import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional class names, resolving Tailwind conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** `UGX 1,250,000` — the canonical money format for the desk. */
export function ugx(value: number): string {
  return `UGX ${Math.round(value || 0).toLocaleString("en-UG")}`;
}

/** `UGX 1.25M` — for headline figures and tight table cells. */
export function ugxCompact(value: number): string {
  const n = Math.round(value || 0);
  const abs = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (abs >= 1_000_000_000) return `${sign}UGX ${trim(abs / 1_000_000_000)}B`;
  if (abs >= 1_000_000) return `${sign}UGX ${trim(abs / 1_000_000)}M`;
  if (abs >= 10_000) return `${sign}UGX ${trim(abs / 1_000)}K`;
  return `${sign}UGX ${abs.toLocaleString("en-UG")}`;
}

function trim(n: number): string {
  return n
    .toFixed(n >= 100 ? 0 : n >= 10 ? 1 : 2)
    .replace(/\.0+$/, "")
    .replace(/(\.\d)0$/, "$1");
}

/** `AN` for "Amina Nakato". */
export function initials(name: string | null | undefined): string {
  if (!name) return "··";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "··";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const DATE_SHORT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
});

/** "12 Nov 2026" — or "12 Nov" when `short`. */
export function formatDate(value: string | Date | null | undefined, short = false): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return (short ? DATE_SHORT : DATE).format(date);
}

/** "just now", "12m ago", "3h ago", "2d ago", then a date. */
export function timeAgo(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(date, true);
}

/** "Thursday, 19 November" — the dashboard greeting date. */
export function longDate(value: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(value);
}

export function greeting(value: Date = new Date()): string {
  const hour = value.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function titleCase(value: string): string {
  return value.replace(/(^|\s|-)\S/g, (c) => c.toUpperCase());
}

export type Tone = "neutral" | "olive" | "amber" | "rust" | "blue" | "indigo" | "danger" | "outline";

const TONES: Record<Tone, string> = {
  neutral: "border-line bg-paper text-muted",
  olive: "border-olive/20 bg-olive-soft text-olive",
  amber: "border-amber/20 bg-amber-soft text-amber",
  rust: "border-primary/20 bg-primary-soft text-primary",
  blue: "border-blue/20 bg-blue-soft text-blue",
  indigo: "border-indigo/20 bg-indigo-soft text-indigo",
  danger: "border-danger/20 bg-danger-soft text-danger",
  outline: "border-line-strong bg-transparent text-ink",
};

export function toneClass(tone: Tone): string {
  return TONES[tone];
}

type StatusMeta = { label: string; tone: Tone };

/** Human labels + badge tones for every lifecycle status in the desk. */
export function statusMeta(status: string): StatusMeta {
  switch (status) {
    case "pending":
      return { label: "Awaiting review", tone: "amber" };
    case "live":
      return { label: "On the market", tone: "olive" };
    case "rejected":
      return { label: "Returned", tone: "danger" };
    case "sold":
      return { label: "Sold", tone: "neutral" };
    case "requested":
      return { label: "Requested", tone: "amber" };
    case "accepted":
      return { label: "Accepted", tone: "blue" };
    case "fulfilled":
      return { label: "Fulfilled", tone: "olive" };
    case "declined":
      return { label: "Declined", tone: "danger" };
    case "approved":
      return { label: "Approved", tone: "blue" };
    case "active":
      return { label: "Repaying", tone: "indigo" };
    case "closed":
      return { label: "Closed", tone: "neutral" };
    case "deposit":
      return { label: "Deposit", tone: "olive" };
    case "withdrawal":
      return { label: "Withdrawal", tone: "rust" };
    default:
      return { label: titleCase(status || "Unknown"), tone: "neutral" };
  }
}

export function roleLabel(role: string): string {
  switch (role) {
    case "farmer":
      return "Farmer";
    case "buyer":
      return "Buyer";
    case "officer":
      return "SACCO officer";
    case "admin":
      return "Administrator";
    default:
      return titleCase(role);
  }
}

/** Stable accent for an avatar, derived from the name. */
export function avatarTone(name: string | null | undefined): string {
  const palette = [
    "bg-olive-soft text-olive",
    "bg-primary-soft text-primary",
    "bg-blue-soft text-blue",
    "bg-amber-soft text-amber",
    "bg-indigo-soft text-indigo",
  ];
  const seed = (name ?? "").split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return palette[seed % palette.length];
}

export function plural(count: number, singular: string, pluralForm?: string): string {
  return `${count.toLocaleString("en-UG")} ${count === 1 ? singular : (pluralForm ?? `${singular}s`)}`;
}
