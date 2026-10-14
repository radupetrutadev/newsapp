import Link from "next/link";
import { Suspense } from "react";
import { FeedView } from "@/components/feed/feed-view";
import { UserAvatar } from "@/components/ui/avatar";
import { getFeed } from "@/lib/data";
import { getViewer } from "@/lib/data/viewer";

export default async function FeedPage() {
  const articles = await getFeed();

  return (
    <FeedView
      articles={articles}
      mobileAvatar={
        <Suspense fallback={<span className="block size-8 rounded-full bg-elevated" />}>
          <MobileAvatar />
        </Suspense>
      }
    />
  );
}

async function MobileAvatar() {
  const viewer = await getViewer();
  return (
    <Link href={viewer ? "/profile" : "/login"} aria-label="Your profile">
      {viewer ? (
        <UserAvatar user={viewer} size={32} />
      ) : (
        <span className="block size-8 rounded-full bg-elevated" />
      )}
    </Link>
  );
}
