"use client";

import { Star } from "lucide-react";
import { motion } from "motion/react";
import { LogOutBtn } from "./out-btn";
import { ThemeToggler } from "./toggler";

export function Header() {
  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 w-[85%] sm:w-[468px] max-w-4xl z-50">
      <div className="bg-card/50 backdrop-blur-xl border rounded-full w-full h-9 lg:h-[42px] flex items-center justify-between px-4 shadow-md">
        <LogOutBtn />

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="inline-flex items-center gap-3 px-4 py-3 text-sm font-medium"
        >
          <div>
            <p>APT Attendance System</p>
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
