"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { CalendarDays, Clock, Users, ChevronRight, Percent, UserCheck } from "lucide-react";
import { TabsContent } from "./ui/tabs";
import { Card, CardContent } from "./ui/card";
import { listAttendanceSessions } from "@/lib/data";
import type { AttendanceSession } from "@/lib/types";

interface AttendanceHistoryTabProps {
  sessions?: AttendanceSession[];
  baseHref?: string;
}

export function AttendanceHistoryTab({ sessions, baseHref = "/dashboard" }: AttendanceHistoryTabProps) {
  const attendanceHistory = sessions ?? listAttendanceSessions();

  return (
    <TabsContent value="history" className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Attendance History</h2>
        <p className="text-sm text-muted-foreground">{attendanceHistory.length} records</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
      >
        {attendanceHistory.map((session, idx) => {
          const percent = Math.round((session.presentStudents / session.totalStudents) * 100);
          const date = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(session.date);

          return (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.04 }}
            >
              <Link href={`${baseHref}/${session.id}`} className="group block">
                <Card className="relative overflow-hidden border-0 bg-card/60 backdrop-blur-md hover:bg-card/80 transition-colors">
                  <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-primary via-foreground/60 to-primary/60 opacity-70" />
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold tracking-tight group-hover:text-foreground/90 transition-colors">
                          {session.className}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5"><CalendarDays className="w-4 h-4" /> {date}</span>
                          <span className="inline-flex items-center gap-1.5"><Clock className="w-4 h-4" /> {session.duration}m</span>
                          <span className="inline-flex items-center gap-1.5"><Users className="w-4 h-4" /> {session.totalStudents}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-1 text-sm">
                          <UserCheck className="w-4 h-4 text-emerald-500" />
                          <span className="font-semibold text-emerald-600">{session.presentStudents}</span>
                          <span className="text-muted-foreground">/</span>
                          <span className="text-muted-foreground">{session.totalStudents}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-end gap-1 text-xs text-muted-foreground">
                          <Percent className="w-3 h-3" /> {percent}%
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="h-2 w-full rounded-full bg-muted/40 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-primary to-foreground/80"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{session.presentStudents} present</span>
                        <span>{session.totalStudents - session.presentStudents} absent</span>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-end text-sm text-muted-foreground">
                      <span className="group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                        View details
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </TabsContent>
  );
}
