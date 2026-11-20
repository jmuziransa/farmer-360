import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getMyProfile, type Profile } from "@/lib/market.functions";

export function useDesk() {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isPending) return;
    if (!user) {
      void navigate({ to: "/login" });
      return;
    }
    void getMyProfile()
      .then(setProfile)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load your profile."));
  }, [user, isPending, navigate]);

  return { user, isPending, profile, error, reload: () => getMyProfile().then(setProfile) };
}
