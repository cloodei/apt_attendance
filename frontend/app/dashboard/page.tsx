"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Users, BookOpen, Plus, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BentoGridItem } from "@/components/mvpblocks/bento-grid-1";
import { listClasses, getClassRoster, listSessionsForClass } from "@/lib/data";

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

export default function DashboardPage() {
  const classes = listClasses();

  return (
    <div className="space-y-8 mt-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Your Classes</h1>
        <Link href="/dashboard/classes/new">
          <Button className="gap-2 login-btn dark:text-neutral-200 text-neutral-100">
            <Plus className="w-4 h-4" />
            Create Class
          </Button>
        </Link>
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
      >
        {classes.map((cls, idx) => {
          const roster = getClassRoster(cls.id);
          const sessions = listSessionsForClass(cls.id);

          return (
            <motion.div key={cls.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: idx * 0.04 }}>
              <Link href={`/dashboard/classes/${cls.id}`} className="group block">
                <BentoGridItem
                  title={cls.name}
                  description={cls.subject}
                  content={(
                    <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5"><Users className="w-4 h-4" /> {roster.length} students</span>
                      <span className="inline-flex items-center gap-1.5"><BookOpen className="w-4 h-4" /> {sessions.length} sessions</span>
                    </div>
                  )}
                  icon={<Code className="size-6" />}
                />
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
