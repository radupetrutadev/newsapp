"use client";

import Link from "next/link";
import { useUnreadCount } from "@/lib/store/notifications";
import { cn } from "@/lib/utils";
import { WithPathname } from "./current-path";
import { badgeLabel, isActivePath, navItems } from "./nav-items";

/** The floating dock on phones, with the current page's link highlighted. */
export function MobileNav() {
  return <WithPathname component={MobileDock} />;
}

function MobileDock({ pathname }: { pathname: string | null }) {
  const badges: Record<string, number> = { "/notifications": useUnreadCount() };

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-3 bottom-[calc(12px+env(safe-area-inset-bottom))] z-40 md:hidden"
    >
      <div className="mx-auto flex h-16 max-w-[420px] items-center justify-around rounded-[22px] border border-border-strong/70 bg-elevated/90 px-2 shadow-[0_12px_40px_rgb(0_0_0/0.6)] backdrop-blur-xl">
        {navItems
          .filter((item) => item.mobile)
          .map(({ href, label, icon: Icon }) => {
            const active = isActivePath(pathname, href);
            const badge = badges[href];
            return (
              <Link
                key={href}
                href={href}
                aria-label={badge ? `${label}, ${badge} unread` : label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-11 w-14 flex-col items-center justify-center gap-1 rounded-2xl transition-colors",
                  active ? "bg-accent text-on-accent" : "text-muted active:bg-white/[0.06]",
                )}
              >
                <Icon className="size-[22px]" strokeWidth={active ? 2.3 : 1.9} />
                {badge ? (
                  <span
                    aria-hidden
                    className="absolute top-0 right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 font-mono text-[10px] font-bold text-on-accent ring-2 ring-background"
                  >
                    {badgeLabel(badge)}
                  </span>
                ) : null}
              </Link>
            );
          })}
      </div>
    </nav>
  );
}
