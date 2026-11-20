import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { avatarTone, cn, initials, type Tone, toneClass } from "@/lib/utils";

/* ────────────────────────────── Button ────────────────────────────── */

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md border text-sm font-semibold whitespace-nowrap transition-[background,color,border-color,box-shadow,transform] duration-150 ease-out disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:translate-y-px [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Voltage-blue primary CTA (Coursera: #0056d2 fill, #0048b0 pressed).
        primary:
          "border-primary bg-primary text-white hover:border-primary-pressed hover:bg-primary-pressed",
        ink: "border-ink bg-ink text-canvas hover:border-ink-soft hover:bg-ink-soft shadow-[0_1px_0_rgba(255,255,255,0.08)_inset]",
        // Secondary: white canvas with ink border (Coursera button-secondary).
        outline: "border-ink bg-transparent text-ink hover:border-ink hover:bg-paper",
        surface: "border-line bg-paper text-ink hover:border-line-strong hover:bg-primary-xsoft",
        ghost: "border-transparent bg-transparent text-ink hover:bg-paper",
        subtle: "border-transparent bg-paper text-ink hover:bg-line/60",
        danger: "border-danger/30 bg-danger-soft text-danger hover:border-danger hover:bg-danger hover:text-white",
        link: "border-transparent bg-transparent text-primary underline-offset-4 hover:underline px-0",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-[15px]",
        icon: "size-9 p-0",
        "icon-sm": "size-8 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

/* ────────────────────────────── Badge ────────────────────────────── */

export function Badge({
  tone = "neutral",
  className,
  children,
  dot,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-medium tracking-[0.08em] uppercase",
        toneClass(tone),
        className,
      )}
    >
      {dot ? <span className="size-1.5 rounded-full bg-current opacity-80" /> : null}
      {children}
    </span>
  );
}

/* ────────────────────────────── Card ────────────────────────────── */

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-card border border-line bg-surface", className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex items-start justify-between gap-4 px-5 pt-5", className)} {...props} />;
}

export function CardTitle({ className, ...props }: ComponentProps<"h3">) {
  return <h3 className={cn("font-display text-[17px] leading-snug text-ink", className)} {...props} />;
}

export function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("mt-1 text-[13px] leading-relaxed text-muted", className)} {...props} />;
}

export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}

export function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("border-t border-line px-5 py-3", className)} {...props} />;
}

/* ────────────────────────────── Form ────────────────────────────── */

export function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    <label
      className={cn("mb-1.5 block font-mono text-[10.5px] font-medium tracking-[0.14em] text-muted uppercase", className)}
      {...props}
    />
  );
}

const fieldBase =
  "w-full rounded-md border border-line-strong bg-surface px-3 text-[14px] text-ink placeholder:text-muted-soft/80 transition-colors duration-150 hover:border-muted-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(fieldBase, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(fieldBase, "min-h-24 py-2.5 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        fieldBase,
        "h-10 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 12 12%22><path d=%22M2.5 4.5 6 8l3.5-3.5%22 fill=%22none%22 stroke=%22%235b6780%22 stroke-width=%221.2%22 stroke-linecap=%22round%22/></svg>')] bg-[right_0.75rem_center] bg-no-repeat pr-9",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="mt-1.5 text-xs leading-relaxed text-muted">{hint}</p> : null}
    </div>
  );
}

/* ────────────────────────────── Layout helpers ────────────────────────────── */

export function Separator({ className }: { className?: string }) {
  return <div role="separator" className={cn("h-px w-full bg-line", className)} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-line/70", className)} aria-hidden />;
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      {Icon ? (
        <span className="mb-4 grid size-11 place-items-center rounded-full border border-line bg-paper text-muted">
          <Icon className="size-5" strokeWidth={1.6} />
        </span>
      ) : null}
      <p className="font-display text-lg text-ink">{title}</p>
      {body ? <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow text-primary">{eyebrow}</p> : null}
        <h1 className="mt-1.5 font-display text-[26px] leading-tight text-ink sm:text-[30px]">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  className?: string;
}) {
  return (
    <Card className={cn("p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-[10px] font-medium tracking-[0.14em] text-muted uppercase">{label}</p>
        {Icon ? (
          <span className={cn("grid size-7 place-items-center rounded-md border", toneClass(tone))}>
            <Icon className="size-3.5" strokeWidth={1.8} />
          </span>
        ) : null}
      </div>
      <p className="mt-3 font-mono text-[24px] leading-none font-medium tracking-tight text-ink tabular-nums">
        {value}
      </p>
      {hint ? <div className="mt-2 text-[12px] leading-snug text-muted">{hint}</div> : null}
    </Card>
  );
}

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string | null | undefined;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    xs: "size-6 text-[10px]",
    sm: "size-8 text-[11px]",
    md: "size-9 text-xs",
    lg: "size-12 text-sm",
  };
  return (
    <span
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full border border-black/5 font-mono font-medium",
        sizes[size],
        avatarTone(name),
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

export function Progress({ value, tone = "primary" }: { value: number; tone?: "primary" | "olive" | "ink" }) {
  const colors = { primary: "bg-primary", olive: "bg-olive", ink: "bg-ink" };
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
      <div
        className={cn("h-full rounded-full transition-[width] duration-500", colors[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

/* ────────────────────────────── Table ────────────────────────────── */

export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full border-collapse text-left text-sm", className)} {...props} />
    </div>
  );
}

export function TH({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "border-b border-line px-4 py-2.5 font-mono text-[10px] font-medium tracking-[0.12em] whitespace-nowrap text-muted uppercase",
        className,
      )}
      {...props}
    />
  );
}

export function TD({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn("border-b border-line/70 px-4 py-3 align-middle text-ink", className)} {...props} />;
}
