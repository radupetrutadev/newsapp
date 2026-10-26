"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUnreadCount } from "@/lib/store/notifications";
import { cn } from "@/lib/utils";
import { badgeLabel, isActivePath, navItems } from "./nav-items";

export function MobileNav() {
  const pathname = usePathname();
  const badges: Record<string, number> = { "/notifications": useUnreadCount() };

  return (
    <nav
      aria-label="Primary"
      className="glass fixed inset-x-0 bottom-0 z-40 flex h-[53px] border-t border-border pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
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
              className="flex flex-1 items-center justify-center"
            >
              <span className="relative">
                <Icon
                  className={cn("size-[26px]", active && "fill-foreground/15")}
                  strokeWidth={active ? 2.6 : 1.9}
                />
                {badge ? (
                  <span
                    aria-hidden
                    className="absolute -top-1.5 -right-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border border-black bg-accent px-1 text-[11px] font-bold text-white"
                  >
                    {badgeLabel(badge)}
                  </span>
                ) : null}
              </span>
            </Link>
          );
        })}
    </nav>
  );
}
