import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

/** Shown instantly while a patient / flow screen loads. */
export default function FlowLoading() {
  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 pt-16" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-64" />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}
