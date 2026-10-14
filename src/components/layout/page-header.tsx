import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { BackButton } from "./back-button";

/** Sticky, frosted page header used at the top of every column. */
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
    <header className={cn("glass sticky top-0 z-30 border-b border-border", className)}>
      {title ? (
        <div className="flex h-[53px] items-center gap-6 px-4">
          {back ? <BackButton fallbackHref={back} /> : null}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl leading-6 font-bold">{title}</h1>
            {subtitle ? <p className="truncate text-[13px] text-muted">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </header>
  );
}

/** Round 36px icon button style for header actions. */
export const iconButton =
  "flex size-9 items-center justify-center rounded-full transition-colors hover:bg-white/10";
