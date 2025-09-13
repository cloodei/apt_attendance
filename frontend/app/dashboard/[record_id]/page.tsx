import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import RecordDetails from "@/components/record-details";
import { getAttendanceRecord } from "@/lib/data";

interface PageProps {
  params: Promise<{ record_id: string }>;
}

export default async function AttendanceRecordPage({ params }: PageProps) {
  const id = (await params).record_id;
  const record = getAttendanceRecord(id);
  if (!record)
    return notFound();

  const { session, students } = record;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
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
