import { Bell, Settings } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { NotificationsView } from "@/components/notifications/notifications-view";
import { iconButton, PageHeader } from "@/components/layout/page-header";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FeedSkeleton } from "@/components/ui/skeleton";
import { getNotificationsPage } from "@/lib/data/notifications";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <>
      <PageHeader
        title="Notifications"
        actions={
          <Link href="/settings#notifications" aria-label="Notification settings" className={iconButton}>
            <Settings className="size-5" />
          </Link>
        }
      />
      <Suspense fallback={<FeedSkeleton count={3} />}>
        <Notifications />
      </Suspense>
    </>
  );
}

async function Notifications() {
  const page = await getNotificationsPage("all", null);
  if (!page) {
    return (
      <EmptyState
        icon={Bell}
        title="Sign in to see your notifications"
        description="Replies, likes, new followers and breaking news from the sources and topics you follow show up here."
        action={
          <Link href="/login" className={buttonClasses({ variant: "primary", size: "lg" })}>
            Sign in
          </Link>
        }
      />
    );
  }
  return <NotificationsView initial={page} />;
}
