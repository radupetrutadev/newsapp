import type { ReactNode } from "react";
import { PageHeader } from "./page-header";

/** Simple long-form page for About, Terms and Privacy. */
export function ProsePage({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <>
      <PageHeader title={title} back="/" />
      <div className="px-4 py-6 md:px-0">
        <h2 className="font-display text-[36px] leading-[1.1] font-bold tracking-[-0.03em]">{title}</h2>
        {updated ? <p className="kicker mt-3 text-muted">Last updated {updated}</p> : null}
        <div className="mt-8 space-y-4 text-[16px] leading-7 text-foreground/85 [&_a]:font-medium [&_h3]:pt-4 [&_h3]:font-display [&_h3]:text-[22px] [&_h3]:font-semibold [&_h3]:tracking-tight [&_h3]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_li]:marker:text-accent [&_strong]:text-foreground [&_ul]:space-y-2">
          {children}
        </div>
      </div>
    </>
  );
}
