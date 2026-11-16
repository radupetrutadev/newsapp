"use client";

import { usePathname } from "next/navigation";
import { Suspense, type ComponentType } from "react";

type PathProps = { pathname: string | null };

/**
 * Renders `component` with the current pathname. Pages whose address is only
 * known at request time (a story published after the build, say) are
 * prerendered with null, and the real pathname streams in with the page.
 */
export function WithPathname({ component: Component }: { component: ComponentType<PathProps> }) {
  return (
    <Suspense fallback={<Component pathname={null} />}>
      <Current component={Component} />
    </Suspense>
  );
}

function Current({ component: Component }: { component: ComponentType<PathProps> }) {
  return <Component pathname={usePathname()} />;
}
