"use client";

import { redirect } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { API_BASE } from "@/lib/utils";
import { useSetUser } from "@/stores/user_store";

export default function Page() {
  const { user } = useUser();
  const setUser = useSetUser();

  if (user) {
    fetch(`${API_BASE}/api/users/${user.username?.toUpperCase()}`)
      .then(res => res.json())
      .then(res => {
        setUser(res);
        redirect("/dashboard");
      })
      .catch(err => console.error(err));
  }
  else redirect("/login");
}
