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
      <div className="px-4 py-6">
        <h2 className="text-[31px] leading-9 font-extrabold tracking-tight">{title}</h2>
        {updated ? <p className="mt-1 text-[15px] text-muted">Last updated {updated}</p> : null}
        <div className="mt-6 space-y-4 text-[15px] leading-6 text-foreground/90 [&_h3]:pt-4 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-2">
          {children}
        </div>
      </div>
    </>
  );
}
