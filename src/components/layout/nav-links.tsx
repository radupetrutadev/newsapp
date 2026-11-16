"use client";

import Link from "next/link";
import { useUnreadCount } from "@/lib/store/notifications";
import { cn } from "@/lib/utils";
import { WithPathname } from "./current-path";
import { badgeLabel, isActivePath, navItems } from "./nav-items";

/** The top bar's section links, with the current one marked. */
export function NavLinks() {
  return <WithPathname component={NavLinkList} />;
}

/** The top bar's icon buttons (notifications, settings). */
export function NavIconLinks() {
  return <WithPathname component={NavIconList} />;
}

function NavLinkList({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="Primary" className="flex items-center gap-1">
      {navItems
        .filter((item) => item.bar === "link")
        .map(({ href, label }) => {
          const active = isActivePath(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-9 items-center gap-2 rounded-full px-3.5 text-[14px] font-medium transition-colors",
                active
                  ? "bg-white/[0.07] text-foreground"
                  : "text-muted hover:bg-white/[0.04] hover:text-foreground",
              )}
            >
              {active ? <span aria-hidden className="size-1.5 rounded-full bg-accent" /> : null}
              {label}
            </Link>
          );
        })}
    </nav>
  );
}

function NavIconList({ pathname }: { pathname: string | null }) {
  const badges: Record<string, number> = { "/notifications": useUnreadCount() };

  return (
    <nav aria-label="Account" className="flex items-center gap-1">
      {navItems
        .filter((item) => item.bar === "icon")
        .map(({ href, label, icon: Icon }) => {
          const active = isActivePath(pathname, href);
          const badge = badges[href];
          return (
            <Link
              key={href}
              href={href}
              aria-label={badge ? `${label}, ${badge} unread` : label}
              aria-current={active ? "page" : undefined}
              title={label}
              className={cn(
                "relative flex size-10 items-center justify-center rounded-full transition-colors",
                active
                  ? "bg-accent/12 text-accent"
                  : "text-muted hover:bg-white/[0.06] hover:text-foreground",
              )}
            >
              <Icon className="size-5" strokeWidth={active ? 2.3 : 1.9} />
              {badge ? (
                <span
                  aria-hidden
                  className="absolute top-0.5 right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 font-mono text-[10px] font-bold text-on-accent ring-2 ring-background"
                >
                  {badgeLabel(badge)}
                </span>
              ) : null}
            </Link>
          );
        })}
    </nav>
  );
}
