import { Card } from "@/components/ui/card";
import { Skeleton, SkeletonRow } from "@/components/ui/skeleton";

/** Shown instantly while a tab's data loads — the layout doesn't jump when it arrives. */
export default function TabLoading() {
  return (
    <div className="pb-nav-action" aria-busy="true" aria-label="Loading">
      <div className="space-y-2 pt-5 pb-4">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Card className="overflow-hidden">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </Card>
    </div>
  );
}
