import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage attendance and view live sessions</p>
        </div>
        <Link href="/attendance">
          <Button>Start Attendance</Button>
        </Link>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur p-6">
          <h2 className="text-lg font-medium">Quick Start</h2>
          <p className="text-sm text-muted-foreground mt-1">Begin a new session using the camera to recognize faces in real-time.</p>
          <div className="mt-4">
            <Link href="/attendance">
              <Button variant="secondary">Open Camera</Button>
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur p-6">
          <h2 className="text-lg font-medium">Recent Sessions</h2>
          <p className="text-sm text-muted-foreground mt-1">Your latest attendance sessions will appear here.</p>
          <div className="mt-4 text-sm text-muted-foreground">No sessions yet.</div>
        </div>
      </section>
    </div>
  );
}
