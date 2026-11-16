import { ArrowUpRight, Flame, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { SourceRow } from "@/components/source/source-row";
import { buttonClasses } from "@/components/ui/button";
import { getSources, getTrends } from "@/lib/data";
import { site } from "@/lib/site";
import { storyCount } from "@/lib/utils";

export async function RightSidebar() {
  const [trends, sources] = await Promise.all([getTrends(), getSources()]);

  return (
    <div className="no-scrollbar sticky top-16 flex h-[calc(100dvh-4rem)] flex-col gap-4 overflow-y-auto pt-6 pb-10 *:shrink-0">
      <RailCard title="Trending" icon={<Flame className="size-4 text-accent" />} more={{ href: "/explore", label: "Explore all" }}>
        <ol className="px-2 pb-1">
          {trends.slice(0, 5).map((trend, index) => (
            <li key={trend.id}>
              <Link
                href={`/search?q=${encodeURIComponent(trend.topic.replace(/^#/, ""))}`}
                className="group flex gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-white/[0.04]"
              >
                <span className="kicker w-6 pt-[3px] text-accent tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] leading-5 font-semibold group-hover:text-accent">
                    {trend.topic}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted">
                    {trend.context.includes("Live") ? <span className="size-1.5 rounded-full bg-live" /> : null}
                    {trend.context} · {storyCount(trend.postsCount)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </RailCard>

      <section className="relative overflow-hidden rounded-2xl border border-accent/25 bg-[radial-gradient(120%_120%_at_100%_0%,rgb(255_106_26/0.22),transparent_60%)] p-5">
        <SlidersHorizontal className="size-5 text-accent" />
        <h2 className="mt-3 font-display text-[19px] leading-6 font-semibold tracking-tight">
          Make the feed yours
        </h2>
        <p className="mt-1 text-[14px] leading-5 text-foreground/70">
          Follow topics and For you puts more of them first.
        </p>
        <Link href="/topics" className={buttonClasses({ size: "sm", className: "mt-4" })}>
          Customize feed
        </Link>
      </section>

      <RailCard title="Sources to follow" more={{ href: "/explore#sources", label: "See all" }}>
        <div className="px-1 pb-1">
          {sources.slice(0, 3).map((source) => (
            <SourceRow key={source.id} source={source} compact />
          ))}
        </div>
      </RailCard>

      <footer className="flex flex-wrap gap-x-3 gap-y-1 px-1 text-[12px] text-muted">
        <Link href="/about" className="hover:text-foreground">
          About
        </Link>
        <Link href="/terms" className="hover:text-foreground">
          Terms
        </Link>
        <Link href="/privacy" className="hover:text-foreground">
          Privacy
        </Link>
        <Link href="/settings" className="hover:text-foreground">
          Settings
        </Link>
        <span>© 2026 {site.name}</span>
      </footer>
    </div>
  );
}

function RailCard({
  title,
  icon,
  more,
  children,
}: {
  title: string;
  icon?: ReactNode;
  more: { href: string; label: string };
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h2 className="flex items-center gap-2 font-display text-[17px] font-semibold tracking-tight">
          {icon}
          {title}
        </h2>
        <Link
          href={more.href}
          className="flex items-center gap-0.5 text-[13px] font-medium text-muted transition-colors hover:text-accent"
        >
          {more.label}
          <ArrowUpRight className="size-3.5" />
        </Link>
      </div>
      {children}
    </section>
  );
}
