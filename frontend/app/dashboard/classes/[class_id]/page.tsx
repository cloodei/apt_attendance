"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { use, useMemo, useState } from "react";
import { ArrowLeft, Camera, BarChart3, Play, Users, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WebRTCClient } from "@/components/webrtc-client";
import { AttendanceHistoryTab } from "@/components/att-history";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getClassById, getClassRoster, listSessionsForClass } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ClassDetailPage({ params }: { params: Promise<{ class_id: string }> }) {
  const { class_id } = use(params);
  const classroom = getClassById(class_id);
  const roster = getClassRoster(class_id);
  const sessions = listSessionsForClass(class_id);

  const [isTakingAttendance, setIsTakingAttendance] = useState(false);

  const startAttendance = () => setIsTakingAttendance(true);

  const title = useMemo(() => classroom?.name ?? "Class", [classroom]);

  if (!classroom)
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Classes
          </Link>
        </div>
        <Card className="border-0 bg-card/60 backdrop-blur-md">
          <CardHeader>
            <CardTitle>Class not found</CardTitle>
            <CardDescription>The class you are looking for does not exist.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )

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
            {classroom?.subject && (
              <span className="text-sm text-muted-foreground">• {classroom.subject}</span>
            )}
          </CardTitle>
          <CardDescription>
            <span className="inline-flex items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Users className="w-4 h-4" /> {roster.length} students</span>
              <span className="inline-flex items-center gap-1.5"><BookOpen className="w-4 h-4" /> {sessions.length} sessions</span>
            </span>
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="live" className="space-y-6">
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

        <TabsContent value="live" className="space-y-6">
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
                  <WebRTCClient />
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
                <Camera className="w-12 h-12 text-primary" />
              </div>

              <h3 className="text-2xl font-semibold mb-2">Ready to Start Attendance</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Click "Start Attendance" to begin the face recognition session for this class.
              </p>

              <Button
                onClick={startAttendance}
                className="bg-gradient-to-r from-primary to-foreground/80 hover:from-primary hover:to-foreground text-white px-8 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Play className="w-5 h-5 mr-2" />
                Start Attendance Session
              </Button>
            </motion.div>
          )}
        </TabsContent>

        <AttendanceHistoryTab sessions={sessions} baseHref={`/dashboard/classes/${class_id}/sessions`} />
      </Tabs>
    </div>
  );
}
