"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

/** One page of a list and the cursor for the next (null after the last). */
export interface Page<T> {
  items: T[];
  next: string | null;
}

/** Start loading the next page this far before the reader reaches the end. */
const PRELOAD_MARGIN = "1200px";

interface State<T> {
  items: T[];
  /** Cursor for the next page: undefined before the first page, null after the last. */
  next: string | null | undefined;
  loading: boolean;
  failed: boolean;
}

export type PagedList<T> = State<T> & {
  loadMore: () => void;
  /** Loads the first page again (with `loader`, if given) and replaces the list. */
  reload: (loader?: () => Promise<Page<T>>) => Promise<boolean>;
  /** Ref callback for the placeholder at the end of the list. */
  sentinel: (node: HTMLDivElement | null) => void;
};

/**
 * Items that keep loading as the reader scrolls. `load` fetches the page
 * after a cursor (null for the first) and must stay the same for the life of
 * the list: give the component a new `key` to start over with another one.
 * Pass `initial` when the server already rendered the first page.
 */
export function usePagedList<T extends { id: string }>(
  load: (cursor: string | null) => Promise<Page<T>>,
  initial: Page<T> | null,
): PagedList<T> {
  const [state, setState] = useState<State<T>>(() => ({
    items: initial?.items ?? [],
    next: initial ? initial.next : undefined,
    loading: false,
    failed: false,
  }));
  const busy = useRef(false);
  // A reload makes pages still on their way out of date.
  const generation = useRef(0);
  const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null);
  const { next, loading, failed } = state;

  const loadMore = useCallback(() => {
    if (busy.current || next === null) return;
    busy.current = true;
    const started = generation.current;
    setState((current) => ({ ...current, loading: true, failed: false }));
    load(next ?? null).then(
      (page) => {
        if (started !== generation.current) return;
        busy.current = false;
        setState((current) => {
          // Ranked lists can shift a little between pages; don't show an item twice.
          const seen = new Set(current.items.map((item) => item.id));
          const added = page.items.filter((item) => !seen.has(item.id));
          return { items: [...current.items, ...added], next: page.next, loading: false, failed: false };
        });
      },
      (error) => {
        if (started !== generation.current) return;
        busy.current = false;
        console.error(error);
        setState((current) => ({ ...current, loading: false, failed: true }));
      },
    );
  }, [load, next]);

  const reload = useCallback(
    async (loader?: () => Promise<Page<T>>) => {
      generation.current += 1;
      const started = generation.current;
      busy.current = true;
      try {
        const page = await (loader ?? (() => load(null)))();
        if (started !== generation.current) return false;
        setState({ items: page.items, next: page.next, loading: false, failed: false });
        return true;
      } catch (error) {
        console.error(error);
        return false;
      } finally {
        if (started === generation.current) busy.current = false;
      }
    },
    [load],
  );

  // The first page, when the server didn't render it.
  useEffect(() => {
    if (next === undefined && !failed) loadMore();
  }, [next, failed, loadMore]);

  // The next page, once the end of the list comes near. Observing again after
  // each page also catches a short page that leaves the end in view.
  useEffect(() => {
    const node = sentinel;
    if (!node || !next || loading || failed) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore();
      },
      { rootMargin: `0px 0px ${PRELOAD_MARGIN} 0px` },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [sentinel, next, loading, failed, loadMore]);

  return { ...state, loadMore, reload, sentinel: setSentinel };
}

/**
 * What follows the items: `end` after the last page, "Try again" when a page
 * failed, otherwise a placeholder that loads the next page as it comes near.
 */
export function PagedListFooter<T>({
  list: { items, next, loading, failed, loadMore, sentinel },
  noun,
  placeholder,
  end,
}: {
  list: PagedList<T>;
  /** "stories", "notifications": used in the messages. */
  noun: string;
  placeholder: ReactNode;
  end?: ReactNode;
}) {
  if (next === null) return end ?? null;
  if (failed) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
        <p className="text-[15px] text-muted">
          {items.length > 0 ? `Couldn't load more ${noun}.` : `Couldn't load ${noun}.`}
        </p>
        <Button variant="outline" onClick={loadMore}>
          Try again
        </Button>
      </div>
    );
  }
  return (
    <div ref={sentinel} aria-busy={loading} aria-label={`Loading more ${noun}`}>
      {placeholder}
    </div>
  );
}
