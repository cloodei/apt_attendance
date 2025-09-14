"use client";

import { useEffect } from "react";
import { useUser as useClerkUser } from "@clerk/nextjs";
import { useSetUser } from "@/stores/user_store";
import { apiGetUserByAccount } from "@/lib/api";

export function UserBootstrapper() {
  const { user, isLoaded } = useClerkUser();
  const setUser = useSetUser();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!isLoaded)
        return;

      if (!user) {
        setUser(null);
        return;
      }

      try {
        const u = await apiGetUserByAccount(user.username!);
        if (!cancelled)
          setUser(u);
      }
      catch {
        if (!cancelled)
          setUser(null);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, user, setUser]);

  return null;
}
