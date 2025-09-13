import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingRecord() {
  return (
    <div className="space-y-6">
      <div className="h-5 w-40 text-muted-foreground">
        <Skeleton className="h-5 w-40" />
      </div>

      <div className="rounded-xl border bg-card/60 backdrop-blur-md p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-6 w-28" />
        </div>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
        <div className="mt-4">
          <Skeleton className="h-2 w-full" />
        </div>
      </div>

      <div className="rounded-xl border bg-card/60 backdrop-blur-md p-0">
        <div className="border-b p-6">
          <Skeleton className="h-5 w-28" />
        </div>
        <ul>
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="p-5 border-t">
              <div className="flex items-center gap-4">
                <Skeleton className="size-10 rounded-full" />
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Skeleton className="h-4 w-48" />
                    <div className="mt-2"><Skeleton className="h-3 w-40" /></div>
                  </div>
                  <div className="hidden sm:block">
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <div className="sm:justify-self-end">
                    <Skeleton className="h-6 w-24" />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
