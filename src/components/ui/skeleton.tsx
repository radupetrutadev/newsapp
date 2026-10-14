import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-white/[0.07]", className)} />;
}

export function ArticleSkeleton() {
  return (
    <div className="flex gap-3 border-b border-border px-4 py-3">
      <Skeleton className="size-10 shrink-0 rounded-lg" />
      <div className="flex-1 space-y-2.5 pt-1">
        <Skeleton className="h-3.5 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="mt-3 aspect-video w-full rounded-2xl" />
        <div className="flex justify-between pt-1">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-4 w-10" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function FeedSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <ArticleSkeleton key={i} />
      ))}
    </div>
  );
}
