import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="relative overflow-hidden">
      <div className="relative space-y-16 py-10">
        <div className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 rounded-full text-sm font-medium text-cyan-400 border border-cyan-400/30">
            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
            Aptech Attendance
          </div>

          <h1 className="text-4xl md:text-6xl font-bold font-heading tracking-tighter">
            <span className="bg-gradient-to-r from-foreground via-cyan-400 to-foreground bg-clip-text text-transparent">
              Face Recognition • Real-time • Automated
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            A sleek attendance system powered by live camera streaming and ML-driven face recognition.
          </p>

          <div className="flex items-center justify-center gap-4 pt-2">
            <Link href="/dashboard">
              <Button size="lg">Go to Dashboard</Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg">Sign in</Button>
            </Link>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 via-transparent to-transparent" />
        </div>
      </div>
    </div>
  );
}
