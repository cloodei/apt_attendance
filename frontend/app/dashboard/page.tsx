import Link from "next/link";
import { Plus } from "lucide-react";
import { Suspense } from "react";
import { currentUser } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";
import { apiListClassesWithCounts } from "@/lib/api";
import { ClassList, ClassListSkeleton } from "./class_list";

export default function DashboardPage() {
  return (
    <div className="space-y-8 mt-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Your Classes</h1>
        <Link href="/dashboard/classes/new">
          <Button className="gap-2 login-btn dark:text-neutral-200 text-neutral-100">
            <Plus className="w-4 h-4" />
            Create Class
          </Button>
        </Link>
      </div>

      <Suspense fallback={<ClassListSkeleton />}>
        <ClassListWrapper />
      </Suspense>
    </div>
  );
}

async function ClassListWrapper() {
  const account = await currentUser();
  const classes = await apiListClassesWithCounts(account?.username ?? "");

  return <ClassList classes={classes} />;
}
