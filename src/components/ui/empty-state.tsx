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
    <div className="mx-auto flex max-w-[400px] flex-col items-start px-8 py-12">
      {Icon ? (
        <div className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-accent/10 text-accent ring-1 ring-accent/20">
          <Icon className="size-8" />
        </div>
      ) : null}
      <h2 className="text-[31px] leading-9 font-extrabold tracking-tight">{title}</h2>
      <p className="mt-2 text-[15px] text-muted">{description}</p>
      {action ? <div className="mt-7">{action}</div> : null}
    </div>
  );
}
