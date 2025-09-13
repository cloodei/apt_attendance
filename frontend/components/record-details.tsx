"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, Search, Users, X } from "lucide-react";

type Status = "present" | "absent" | "pending";

export interface RecordDetailsProps {
  session: {
    id: string;
    className: string;
    dateISO: string;
    totalStudents: number;
    presentStudents: number;
    duration: number;
  };
  students: Array<{
    id: string;
    name: string;
    email: string;
    status: Status;
    lastSeenISO?: string;
    confidence?: number;
  }>;
}

export default function RecordDetails({ session, students }: RecordDetailsProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");

  const dateStr = useMemo(() =>
    new Intl.DateTimeFormat(undefined, { dateStyle: "full", timeStyle: undefined }).format(new Date(session.dateISO)),
  [session.dateISO]);

  const percent = Math.round((session.presentStudents / session.totalStudents) * 100);

  const filtered = useMemo(() => {
    return students.filter(s => {
      const matchesQuery = `${s.name} ${s.email}`.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = statusFilter === "all" ? true : s.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [students, query, statusFilter]);

  const counts = useMemo(() => {
    let present = 0, absent = 0, pending = 0;
    for (const s of students) {
      if (s.status === "present") present++;
      else if (s.status === "absent") absent++;
      else pending++;
    }
    return { present, absent, pending };
  }, [students]);

  return (
    <div className="space-y-6">
      <Card className="border-0 bg-card/60 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl flex flex-wrap items-center gap-3">
            {session.className}
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {session.totalStudents} students
            </Badge>
          </CardTitle>
          <CardDescription>
            {dateStr} • {session.duration} minutes • {percent}% attendance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Stat label="Present" value={counts.present} color="text-emerald-600" />
            <Stat label="Absent" value={counts.absent} color="text-rose-600" />
            <Stat label="Pending" value={counts.pending} color="text-amber-600" />
          </div>

          <div className="mt-4 h-2 w-full rounded-full bg-muted/40 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 via-primary to-foreground/80 rounded-full" style={{ width: `${percent}%` }} />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search students by name or email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <FilterChip label="All" active={statusFilter === "all"} onClick={() => setStatusFilter("all")} />
          <FilterChip label="Present" active={statusFilter === "present"} onClick={() => setStatusFilter("present")} />
          <FilterChip label="Absent" active={statusFilter === "absent"} onClick={() => setStatusFilter("absent")} />
          <FilterChip label="Pending" active={statusFilter === "pending"} onClick={() => setStatusFilter("pending")} />
        </div>
      </div>

      <Card className="border-0 bg-card/60 backdrop-blur-md">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-lg">Students</CardTitle>
          <CardDescription>{filtered.length} shown</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-border/60">
            {filtered.map((s, idx) => (
              <motion.li
                key={s.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.02 }}
                className="p-4 sm:p-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <Avatar className="size-10">
                      <AvatarFallback>{initials(s.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{s.name}</div>
                      <div className="text-sm text-muted-foreground truncate">{s.email}</div>
                    </div>
                  </div>

                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={s.status} />
                      {s.lastSeenISO && (
                        <span className="text-xs text-muted-foreground">last seen {formatTime(s.lastSeenISO)}</span>
                      )}
                    </div>

                    <div className="hidden sm:flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Confidence</span>
                      <div className="h-1.5 w-28 rounded-full bg-muted/40 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${barColor(s.confidence)}`}
                          style={{ width: `${Math.round((s.confidence ?? 0) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-8 text-right">
                        {s.confidence ? Math.round(s.confidence * 100) : 0}%
                      </span>
                    </div>

                    <div className="sm:justify-self-end">
                      {s.status === "present" ? (
                        <Badge className="bg-emerald-600 text-white"><Check className="w-3.5 h-3.5 mr-1" /> Verified</Badge>
                      ) : s.status === "absent" ? (
                        <Badge className="bg-rose-600 text-white"><X className="w-3.5 h-3.5 mr-1" /> Not found</Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </motion.li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-lg border bg-background/50 px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-xl font-semibold ${color ?? ""}`}>{value}</div>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return (
    <Button
      size="sm"
      variant={active ? "default" : "secondary"}
      className={`rounded-full px-3 ${active ? "" : "bg-muted/60"}`}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

function StatusBadge({ status }: { status: Status }) {
  if (status === "present") return <Badge className="bg-emerald-600 text-white">Present</Badge>;
  if (status === "absent") return <Badge className="bg-rose-600 text-white">Absent</Badge>;
  return <Badge variant="secondary">Pending</Badge>;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "");
}

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(d);
  } catch {
    return "-";
  }
}

function barColor(conf?: number) {
  const v = (conf ?? 0);
  if (v >= 0.9) return "bg-emerald-500";
  if (v >= 0.75) return "bg-yellow-500";
  return "bg-rose-500";
}
