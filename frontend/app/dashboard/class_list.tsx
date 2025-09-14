"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Users, BookOpen, Code } from "lucide-react";
import { ClassSummary } from "@/lib/types";
import { BentoGridItem } from "@/components/mvpblocks/bento-grid-1";
import { TypeWriter } from "@/components/ui/typewriter";

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1
    }
  }
}

export function ClassList({ classes }: { classes: ClassSummary[] }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
    >
      {classes.length > 0 ? classes.map((cls, idx) => (
        <motion.div key={cls.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: idx * 0.04 }}>
          <Link href={`/dashboard/classes/${cls.id}`} className="group block">
            <BentoGridItem
              title={cls.name}
              description={cls.subject}
              content={(
                <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><Users className="w-4 h-4" /> {cls.roster_count} students</span>
                  <span className="inline-flex items-center gap-1.5"><BookOpen className="w-4 h-4" /> {cls.sessions_count} sessions</span>
                </div>
              )}
              className="dark:shadow-[0_24px_60px_rgb(255,255,255,0.04)]"
              icon={<Code className="size-6" />}
            />
          </Link>
        </motion.div>
      )) : (
        <div className="mt-8 mx-auto flex justify-center items-center col-span-full">
          <TypeWriter
            words="No classes found"
            className="bg-gradient-to-r tracking-tighter from-sky-400/60 dark:from-sky-300 via-cyan-500/50 to-rose-400 bg-clip-text text-5xl font-bold text-transparent"
          />
        </div>
      )}
    </motion.div>
  );
}

export function ClassListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border/30 p-6 bg-card/60 animate-pulse">
          <div className="h-5 w-1/2 bg-muted/50 rounded mb-3" />
          <div className="h-4 w-1/3 bg-muted/40 rounded mb-6" />
          <div className="flex gap-4">
            <div className="h-4 w-24 bg-muted/40 rounded" />
            <div className="h-4 w-24 bg-muted/40 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}
