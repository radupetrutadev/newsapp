"use client";

import { Search, X } from "lucide-react";
import Form from "next/form";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function SearchBox({
  defaultValue = "",
  autoFocus,
  className,
}: {
  defaultValue?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Form action="/search" role="search" className={cn("group relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-muted group-focus-within:text-accent" />
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
        className="h-11 w-full rounded-full border border-transparent bg-elevated pr-11 pl-12 text-[15px] text-foreground placeholder:text-muted focus:border-accent focus:bg-black focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setValue("");
            inputRef.current?.focus();
          }}
          className="absolute top-1/2 right-3 flex size-[22px] -translate-y-1/2 items-center justify-center rounded-full bg-accent text-black"
        >
          <X className="size-3.5" strokeWidth={3} />
        </button>
      ) : null}
    </Form>
  );
}
