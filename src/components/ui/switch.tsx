"use client";

import { cn } from "@/lib/utils";

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  label,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors disabled:opacity-60",
        checked ? "border-accent bg-accent" : "border-border-strong bg-elevated",
      )}
    >
      <span
        className={cn(
          "inline-block size-5 rounded-full shadow-md transition-transform",
          checked ? "translate-x-[22px] bg-on-accent" : "translate-x-[3px] bg-muted",
        )}
      />
    </button>
  );
}
