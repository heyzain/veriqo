import { Skeleton } from "@/components/ui/skeleton";

export default function TestRunDetailLoading() {
  return (
    <div className="flex max-w-5xl animate-pulse flex-col gap-8">
      <Skeleton className="h-4 w-24" />
      <div className="flex flex-col gap-3 border-b border-subtle pb-6">
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
        <Skeleton className="h-2.5 w-full rounded-pill" />
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-3 lg:col-span-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-32 w-full rounded-lg" />
          ))}
        </div>
        <div className="flex flex-col gap-6">
          <Skeleton className="h-48 w-full rounded-md" />
          <Skeleton className="h-24 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}
