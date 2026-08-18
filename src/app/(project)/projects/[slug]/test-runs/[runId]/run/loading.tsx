import { Skeleton } from "@/components/ui/skeleton";

export default function RunExecutionLoading() {
  return (
    <div className="flex max-w-3xl animate-pulse flex-col gap-6">
      <div className="flex flex-col gap-3 border-b border-subtle pb-5">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-72 max-w-full" />
        <Skeleton className="h-1.5 w-full rounded-pill" />
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-11 w-full" />
        ))}
      </div>
    </div>
  );
}
