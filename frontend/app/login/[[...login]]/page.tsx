"use client";

import { ThemeToggler } from "@/components/toggler";
import { CustomSignIn } from "./custom-signin";
import { useUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { useSetUser } from "@/stores/user_store";
import { API_BASE } from "@/lib/utils";

export default function Page() {
  const { user } = useUser();
  const setUser = useSetUser();

  if (user) {
    fetch(`${API_BASE}/api/users/${user.username}`, { credentials: "include" })
      .then(res => res.json())
      .then(res => {
        setUser(res);
        redirect("/dashboard");
      })
      .catch(err => console.error(err));
  }
  else return (
    <div className="min-h-[calc(100%-64px)] relative">
      <ThemeToggler className="fixed top-2 right-2" />

      <div className="w-full px-4 pb-5 lg:pb-8 pt-8 lg:pt-12">
        <CustomSignIn />
      </div>
    </div>
  );
}
