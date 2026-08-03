import { Skeleton } from "@/components/ui/skeleton";

export function ColaboradoresSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}