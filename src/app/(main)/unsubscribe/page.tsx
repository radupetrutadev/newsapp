import { MailX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button, buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { confirmUnsubscribe } from "@/lib/actions/digest";
import { isValidUnsubscribeToken } from "@/lib/digest/token";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false } };

/** Where the "Unsubscribe" link in a digest email lands. */
export default function UnsubscribePage({ searchParams }: PageProps<"/unsubscribe">) {
  return (
    <>
      <PageHeader title="Weekly digest" back="/" />
      <Suspense fallback={null}>
        <Unsubscribe searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const settingsLink = (
  <Link href="/settings#notifications" className={buttonClasses({ variant: "outline", size: "lg" })}>
    Notification settings
  </Link>
);

async function Unsubscribe({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { u, t, status } = await searchParams;
  // Checked before asking, so an old or edited link says so straight away.
  const link =
    typeof u === "string" && typeof t === "string" && isValidUnsubscribeToken(u, t, process.env.CRON_SECRET ?? "")
      ? { u, t }
      : null;

  if (status === "done") {
    return (
      <EmptyState
        icon={MailX}
        title="You're unsubscribed"
        description="You won't get the weekly digest anymore. You can turn it back on in Settings whenever you like."
        action={settingsLink}
      />
    );
  }
  if (status === "failed" || !link) {
    return (
      <EmptyState
        icon={MailX}
        title={status === "failed" ? "That didn't work" : "This link doesn't work"}
        description={
          status === "failed"
            ? "We couldn't update your settings just now. Try the link again in a moment, or turn the digest off in Settings."
            : "It may be from an older email. Sign in and turn off the weekly digest in Settings instead."
        }
        action={settingsLink}
      />
    );
  }

  return (
    <EmptyState
      icon={MailX}
      title="Stop the weekly digest?"
      description="You'll stop getting the Sunday email with the week's most-read stories. Everything else stays the same."
      action={
        <form action={confirmUnsubscribe}>
          <input type="hidden" name="u" value={link.u} />
          <input type="hidden" name="t" value={link.t} />
          <Button type="submit" variant="primary" size="lg">
            Unsubscribe
          </Button>
        </form>
      }
    />
  );
}
