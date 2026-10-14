import { PageHeader } from "@/components/layout/page-header";
import { FeedSkeleton, Skeleton } from "@/components/ui/skeleton";

export function ProfileSkeleton() {
  return (
    <>
      <PageHeader title={<Skeleton className="h-5 w-36" />} back="/" />
      <Skeleton className="aspect-[3/1] w-full rounded-none" />
      <div className="space-y-3 px-4 pt-3 pb-4">
        <Skeleton className="-mt-[12%] size-[clamp(80px,22vw,134px)] rounded-full bg-elevated ring-4 ring-black" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-full" />
      </div>
      <FeedSkeleton count={2} />
    </>
  );
}

export function StorySkeleton() {
  return (
    <div className="space-y-4 px-4 pt-3" aria-busy="true" aria-label="Loading">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3.5 w-20" />
        </div>
      </div>
      <Skeleton className="h-7 w-full" />
      <Skeleton className="h-7 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="aspect-video w-full rounded-2xl" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
}
