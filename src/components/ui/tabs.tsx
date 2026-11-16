"use client";

import { cn } from "@/lib/utils";

export interface TabItem<T extends string> {
  id: T;
  label: string;
}

/**
 * A segmented control: the tabs sit in one rounded track and the selected
 * one is filled orange. It spans the column; give it `className` for spacing.
 */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("px-4 py-3 md:px-0", className)}>
      <div role="tablist" className="flex rounded-2xl border border-border bg-surface p-1">
        {tabs.map((tab) => {
          const active = tab.id === value;
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => onChange(tab.id)}
              className={cn(
                "h-9 min-w-14 flex-1 rounded-xl px-4 text-[14px] whitespace-nowrap transition-colors",
                active
                  ? "bg-accent font-semibold text-on-accent shadow-[0_4px_18px_-6px_rgb(255_106_26/0.7)]"
                  : "font-medium text-muted hover:bg-white/[0.04] hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
