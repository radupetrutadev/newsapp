import { Settings } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { NotificationsView } from "@/components/notifications/notifications-view";
import { iconButton, PageHeader } from "@/components/layout/page-header";
import { getNotifications } from "@/lib/data";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const notifications = await getNotifications();

  return (
    <>
      <PageHeader
        title="Notifications"
        className="border-b-0"
        actions={
          <Link href="/settings#notifications" aria-label="Notification settings" className={iconButton}>
            <Settings className="size-5" />
          </Link>
        }
      />
      <NotificationsView notifications={notifications} />
    </>
  );
}
