import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-[440px] flex-col items-center px-8 py-14 text-center">
      {Icon ? (
        <div className="relative mb-6 flex size-16 items-center justify-center rounded-2xl border border-accent/30 bg-accent/10 text-accent">
          <span aria-hidden className="absolute inset-0 -z-10 rounded-2xl bg-accent/30 blur-2xl" />
          <Icon className="size-7" />
        </div>
      ) : null}
      <h2 className="font-display text-[26px] leading-8 font-semibold tracking-tight text-balance">{title}</h2>
      <p className="mt-2 text-[15px] leading-6 text-muted">{description}</p>
      {action ? <div className="mt-7">{action}</div> : null}
    </div>
  );
}
