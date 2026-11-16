import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { VerifiedBadge } from "@/components/ui/verified-badge";

export interface ProfileMeta {
  icon: LucideIcon;
  content: ReactNode;
}

/** A profile's top card: banner, avatar, name, bio, details and stats. */
export function ProfileHeader({
  banner,
  avatar,
  actions,
  name,
  verified,
  handle,
  bio,
  meta,
  stats,
}: {
  banner: ReactNode;
  avatar: ReactNode;
  actions?: ReactNode;
  name: string;
  verified?: "person" | "source" | null;
  handle: string;
  bio?: ReactNode;
  meta: ProfileMeta[];
  /** `key` is needed when the label isn't a plain string. */
  stats: { label: ReactNode; value: ReactNode; key?: string }[];
}) {
  return (
    <section className="mx-4 mt-2 overflow-hidden rounded-3xl border border-border bg-surface md:mx-0">
      <div className="relative aspect-[3/1] w-full overflow-hidden bg-elevated">
        {banner}
        <div className="absolute inset-0 bg-gradient-to-t from-surface/80 to-transparent" />
      </div>
      <div className="px-5 pb-5">
        <div className="flex items-end justify-between gap-3">
          <div className="-mt-[9%] [&>*]:size-[clamp(76px,18vw,112px)]! [&>*]:text-[clamp(28px,7vw,42px)]! [&>*]:ring-4 [&>*]:ring-surface">
            {avatar}
          </div>
          {actions ? <div className="flex items-center gap-2 pb-1">{actions}</div> : null}
        </div>

        <div className="mt-4">
          <h2 className="flex items-center gap-1.5 font-display text-[28px] leading-8 font-bold tracking-tight">
            {name}
            {verified ? <VerifiedBadge variant={verified} className="size-5" /> : null}
          </h2>
          <p className="mt-0.5 text-[14px] text-muted">@{handle}</p>
        </div>

        {bio ? <p className="mt-3 text-[15px] leading-6 text-foreground/85">{bio}</p> : null}

        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[14px] text-muted">
          {meta.map(({ icon: Icon, content }, index) => (
            <li key={index} className="flex items-center gap-1.5">
              <Icon className="size-4" /> {content}
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-wrap gap-2">
          {stats.map((stat) => (
            <span
              key={stat.key ?? String(stat.label)}
              className="rounded-xl border border-border bg-background/50 px-3.5 py-2 text-[13px] text-muted"
            >
              <span className="mr-1 font-display text-[17px] font-semibold text-foreground">{stat.value}</span>
              {stat.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
