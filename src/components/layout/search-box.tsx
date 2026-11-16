"use client";

import { Search, X } from "lucide-react";
import Form from "next/form";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function SearchBox({
  defaultValue = "",
  autoFocus,
  size = "md",
  className,
}: {
  defaultValue?: string;
  autoFocus?: boolean;
  /** "sm" for the top bar. */
  size?: "sm" | "md";
  className?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Form action="/search" role="search" className={cn("group relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-muted transition-colors group-focus-within:text-accent" />
      <input
        ref={inputRef}
        name="q"
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        autoFocus={autoFocus}
        autoComplete="off"
        placeholder="Search Pulse"
        aria-label="Search Pulse"
        className={cn(
          "w-full rounded-xl border border-border bg-surface pr-10 pl-11 text-foreground transition-colors placeholder:text-muted hover:border-border-strong focus:border-accent focus:bg-background focus:outline-none [&::-webkit-search-cancel-button]:hidden",
          size === "sm" ? "h-10 text-[14px]" : "h-12 text-[15px]",
        )}
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setValue("");
            inputRef.current?.focus();
          }}
          className="absolute top-1/2 right-3 flex size-[22px] -translate-y-1/2 items-center justify-center rounded-full bg-accent text-on-accent"
        >
          <X className="size-3.5" strokeWidth={3} />
        </button>
      ) : null}
    </Form>
  );
}
