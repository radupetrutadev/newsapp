"use client";

import { cn } from "@/lib/utils";

export interface TabItem<T extends string> {
  id: T;
  label: string;
}

/** X-style tab bar: equal-width tabs with a rounded accent underline. */
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
    <div role="tablist" className={cn("flex border-b border-border", className)}>
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className="flex h-[53px] min-w-14 flex-1 justify-center px-4 transition-colors hover:bg-white/10"
          >
            <span
              className={cn(
                "relative flex h-full items-center text-[15px] whitespace-nowrap",
                active ? "font-bold text-foreground" : "font-medium text-muted",
              )}
            >
              {tab.label}
              {active ? (
                <span className="absolute inset-x-0 bottom-0 h-1 rounded-full bg-accent" />
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
