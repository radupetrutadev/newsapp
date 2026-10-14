import { SearchX } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <>
      <PageHeader title="Not found" back="/" />
      <EmptyState
        icon={SearchX}
        title="This page doesn't exist"
        description="The story or profile may have been removed, or the link might be wrong. Try searching for something else."
        action={
          <Link href="/explore" className={buttonClasses({ variant: "accent", size: "lg" })}>
            Search
          </Link>
        }
      />
    </>
  );
}
