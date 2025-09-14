"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Clock, Users, ChevronRight, Percent, UserCheck } from "lucide-react";
import { TypeWriter } from "./ui/typewriter";
import { TabsContent } from "./ui/tabs";
import { Card, CardContent } from "./ui/card";
import type { AttendanceSession } from "@/lib/types";
import { apiListSessionsWithStats } from "@/lib/api";

interface AttendanceHistoryTabProps {
  classId: number;
  className: string;
  baseHref?: string;
}

export function AttendanceHistoryTab({ classId, className, baseHref = "/dashboard" }: AttendanceHistoryTabProps) {
  const { data, isFetching, error } = useQuery({
    queryKey: ["cls-sessions", classId],
    queryFn: () => apiListSessionsWithStats(classId),
    staleTime: 30_000,
  });

  const sessions: AttendanceSession[] = (data ?? []).map((s) => {
    const start = new Date(s.start_time);
    const end = new Date(s.end_time);
    const duration = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
    return {
      id: String(s.id),
      classId: String(classId),
      className,
      date: start,
      totalStudents: s.total_students,
      presentStudents: s.present_count,
      duration,
    } as AttendanceSession;
  });

  return (
    <TabsContent value="history" className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Attendance History</h2>
        <p className="text-sm text-muted-foreground">{isFetching ? "Loading…" : `${sessions.length} records`}</p>
      </div>

      {sessions.length === 0 ? (
        <div className="mt-8 mx-auto flex justify-center items-center col-span-full">
          <TypeWriter
            duration={2}
            words="No attendance sessions yet"
            className="bg-gradient-to-r pb-3 tracking-tighter from-sky-400/60 dark:from-sky-300 via-cyan-500/50 dark:via-cyan-500/80 to-rose-400 bg-clip-text text-5xl font-bold text-transparent"
          />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          {sessions.map((session, idx) => {
            const percent = Math.round((session.presentStudents / session.totalStudents) * 100);
            const mm = session.date.getMonth() + 1;
            const dd = session.date.getDate();
            const yyyy = session.date.getFullYear();

            const date = `${(dd < 10 ? '0' + dd : dd)}/${(mm < 10 ? '0' + mm : mm)}/${yyyy}`;
            const time = `${session.date.getHours()}:${session.date.getMinutes()}`;

            return (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.04 }}
              >
                <Link href={`${baseHref}/${session.id}`} className="group block">
                  <Card className="relative overflow-hidden border-0 bg-card/60 backdrop-blur-md hover:bg-card/80 transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.16)]">
                    <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-primary via-foreground/60 to-primary/60 opacity-70" />
                    <CardContent>
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold tracking-tight group-hover:text-foreground/90 transition-colors">
                            {session.className}
                          </h3>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" />{time}, {date}</span>
                            <span className="inline-flex items-center gap-1.5"><Clock className="size-3.5" /> {session.duration}m</span>
                            <span className="inline-flex items-center gap-1.5"><Users className="size-3.5" /> {session.totalStudents}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="flex items-center justify-end gap-1 text-sm">
                            <UserCheck className="size-3.5 text-emerald-500" />
                            <span className="font-semibold text-emerald-600">{session.presentStudents}</span>
                            <span className="text-muted-foreground">/</span>
                            <span className="text-muted-foreground">{session.totalStudents}</span>
                          </div>
                          <div className="mt-1 flex items-center justify-end text-xs text-muted-foreground">
                            {percent}<Percent className="size-3.5" />
                            <p className="ml-1">attendance</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-emerald-500 to-foreground/80"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                          <span>{session.presentStudents} present</span>
                          <span>{session.totalStudents - session.presentStudents} absent</span>
                        </div>
                      </div>

                      <div className="mt-5 flex items-center justify-end text-sm text-muted-foreground">
                        <span className="group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1.5">
                          View details
                          <ChevronRight className="size-4 pt-0.5" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </TabsContent>
  );
}
