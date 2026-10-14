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
    <div className="relative border-b border-border">
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3">
        {items.map((item) => {
          const active = item.slug === value;
          return (
            <button
              key={item.slug}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(item.slug)}
              className={cn(
                "h-8 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors",
                active
                  ? "bg-foreground text-black"
                  : "border border-border text-foreground hover:bg-white/10",
              )}
            >
              {item.name}
            </button>
          );
        })}
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-black to-transparent" />
    </div>
  );
}
