import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { BackButton } from "./back-button";

/**
 * The sticky bar at the top of every page: under the top bar on tablets and
 * up, at the very top on phones.
 */
export function PageHeader({
  title,
  subtitle,
  back,
  actions,
  children,
  className,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Show a back button; the value is where to go without browser history. */
  back?: string;
  actions?: ReactNode;
  /** Extra rows rendered under the title row (tabs, search, …). */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("glass sticky top-0 z-30 md:top-16", className)}>
      {title ? (
        <div className="flex h-16 items-center gap-3 px-4 md:px-0">
          {back ? <BackButton fallbackHref={back} /> : null}
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-[22px] leading-7 font-semibold tracking-tight">{title}</h1>
            {subtitle ? <p className="truncate text-[13px] leading-4 text-muted">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </header>
  );
}

/** Round 40px icon button style for header actions. */
export const iconButton =
  "flex size-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-white/[0.06] hover:text-foreground";
