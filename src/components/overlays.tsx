import * as AccordionPrimitive from "@radix-ui/react-accordion";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { Check, ChevronDown, Plus } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ────────────────────────────── Dialog ────────────────────────────── */

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  className,
  children,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/45 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-line bg-surface p-6 shadow-[0_30px_80px_-30px_rgba(15,14,13,0.5)] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-5 pr-8">
      <DialogPrimitive.Title className="font-display text-[22px] leading-tight text-ink">
        {title}
      </DialogPrimitive.Title>
      {description ? (
        <DialogPrimitive.Description className="mt-1.5 text-sm leading-relaxed text-muted">
          {description}
        </DialogPrimitive.Description>
      ) : null}
    </div>
  );
}

/* ────────────────────────────── Sheet ────────────────────────────── */

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

export function SheetContent({
  className,
  children,
  side = "right",
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & { side?: "left" | "right" | "bottom" }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/45 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-50 flex flex-col bg-sidebar text-sidebar-foreground shadow-2xl data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=open]:animate-in data-[state=open]:duration-300",
          side === "left" &&
            "inset-y-0 left-0 w-[86vw] max-w-sm data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
          side === "right" &&
            "inset-y-0 right-0 w-[86vw] max-w-sm data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
          side === "bottom" &&
            "inset-x-0 bottom-0 max-h-[86vh] overflow-y-auto rounded-t-2xl border-t border-white/10 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/* ────────────────────────────── Dropdown ────────────────────────────── */

export const DropdownMenu = DropdownPrimitive.Root;
export const DropdownMenuTrigger = DropdownPrimitive.Trigger;

// Instant open/close by design: the enter fade delayed the first paint, and
// Radix keeps the content mounted through the exit animation — so pressing a
// trigger again right after closing felt unresponsive. No animation classes
// means the menu paints on press and unmounts immediately on close.
export function DropdownMenuContent({
  className,
  align = "end",
  sideOffset = 8,
  ...props
}: ComponentProps<typeof DropdownPrimitive.Content>) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-52 overflow-hidden rounded-lg border border-line bg-surface p-1.5 shadow-[0_20px_50px_-20px_rgba(15,14,13,0.45)]",
          className,
        )}
        {...props}
      />
    </DropdownPrimitive.Portal>
  );
}

export function DropdownItem({
  className,
  inset,
  ...props
}: ComponentProps<typeof DropdownPrimitive.Item> & { inset?: boolean }) {
  return (
    <DropdownPrimitive.Item
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] text-ink outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-canvas",
        inset && "pl-8",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownLabel({
  className,
  ...props
}: ComponentProps<typeof DropdownPrimitive.Label>) {
  return (
    <DropdownPrimitive.Label
      className={cn(
        "px-2.5 py-1.5 font-mono text-[10px] tracking-[0.12em] text-muted uppercase",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownSeparator({
  className,
  ...props
}: ComponentProps<typeof DropdownPrimitive.Separator>) {
  return <DropdownPrimitive.Separator className={cn("my-1 h-px bg-line", className)} {...props} />;
}

export function DropdownCheck({ checked }: { checked?: boolean }) {
  return (
    <span className="grid size-4 place-items-center">
      {checked ? <Check className="size-3.5" /> : null}
    </span>
  );
}

/* ────────────────────────────── Accordion ────────────────────────────── */

export const Accordion = AccordionPrimitive.Root;

export function AccordionItem({
  className,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      className={cn("border-b border-line-strong/60 last:border-b-0", className)}
      {...props}
    />
  );
}

export function AccordionTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        className={cn(
          "group flex flex-1 items-start justify-between gap-6 py-5 text-left font-display text-[17px] leading-snug text-ink transition-colors hover:text-rust-deep",
          className,
        )}
        {...props}
      >
        {children}
        <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-line-strong text-muted transition-transform duration-200 group-data-[state=open]:rotate-45 group-data-[state=open]:border-ink group-data-[state=open]:text-ink">
          <Plus className="size-3.5" />
        </span>
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

export function AccordionContent({
  className,
  children,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
      {...props}
    >
      <div className={cn("max-w-2xl pb-5 text-[14px] leading-relaxed text-muted", className)}>
        {children}
      </div>
    </AccordionPrimitive.Content>
  );
}

/* ────────────────────────────── Tabs ────────────────────────────── */

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border border-line bg-canvas p-1",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-semibold text-muted transition-colors outline-none data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-[0_1px_2px_rgba(15,14,13,0.08)]",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("mt-5 outline-none", className)} {...props} />;
}

/* ────────────────────────────── Misc ────────────────────────────── */

export function PopoverCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-line bg-surface shadow-[0_20px_50px_-20px_rgba(15,14,13,0.4)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Chevron({ className }: { className?: string }) {
  return <ChevronDown className={cn("size-4 text-muted", className)} />;
}
