"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { motion } from "motion/react";
import { useEffect } from "react";
import { useUser as useClerkUser } from "@clerk/nextjs";
import { LogOutBtn } from "./out-btn";
import { ThemeToggler } from "./toggler";
import { apiGetUserByAccount } from "@/lib/api";
import { useUser, useSetUser } from "@/stores/user_store";

export function Header() {
  const { user: clerkUser } = useClerkUser();
  const user = useUser();
  const setUser = useSetUser();

  useEffect(() => {
    if (clerkUser && !user)
      apiGetUserByAccount(clerkUser.username!).then(setUser);
    else if (!clerkUser)
      setUser(null);

    return () => setUser(null);
  }, [clerkUser]);

  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 w-[60%] sm:w-[468px] md:w-[600px] lg:w-[768px] max-w-4xl z-50">
      <div className="bg-card/50 backdrop-blur-xl border rounded-full w-full h-9 lg:h-[42px] flex items-center justify-between px-4 shadow-md">
        <LogOutBtn />

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="inline-flex items-center gap-3 px-4 py-3 text-sm font-medium"
        >
          <div className="mr-4 flex gap-3 items-center justify-center">
            <Link href="/dashboard" className="max-sm:text-xs">APT Attendance</Link>

            <p className="pt-0.5 text-xs font-normal dark:text-neutral-50/50 text-neutral-400 max-sm:hidden">{user?.academic_rank} - {user?.name}</p>
          </div>

          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          >
            <Star className="w-4 h-4" />
          </motion.div>
        </motion.div>
        
        <ThemeToggler />
      </div>
    </header>
  );
}
