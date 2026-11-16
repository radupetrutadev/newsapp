import { Suspense } from "react";
import { ActivitySync } from "@/components/layout/activity-sync";
import { MobileNav } from "@/components/layout/mobile-nav";
import { RightSidebar } from "@/components/layout/right-sidebar";
import { TopBar } from "@/components/layout/top-bar";

/**
 * The app shell: a top bar on tablets and up (a floating dock on phones),
 * the page in a reading column, and a rail of trends and sources beside it
 * on wide screens.
 */
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <TopBar />

      <div className="mx-auto flex w-full max-w-[1180px] justify-center gap-8 md:px-6">
        <main className="min-h-dvh w-full max-w-[720px] min-w-0 flex-1 pb-[calc(96px+env(safe-area-inset-bottom))] md:pb-16">
          {children}
        </main>

        <aside className="hidden w-[320px] shrink-0 lg:block xl:w-[340px]">
          <RightSidebar />
        </aside>
      </div>

      <MobileNav />

      <Suspense fallback={null}>
        <ActivitySync />
      </Suspense>
    </div>
  );
}
