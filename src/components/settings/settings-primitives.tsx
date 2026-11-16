import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** A titled group of settings, its rows in one card. */
export function SettingsSection({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 px-4 pt-6 md:scroll-mt-36 md:px-0">
      <div className="pb-3">
        <h2 className="font-display text-[22px] font-semibold tracking-tight">{title}</h2>
        {description ? <p className="mt-0.5 text-[13px] text-muted">{description}</p> : null}
      </div>
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
        {children}
      </div>
    </section>
  );
}

export function SettingsRow({
  icon: Icon,
  title,
  description,
  control,
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  control?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-elevated text-muted">
        <Icon className="size-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium">{title}</p>
        {description ? <p className="text-[13px] leading-5 text-muted">{description}</p> : null}
      </div>
      {control}
    </div>
  );
}
