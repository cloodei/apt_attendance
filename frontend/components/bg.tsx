"use client";

import { motion } from "motion/react";

export function Background() {
  return (
    <div className="absolute inset-0 -z-10">
      <div className="pointer-events-none absolute inset-0 top-0 z-0 overflow-hidden">
        <motion.div
          className="absolute -top-20 -left-20 h-[300px] w-[300px] rounded-full bg-gradient-to-br from-primary/30 via-primary/20 to-transparent opacity-50 blur-[100px]"
          animate={{
            x: [0, 100, 0],
            y: [0, 200, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute -top-40 -right-20 h-[500px] w-[500px] rounded-full bg-gradient-to-bl from-primary/30 via-primary/20 to-transparent opacity-50 blur-[100px]"
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-gradient-to-tr from-primary/20 via-primary/10 to-transparent opacity-30 blur-[80px]"
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      <div
        className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:50px_50px] dark:bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] dark:bg-[size:50px_50px]"
      />
    </div>
  );
}
