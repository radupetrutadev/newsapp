import Link from "next/link";
import { SourceRow } from "@/components/source/source-row";
import { getSources, getTrends } from "@/lib/data";
import { site } from "@/lib/site";
import { storyCount } from "@/lib/utils";
import { SidebarSearch } from "./sidebar-search";

export async function RightSidebar() {
  const [trends, sources] = await Promise.all([getTrends(), getSources()]);

  return (
    <div className="no-scrollbar sticky top-0 flex h-dvh flex-col gap-4 overflow-y-auto pb-16 *:shrink-0">
      <SidebarSearch />

      <section className="overflow-hidden rounded-2xl border border-border">
        <h2 className="px-4 pt-3 pb-1 text-xl font-extrabold">What&apos;s happening</h2>
        {trends.slice(0, 5).map((trend) => (
          <Link
            key={trend.id}
            href={`/search?q=${encodeURIComponent(trend.topic.replace(/^#/, ""))}`}
            className="block px-4 py-3 transition-colors hover:bg-white/[0.03]"
          >
            <p className="flex items-center gap-1.5 text-[13px] text-muted">
              {trend.context.includes("Live") ? (
                <span className="size-1.5 rounded-full bg-live" />
              ) : null}
              {trend.context}
            </p>
            <p className="text-[15px] font-bold">{trend.topic}</p>
            <p className="text-[13px] text-muted">{storyCount(trend.postsCount)}</p>
          </Link>
        ))}
        <Link
          href="/explore"
          className="block px-4 py-4 text-[15px] text-accent transition-colors hover:bg-white/[0.03]"
        >
          Show more
        </Link>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border">
        <h2 className="px-4 pt-3 pb-1 text-xl font-extrabold">Sources to follow</h2>
        {sources.slice(0, 3).map((source) => (
          <SourceRow key={source.id} source={source} />
        ))}
        <Link
          href="/explore#sources"
          className="block px-4 py-4 text-[15px] text-accent transition-colors hover:bg-white/[0.03]"
        >
          Show more
        </Link>
      </section>

      <footer className="flex flex-wrap gap-x-3 gap-y-1 px-4 text-[13px] text-muted">
        <Link href="/about" className="hover:underline">
          About
        </Link>
        <Link href="/terms" className="hover:underline">
          Terms of Service
        </Link>
        <Link href="/privacy" className="hover:underline">
          Privacy Policy
        </Link>
        <Link href="/settings" className="hover:underline">
          Settings
        </Link>
        <span>© 2026 {site.name}</span>
      </footer>
    </div>
  );
}
