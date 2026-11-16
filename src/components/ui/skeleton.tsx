import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-white/[0.06]", className)} />;
}

/** Placeholder shaped like an ArticleCard. */
export function ArticleSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <Skeleton className="aspect-[16/8] w-full rounded-none" />
      <div className="space-y-3 p-4 sm:p-5">
        <div className="flex items-center gap-2.5">
          <Skeleton className="size-8 shrink-0 rounded-lg" />
          <Skeleton className="h-3.5 w-40" />
        </div>
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3.5 w-5/6" />
      </div>
    </div>
  );
}

export function FeedSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-3 px-4 md:px-0">
      {Array.from({ length: count }, (_, i) => (
        <ArticleSkeleton key={i} />
      ))}
    </div>
  );
}
