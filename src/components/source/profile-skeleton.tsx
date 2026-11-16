import { PageHeader } from "@/components/layout/page-header";
import { FeedSkeleton, Skeleton } from "@/components/ui/skeleton";

export function ProfileSkeleton() {
  return (
    <>
      <PageHeader title={<Skeleton className="h-5 w-36" />} back="/" />
      <div className="mx-4 mt-2 overflow-hidden rounded-3xl border border-border bg-surface md:mx-0">
        <Skeleton className="aspect-[3/1] w-full rounded-none" />
        <div className="space-y-3 px-5 pb-5">
          <Skeleton className="-mt-[9%] size-[clamp(76px,18vw,112px)] rounded-full bg-elevated ring-4 ring-surface" />
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
      <div className="pt-4">
        <FeedSkeleton count={2} />
      </div>
    </>
  );
}

export function StorySkeleton() {
  return (
    <div className="space-y-4 px-4 pt-4 md:px-0" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-6 w-24 rounded-full" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-3/4" />
      <Skeleton className="h-5 w-full" />
      <div className="flex items-center gap-3 border-y border-border py-4">
        <Skeleton className="size-11 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3.5 w-24" />
        </div>
      </div>
      <Skeleton className="aspect-video w-full rounded-2xl" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
}
