import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export default function NotFoundRecord() {
  return (
    <div className="mx-auto max-w-xl text-center space-y-4 py-16">
      <h1 className="text-2xl font-semibold">Record not found</h1>
      <p className="text-muted-foreground">
        The attendance record you are looking for does not exist or has been removed.
      </p>
      <div className="pt-2">
        <Link href="/dashboard" className={cn(buttonVariants({ variant: "default" }))}>
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
