import { Link, useNavigate } from "@tanstack/react-router";
import { Check, Plus, Tractor } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { DropdownCheck, DropdownItem, DropdownLabel } from "@/components/overlays";
import { listMyFarms } from "@/lib/farm.functions";
import { cn } from "@/lib/utils";

/**
 * The desk's farm switcher — the "Farms" half of the top-right and sidebar
 * menus (the account half lives in account-menu.tsx).
 *
 * A FarmMenuProvider sits inside the desk shell and owns two things:
 *  - the list of the signed-in user's farms (light `listMyFarms` fetch,
 *    refetchable so a newly created farm appears without a page reload), and
 *  - the desk-wide ACTIVE farm: picking a farm here selects it for the whole
 *    desk, and the farm-records page reads the same value. The choice persists
 *    in localStorage per user, so a reload keeps the context.
 *
 * QA contract: after `saveFarm` the caller calls `reload()` (and usually
 * `setActiveFarm(id)`), and every dropdown labelled "Farms" — sidebar
 * workspace card, top-right user menu, mobile account sheet — shows the new
 * farm immediately.
 */

export type FarmSummary = {
  id: number;
  name: string;
  district: string;
  farmType: string;
  archived: boolean;
};

type FarmMenuValue = {
  farms: FarmSummary[];
  activeFarmId: number | null;
  activeFarmName: string | null;
  loading: boolean;
  setActiveFarm: (id: number | null) => void;
  reload: () => Promise<void>;
};

const FarmMenuContext = createContext<FarmMenuValue | null>(null);

export function useFarmMenu(): FarmMenuValue {
  const value = useContext(FarmMenuContext);
  if (!value) {
    throw new Error("useFarmMenu must be used inside FarmMenuProvider.");
  }
  return value;
}

const storageKey = (userId: string) => `farmer360:activeFarm:${userId}`;

export function FarmMenuProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [farms, setFarms] = useState<FarmSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFarmId, setActiveId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const saved = window.localStorage.getItem(storageKey(userId));
    return saved ? Number(saved) || null : null;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(storageKey(userId));
      setActiveId(saved ? Number(saved) || null : null);
    }
  }, [userId]);

  const reload = useCallback(async () => {
    try {
      const next = await listMyFarms();
      setFarms(next);
    } catch {
      // The dropdown simply stays as-is; the farm page surfaces load errors.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const setActiveFarm = useCallback(
    (id: number | null) => {
      setActiveId(id);
      if (typeof window !== "undefined") {
        if (id === null) window.localStorage.removeItem(storageKey(userId));
        else window.localStorage.setItem(storageKey(userId), String(id));
      }
    },
    [userId],
  );

  const activeFarmName = farms.find((f) => f.id === activeFarmId)?.name ?? null;

  return (
    <FarmMenuContext.Provider
      value={{ farms, activeFarmId, activeFarmName, loading, setActiveFarm, reload }}
    >
      {children}
    </FarmMenuContext.Provider>
  );
}

const rowClass =
  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2.5 text-left text-[13px] text-ink transition-colors hover:bg-paper";

/**
 * One row per farm; the active farm is checked and disabled. Selecting a farm
 * switches the desk-wide context and opens the farm-records page on it.
 * `variant="dropdown"` renders Radix menu items, `variant="rows"` plain
 * buttons for the mobile bottom sheet.
 */
export function FarmSwitchItems({
  variant = "dropdown",
  onNavigate,
}: {
  variant?: "dropdown" | "rows";
  onNavigate?: () => void;
}) {
  const { farms, activeFarmId, setActiveFarm, loading } = useFarmMenu();
  const navigate = useNavigate();

  function pick(id: number) {
    setActiveFarm(id);
    onNavigate?.();
    void navigate({ to: "/desk/farm" });
  }

  const label =
    variant === "dropdown" ? (
      <DropdownLabel className="px-2.5 pb-1 font-mono text-[9px] tracking-[0.14em] text-muted uppercase">
        Farms
      </DropdownLabel>
    ) : (
      <p className="px-2.5 pb-1 pt-2 font-mono text-[9px] tracking-[0.14em] text-muted uppercase">
        Farms
      </p>
    );

  return (
    <>
      {label}
      {loading ? (
        <p className="px-2.5 py-2 text-[12px] text-muted">Loading your farms…</p>
      ) : farms.length === 0 ? (
        <p className="px-2.5 py-2 text-[12px] leading-snug text-muted">
          No farms yet — add your first one below.
        </p>
      ) : (
        farms.map((farm) => {
          const active = farm.id === activeFarmId;
          const content = (
            <>
              <span className="grid size-7 shrink-0 place-items-center rounded-md border border-line bg-paper text-muted">
                <Tractor className="size-3.5" strokeWidth={1.7} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-semibold text-ink">
                  {farm.name}
                  {farm.archived ? " (archived)" : ""}
                </span>
                <span className="block truncate font-mono text-[9px] tracking-[0.06em] text-muted uppercase">
                  {farm.farmType}
                  {farm.district ? ` · ${farm.district}` : ""}
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
                key={farm.id}
                disabled={active}
                onSelect={(event) => {
                  event.preventDefault();
                  pick(farm.id);
                }}
                className="gap-2.5"
              >
                {content}
              </DropdownItem>
            );
          }
          return (
            <button
              key={farm.id}
              type="button"
              disabled={active}
              onClick={() => pick(farm.id)}
              className={cn(rowClass, active && "bg-primary-soft")}
            >
              {content}
            </button>
          );
        })
      )}
      {variant === "dropdown" ? (
        <DropdownItem asChild>
          <Link to="/desk/farm" search={{ new: 1 }} onClick={onNavigate}>
            <Plus className="size-3.5" /> Add a new farm
          </Link>
        </DropdownItem>
      ) : (
        <Link to="/desk/farm" search={{ new: 1 }} className={rowClass} onClick={onNavigate}>
          <Plus className="size-3.5" /> Add a new farm
        </Link>
      )}
    </>
  );
}
