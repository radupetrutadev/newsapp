import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { VerifiedBadge } from "@/components/ui/verified-badge";

export interface ProfileMeta {
  icon: LucideIcon;
  content: ReactNode;
}

/** Banner, overlapping avatar, name, bio, meta and stats — the X profile top. */
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
  verified?: "blue" | "gold" | null;
  handle: string;
  bio?: ReactNode;
  meta: ProfileMeta[];
  /** `key` is needed when the label isn't a plain string. */
  stats: { label: ReactNode; value: ReactNode; key?: string }[];
}) {
  return (
    <section>
      <div className="aspect-[3/1] w-full overflow-hidden bg-elevated">{banner}</div>
      <div className="px-4 pt-3 pb-4">
        <div className="flex items-start justify-between">
          <div className="-mt-[12%] [&>*]:size-[clamp(80px,22vw,134px)]! [&>*]:text-[clamp(30px,8.5vw,51px)]! [&>*]:ring-4 [&>*]:ring-black">
            {avatar}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>

        <div className="mt-3">
          <h2 className="flex items-center gap-1 text-xl leading-6 font-extrabold">
            {name}
            {verified ? <VerifiedBadge variant={verified} className="size-5" /> : null}
          </h2>
          <p className="text-[15px] text-muted">@{handle}</p>
        </div>

        {bio ? <p className="mt-3 text-[15px] leading-5">{bio}</p> : null}

        <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[15px] text-muted">
          {meta.map(({ icon: Icon, content }, index) => (
            <li key={index} className="flex items-center gap-1">
              <Icon className="size-[18px]" /> {content}
            </li>
          ))}
        </ul>

        <div className="mt-3 flex gap-5 text-[15px]">
          {stats.map((stat) => (
            <span key={stat.key ?? String(stat.label)} className="text-muted">
              <span className="font-bold text-foreground">{stat.value}</span> {stat.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
