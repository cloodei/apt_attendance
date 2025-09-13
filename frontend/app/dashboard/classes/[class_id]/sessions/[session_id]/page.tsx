import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import RecordDetails from "@/components/record-details";
import { getAttendanceRecord } from "@/lib/data";

interface PageProps {
  params: Promise<{
    class_id: string;
    session_id: string;
  }>;
}

export default async function SessionDetailsPage({ params }: PageProps) {
  const { class_id, session_id } = await params;
  const record = getAttendanceRecord(session_id);
  if (!record)
    return notFound();
  if (record.session.classId !== class_id)
    return notFound();

  const { session, students } = record;

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
          id: session.id,
          className: session.className,
          dateISO: session.date.toISOString(),
          totalStudents: session.totalStudents,
          presentStudents: session.presentStudents,
          duration: session.duration,
        }}
        students={students.map((s) => ({
          id: s.id,
          name: s.name,
          email: s.email,
          status: s.status,
          lastSeenISO: s.lastSeen ? s.lastSeen.toISOString() : undefined,
          confidence: s.confidence,
        }))}
      />
    </div>
  );
}
