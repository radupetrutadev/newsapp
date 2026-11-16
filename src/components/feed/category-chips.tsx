"use client";

import { categories } from "@/lib/categories";
import type { CategorySlug } from "@/lib/types";
import { cn } from "@/lib/utils";

export type CategoryFilter = CategorySlug | "all";

export function CategoryChips({
  value,
  onChange,
}: {
  value: CategoryFilter;
  onChange: (value: CategoryFilter) => void;
}) {
  const items: { slug: CategoryFilter; name: string }[] = [
    { slug: "all", name: "Top stories" },
    ...categories.map(({ slug, name }) => ({ slug, name })),
  ];

  return (
    <div className="relative">
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3 md:px-0">
        {items.map((item) => {
          const active = item.slug === value;
          return (
            <button
              key={item.slug}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(item.slug)}
              className={cn(
                "h-8 shrink-0 rounded-full border px-3.5 text-[13px] font-medium transition-colors",
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-surface text-foreground/80 hover:border-border-strong hover:text-foreground",
              )}
            >
              {item.name}
            </button>
          );
        })}
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent md:w-8" />
    </div>
  );
}
