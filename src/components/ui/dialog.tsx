"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A modal dialog. It's the native <dialog>, so focus moves into it, Escape
 * closes it and the page behind can't be used meanwhile. Clicking the
 * backdrop closes it too.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto w-[calc(100%-32px)] max-w-[420px] rounded-3xl border border-border bg-surface p-0 text-foreground shadow-[0_30px_80px_rgb(0_0_0/0.7)] backdrop:bg-black/70 backdrop:backdrop-blur-sm",
        className,
      )}
    >
      {open ? (
        <div className="p-6">
          <h2 id={titleId} className="font-display text-[22px] leading-7 font-semibold tracking-tight">
            {title}
          </h2>
          {description ? (
            <div id={descriptionId} className="mt-2 text-[15px] text-muted">
              {description}
            </div>
          ) : null}
          {children}
        </div>
      ) : null}
    </dialog>
  );
}
