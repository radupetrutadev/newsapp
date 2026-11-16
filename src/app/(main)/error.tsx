"use client";

import { TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <>
      <PageHeader title="Something went wrong" back="/" />
      <EmptyState
        icon={TriangleAlert}
        title="We couldn't load this page"
        description={
          error.message.startsWith("Supabase")
            ? error.message
            : "A temporary problem stopped this page from loading. Try again in a moment."
        }
        action={
          <Button variant="primary" size="lg" onClick={() => retry()}>
            Try again
          </Button>
        }
      />
    </>
  );
}
