import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DeskLoading, DeskMissingProfile, DeskShell, type DeskSessionValue } from "@/components/desk-shell";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getMyProfile } from "@/lib/market.functions";

export const Route = createFileRoute("/desk")({
  component: DeskLayout,
});

function DeskLayout() {
  const { user, isPending } = useCurrentUserState();
  const [session, setSession] = useState<DeskSessionValue | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    if (isPending) return;
    if (!user) {
      window.location.assign("/login");
      return;
    }
    let alive = true;
    const current = user;
    async function load() {
      try {
        const profile = await getMyProfile();
        if (!alive) return;
        if (!profile) {
          setState("missing");
          return;
        }
        setSession({
          user: current,
          profile,
          reload: async () => {
            const next = await getMyProfile();
            if (next && alive) setSession({ user: current, profile: next, reload: load });
          },
        });
        setState("ready");
      } catch {
        if (alive) setState("missing");
      }
    }
    void load();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isPending]);

  if (isPending || state === "loading") return <DeskLoading />;
  if (state === "missing" || !session) return <DeskMissingProfile email={user?.primaryEmail ?? null} />;
  return (
    <DeskShell session={session}>
      <Outlet />
    </DeskShell>
  );
}
