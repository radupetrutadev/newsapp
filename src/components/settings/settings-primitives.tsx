import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

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
    <section id={id} className="scroll-mt-16 border-b border-border py-2">
      <div className="px-4 pt-3 pb-2">
        <h2 className="text-xl font-extrabold">{title}</h2>
        {description ? <p className="text-[13px] text-muted">{description}</p> : null}
      </div>
      {children}
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
    <div className="flex items-center gap-4 px-4 py-3">
      <Icon className="size-5 shrink-0 text-muted" />
      <div className="min-w-0 flex-1">
        <p className="text-[15px]">{title}</p>
        {description ? <p className="text-[13px] text-muted">{description}</p> : null}
      </div>
      {control}
    </div>
  );
}
