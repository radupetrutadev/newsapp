"use client";

import { Ellipsis, LogOut, Settings, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { UserAvatar } from "@/components/ui/avatar";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { signOut } from "@/lib/actions/auth";
import { turnOffPush } from "@/lib/push/browser";
import type { Viewer } from "@/lib/types";

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
      {open ? (
        <div
          role="menu"
          className="animate-fade-in absolute bottom-full left-0 z-50 mb-3 w-[300px] overflow-hidden rounded-2xl border border-border bg-black py-3 shadow-[0_0_15px_rgba(255,255,255,0.2),0_0_3px_1px_rgba(255,255,255,0.15)]"
        >
          <Link
            role="menuitem"
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-[15px] font-bold hover:bg-white/[0.03]"
          >
            <User className="size-5" /> View profile
          </Link>
          <Link
            role="menuitem"
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-[15px] font-bold hover:bg-white/[0.03]"
          >
            <Settings className="size-5" /> Settings
          </Link>
          {viewer.isDemo ? (
            <Link
              role="menuitem"
              href="/login"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-[15px] font-bold hover:bg-white/[0.03]"
            >
              <LogOut className="size-5" /> Sign in with a real account
            </Link>
          ) : (
            <form
              action={async () => {
                // This browser shouldn't keep getting the account's notifications.
                await turnOffPush().catch(() => {});
                await signOut();
              }}
            >
              <button
                role="menuitem"
                type="submit"
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-[15px] font-bold hover:bg-white/[0.03]"
              >
                <LogOut className="size-5" /> Log out @{viewer.handle}
              </button>
            </form>
          )}
        </div>
      ) : null}

      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 rounded-full p-3 text-left transition-colors hover:bg-white/10"
      >
        <UserAvatar user={viewer} size={40} />
        <span className="hidden min-w-0 flex-1 xl:block">
          <span className="flex items-center gap-1 text-[15px] font-bold">
            <span className="truncate">{viewer.name}</span>
            {viewer.verified ? <VerifiedBadge /> : null}
          </span>
          <span className="block truncate text-[15px] text-muted">@{viewer.handle}</span>
        </span>
        <Ellipsis className="hidden size-[18px] xl:block" />
      </button>
    </div>
  );
}
