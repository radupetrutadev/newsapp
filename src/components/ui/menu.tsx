"use client";

import { Ellipsis, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A "more" button that opens a small menu of actions. */
export function MoreMenu({ label, children }: { label: string; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      if (event instanceof MouseEvent && ref.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((value) => !value)}
        className="-my-1.5 -mr-2 flex size-[34px] items-center justify-center rounded-full text-muted transition-colors hover:bg-white/[0.06] hover:text-foreground"
      >
        <Ellipsis className="size-[18px]" />
      </button>
      {open ? (
        <div
          role="menu"
          className="animate-fade-in absolute top-full right-0 z-30 mt-1 w-max min-w-[200px] overflow-hidden rounded-xl border border-border bg-elevated p-1 shadow-[0_20px_50px_rgb(0_0_0/0.6)]"
        >
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  );
}

export function MenuItem({
  icon: Icon,
  danger,
  onSelect,
  children,
}: {
  icon: LucideIcon;
  danger?: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[14px] font-medium hover:bg-white/[0.06]",
        danger && "text-danger",
      )}
    >
      <Icon className="size-[18px]" /> {children}
    </button>
  );
}
