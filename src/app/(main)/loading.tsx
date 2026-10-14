import { PageHeader } from "@/components/layout/page-header";
import { FeedSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <PageHeader>
        <div className="flex h-[53px] items-center px-4">
          <Skeleton className="h-5 w-32" />
        </div>
      </PageHeader>
      <FeedSkeleton />
    </>
  );
}
