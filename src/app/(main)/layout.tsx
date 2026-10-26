import { Suspense } from "react";
import { ActivitySync } from "@/components/layout/activity-sync";
import { LeftSidebar } from "@/components/layout/left-sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { RightSidebar } from "@/components/layout/right-sidebar";

/**
 * X-style three-column shell: navigation rail, a 600px timeline column,
 * and a sidebar with search, trends and suggestions.
 */
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1265px] justify-center">
      <header className="hidden shrink-0 sm:flex sm:w-[72px] sm:justify-end md:w-[88px] xl:w-[275px]">
        <LeftSidebar />
      </header>

      <main className="min-h-dvh w-full max-w-[600px] min-w-0 border-border pb-[53px] sm:border-x sm:pb-0">
        {children}
      </main>

      <aside className="hidden w-[290px] shrink-0 pl-6 lg:block xl:w-[350px] xl:pl-8">
        <RightSidebar />
      </aside>

      <MobileNav />

      <Suspense fallback={null}>
        <ActivitySync />
      </Suspense>
    </div>
  );
}
