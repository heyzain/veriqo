import { Skeleton } from "@/components/ui/skeleton";

export default function NewTestRunLoading() {
  return (
    <div className="flex max-w-3xl animate-pulse flex-col gap-8">
      <Skeleton className="h-4 w-24" />
      <div className="flex flex-col gap-2 border-b border-subtle pb-6">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </div>
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  );
}
