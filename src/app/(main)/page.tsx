import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { Suspense } from "react";
import { FeedView } from "@/components/feed/feed-view";
import { UserAvatar } from "@/components/ui/avatar";
import { getBreakingArticle } from "@/lib/data";
import { getFeedPage } from "@/lib/data/feeds";
import { getViewer } from "@/lib/data/viewer";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function FeedPage() {
  const breaking = await getBreakingArticle();
  // Ranked by the reader's topics, so it streams in after the page shell. In
  // demo mode those topics live in the browser, which fetches the page itself.
  // On failure the browser retries instead of the whole page erroring.
  const firstPage = isSupabaseConfigured()
    ? getFeedPage({ kind: "for-you", category: null }, null).catch((error: unknown) => {
        // Let Next.js see its own signals, e.g. the end of prerendering.
        unstable_rethrow(error);
        console.error(error);
        return null;
      })
    : null;

  return (
    <FeedView
      firstPage={firstPage}
      breaking={breaking}
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
