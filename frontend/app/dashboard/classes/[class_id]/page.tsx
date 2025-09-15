"use client";

import Link from "next/link";
import { toast } from "sonner";
import { motion } from "motion/react";
import { use, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Camera, BarChart3, Play, Users, Clock, Square } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { API_BASE } from "@/lib/utils";
import { WebRTCClient, stopWebRTCConnection } from "@/components/webrtc-client";
import { AttendanceHistoryTab } from "@/components/att-history";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiGetClass, apiGetClassRoster, apiStartSession } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";


async function datas(classId: number) {
  const d = await Promise.all([
    apiGetClass(classId),
    apiGetClassRoster(classId),
  ]);
  return d;
}

export default function ClassDetailPage({ params }: { params: Promise<{ class_id: string }> }) {
  const { class_id } = use(params);
  const classId = Number(class_id);

  const { data, isFetching, error } = useQuery({
    queryKey: [`cls-${classId}`],
    queryFn: () => datas(classId),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: false,
  });
  const queryClient = useQueryClient();

  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [endTimeISO, setEndTimeISO] = useState<string | null>(null);
  const [isTakingAttendance, setIsTakingAttendance] = useState(false);
  const [activeTab, setActiveTab] = useState<"live" | "history">("live");

  useEffect(() => {
    function beforeUnload(e: BeforeUnloadEvent) {
      if (!isTakingAttendance)
        return;

      e.preventDefault();
      e.returnValue = "";
    }
    if (isTakingAttendance)
      window.addEventListener("beforeunload", beforeUnload);
      
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [isTakingAttendance]);

  useEffect(() => {
    if (!isTakingAttendance || !sessionId)
      return;

    const url = `${API_BASE}/api/sessions/${sessionId}/events`;
    const es = new EventSource(url);

    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as { name?: string; action?: string; time?: string };
        const when = data.time ? new Date(data.time) : new Date();
        const timeStr = new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(when);
        const who = data.name || "A student";
        const action = data.action === "out" ? "checked out" : "checked in";
        toast.success(`${who} ${action} at ${timeStr}`);
      }
      catch (e) {
        console.error(e);
      }
    };

    es.onerror = (e) => {
      console.error(e);
    };

    return () => {
      es.close();
    };
  }, [isTakingAttendance, sessionId]);

  function isValidTime(hh: string, mm: string) {
    const h = Number(hh);
    const m = Number(mm);
    const time = new Date();

    if ((!Number.isInteger(h) || !Number.isInteger(m)) || (h < time.getHours() && m <= time.getMinutes()))
      return false;

    return h >= 0 && h <= 23 && m >= 0 && m <= 59;
  }

  async function startAttendance() {
    if (!isValidTime(hour, minute)) {
      toast.error("Please enter a valid time (HH and MM)");
      return;
    }

    try {
      const session = await apiStartSession(classId, Number(hour), Number(minute));
      toast.success("Created attendance session, connecting to take attendance soon...");
      setSessionId(session.id);
      setEndTimeISO(session.end_time);
      setIsTakingAttendance(true);
      queryClient.invalidateQueries({ queryKey: ["cls-sessions", classId] });
    }
    catch (e: any) {
      toast.error(e.message || "Failed to start session");
    }
  }

  if (isFetching || !data)
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Classes
          </Link>
        </div>
        <Card className="border-0 bg-card/60 backdrop-blur-md"><CardHeader><CardTitle>Loading…</CardTitle></CardHeader></Card>
      </div>
    )

  const [cls, roster] = data;
  const title = cls?.name ?? "Class";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Classes
        </Link>
      </div>

      <Card className="border-0 bg-card/60 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl flex flex-wrap items-center gap-3">
            {title}
            {cls?.subject && (
              <span className="text-sm text-muted-foreground"> {cls.subject}</span>
            )}
          </CardTitle>
          <CardDescription>
            <span className="inline-flex items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Users className="w-4 h-4" /> {roster.length} students</span>
            </span>
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "live" | "history")} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 bg-card/50 backdrop-blur-sm text-neutral-800/30" style={{ outline: "1px solid #262626" }}>
          <TabsTrigger value="live" className="flex items-center gap-2 cursor-pointer">
            <Camera className="w-4 h-4" />
            Live Attendance
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2 cursor-pointer">
            <BarChart3 className="w-4 h-4" />
            Attendance History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="live" forceMount className="space-y-6">
          {isTakingAttendance ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <Card className="border-0 bg-card/50 backdrop-blur-sm h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="w-5 h-5" />
                    Live Face Recognition
                  </CardTitle>
                  <CardDescription>
                    Camera is actively scanning for faces. Students will be automatically marked as present.
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <WebRTCClient students={roster} sessionId={sessionId ?? undefined} endTimeISO={endTimeISO ?? undefined} />
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center py-12"
            >
              <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-foreground/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Clock className="w-12 h-12 text-primary" />
              </div>

              <h3 className="text-2xl font-semibold mb-2">Set start time</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Enter the end time (24h) for today's session. Date will be set to today automatically.
              </p>

              <div className="flex items-center justify-center gap-3 mb-6">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="HH"
                    inputMode="numeric"
                    max={23}
                    value={hour}
                    onChange={(e) => setHour(e.target.value.replace(/[^0-9]/g, '').slice(0,2))}
                    className="w-20 text-center"
                  />
                  <span className="text-lg font-semibold">:</span>
                  <Input
                    placeholder="MM"
                    inputMode="numeric"
                    max={59}
                    value={minute}
                    onChange={(e) => setMinute(e.target.value.replace(/[^0-9]/g, '').slice(0,2))}
                    className="w-20 text-center"
                  />
                </div>
              </div>

              <Button
                onClick={startAttendance}
                disabled={!isValidTime(hour, minute)}
                className="bg-gradient-to-r from-primary to-foreground/80 hover:from-primary hover:to-foreground text-white px-8 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-60"
              >
                <Play className="w-5 h-5 mr-2" />
                Start Attendance Session
              </Button>
            </motion.div>
          )}
        </TabsContent>

        <AttendanceHistoryTab active={activeTab === "history"} classId={classId} className={title} baseHref={`/dashboard/classes/${classId}/sessions`} />
      </Tabs>

      {isTakingAttendance && (
        <div className="fixed bottom-4 right-4 z-50 rounded-xl border bg-card/80 backdrop-blur px-4 py-3 shadow-lg flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-block size-2 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-sm">Recording in progress</span>
          </div>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              stopWebRTCConnection();
              setIsTakingAttendance(false);
            }}
            className="gap-2"
          >
            <Square className="w-3.5 h-3.5" /> Stop
          </Button>
        </div>
      )}
    </div>
  );
}
