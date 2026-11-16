import { Info, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ProfileForm } from "@/components/profile/profile-form";
import { ProfileSkeleton } from "@/components/source/profile-skeleton";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getViewer } from "@/lib/data/viewer";

export const metadata: Metadata = { title: "Edit profile" };

export default function EditProfilePage() {
  return (
    <>
      <PageHeader title="Edit profile" back="/profile" />
      <Suspense fallback={<ProfileSkeleton />}>
        <EditProfile />
      </Suspense>
    </>
  );
}

async function EditProfile() {
  const viewer = await getViewer();

  if (!viewer) {
    return (
      <EmptyState
        icon={UserRound}
        title="Sign in to edit your profile"
        description="Your name, bio and photo show on your replies and your profile page."
        action={
          <Link href="/login" className={buttonClasses({ variant: "primary", size: "lg" })}>
            Sign in
          </Link>
        }
      />
    );
  }

  return (
    <>
      <ProfileForm viewer={viewer} />
      {viewer.isDemo ? (
        <div className="mx-4 mb-4 flex gap-3 rounded-2xl border border-accent/30 bg-accent/[0.06] p-4 text-[14px] leading-5 md:mx-0">
          <Info className="mt-0.5 size-5 shrink-0 text-accent" />
          <p className="text-foreground/90">
            This is the demo reader, so changes aren&apos;t saved. Connect Supabase to edit a real profile and
            upload a photo.
          </p>
        </div>
      ) : null}
    </>
  );
}
