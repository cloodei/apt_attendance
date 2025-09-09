"use client";

import { FaceCamera } from "@/components/face-camera";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import * as React from "react";

export default function AttendancePage() {
  const [status, setStatus] = React.useState<string>("Ready");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Attendance</h1>
          <p className="text-muted-foreground mt-1">Real-time camera preview. Recognition coming from backend.</p>
        </div>
        <Link href="/dashboard">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>

      <FaceCamera label={status} />

      <div className="flex items-center gap-3">
        <Button onClick={() => setStatus("Ready")}>Reset</Button>
        <Button variant="secondary" onClick={() => setStatus("Streaming...")}>Simulate Start</Button>
        <Button variant="ghost" onClick={() => setStatus("Recognizing faces...")}>Simulate Recognize</Button>
      </div>

      <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur p-4 text-sm text-muted-foreground">
        Tip: This page is UI-only. Integrate your backend in a separate directory to perform actual recognition and attendance recording.
      </div>
    </div>
  );
}
