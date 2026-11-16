"use client";

import { ChevronDown, LogOut, Settings, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { UserAvatar } from "@/components/ui/avatar";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { signOut } from "@/lib/actions/auth";
import { turnOffPush } from "@/lib/push/browser";
import type { Viewer } from "@/lib/types";
import { cn } from "@/lib/utils";

const itemClass =
  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[14px] font-medium transition-colors hover:bg-white/[0.06]";

/** The reader's avatar in the top bar, opening their account menu. */
export function AccountMenu({ viewer }: { viewer: Viewer }) {
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
        aria-label="Account menu"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex items-center gap-1.5 rounded-full p-1 pr-2 transition-colors hover:bg-white/[0.06]",
          open && "bg-white/[0.06]",
        )}
      >
        <UserAvatar user={viewer} size={32} />
        <ChevronDown className={cn("size-4 text-muted transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <div
          role="menu"
          className="animate-fade-in absolute top-full right-0 z-50 mt-2 w-[280px] overflow-hidden rounded-2xl border border-border bg-surface p-1.5 shadow-[0_24px_60px_rgb(0_0_0/0.6)]"
        >
          <div className="flex items-center gap-3 border-b border-border px-3 pt-2 pb-3.5 mb-1.5">
            <UserAvatar user={viewer} size={40} />
            <div className="min-w-0">
              <p className="flex items-center gap-1 text-[15px] font-semibold">
                <span className="truncate">{viewer.name}</span>
                {viewer.verified ? <VerifiedBadge /> : null}
              </p>
              <p className="truncate text-[13px] text-muted">@{viewer.handle}</p>
            </div>
          </div>
          <Link role="menuitem" href="/profile" onClick={() => setOpen(false)} className={itemClass}>
            <User className="size-[18px] text-muted" /> View profile
          </Link>
          <Link role="menuitem" href="/settings" onClick={() => setOpen(false)} className={itemClass}>
            <Settings className="size-[18px] text-muted" /> Settings
          </Link>
          {viewer.isDemo ? (
            <Link role="menuitem" href="/login" onClick={() => setOpen(false)} className={itemClass}>
              <LogOut className="size-[18px] text-muted" /> Sign in with a real account
            </Link>
          ) : (
            <form
              action={async () => {
                // This browser shouldn't keep getting the account's notifications.
                await turnOffPush().catch(() => {});
                await signOut();
              }}
            >
              <button role="menuitem" type="submit" className={itemClass}>
                <LogOut className="size-[18px] text-muted" /> Log out @{viewer.handle}
              </button>
            </form>
          )}
        </div>
      ) : null}
    </div>
  );
}
