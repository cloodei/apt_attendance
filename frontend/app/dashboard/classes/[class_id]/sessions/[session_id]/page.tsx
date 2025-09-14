import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import RecordDetails from "@/components/record-details";
import { apiGetClass, apiGetClassRoster, apiListSessionsWithStats, apiListSessionAttendance } from "@/lib/api";

interface PageProps {
  params: Promise<{
    class_id: string;
    session_id: string;
  }>;
}

export default async function SessionDetailsPage({ params }: PageProps) {
  const { class_id, session_id } = await params;
  const classId = Number(class_id);
  const sessionId = Number(session_id);

  const [cls, roster, sessions, entries] = await Promise.all([
    apiGetClass(classId),
    apiGetClassRoster(classId),
    apiListSessionsWithStats(classId),
    apiListSessionAttendance(sessionId),
  ]);

  const sess = sessions.find((s) => s.id === sessionId);
  if (!sess)
    return notFound();

  const start = new Date(sess.start_time);
  const end = new Date(sess.end_time);
  const duration = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));

  const byId = new Map(entries.map(e => [e.student_id, e] as const));

  const sessionMs = Math.max(1, end.getTime() - start.getTime());
  let totalPresenceMs = 0;

  const students = roster.map((r) => {
    const e = byId.get(r.id);
    const inISO = e?.in_time ?? undefined;
    const outISO = e?.out_time ?? undefined;
    const lastISO = outISO || inISO || undefined;

    let status: "present" | "absent" = "absent";
    let verified = false;
    if (inISO) {
      status = "present";
      verified = Boolean(outISO);
    }

    let indivPresenceMs = 0;
    if (inISO && outISO) {
      const tin = new Date(inISO).getTime();
      const tout = new Date(outISO).getTime();
      const ms = Math.max(0, Math.min(tout, end.getTime()) - Math.max(tin, start.getTime()));
      indivPresenceMs = ms;
      totalPresenceMs += ms;
    }

    return {
      id: String(r.id),
      name: r.name,
      studentId: String(r.id),
      status,
      lastSeenISO: lastISO,
      confidence: e?.avg_confidence ?? undefined,
      verified,
      attendancePct: Math.round((indivPresenceMs / sessionMs) * 100),
    } as const;
  });

  const presenceCoveragePct = Math.round((totalPresenceMs / (sessionMs * roster.length)) * 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href={`/dashboard/classes/${class_id}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Class
        </Link>
      </div>

      <RecordDetails
        session={{
          id: String(sess.id),
          className: cls.name,
          dateISO: start.toISOString(),
          totalStudents: sess.total_students,
          presentStudents: sess.present_count,
          duration,
          presenceCoveragePct,
        }}
        students={students as any}
      />
    </div>
  );
}
