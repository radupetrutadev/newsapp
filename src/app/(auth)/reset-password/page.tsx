import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { NewPasswordForm } from "@/components/auth/auth-forms";
import { DemoNotice } from "@/components/auth/demo-notice";
import { buttonClasses } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getViewer } from "@/lib/data/viewer";

export const metadata: Metadata = { title: "Choose a new password" };

/** Where reset links land (signed in by the link), and where Settings sends readers to change their password. */
export default function ResetPasswordPage() {
  return (
    <>
      <h1 className="text-[31px] leading-9 font-extrabold tracking-tight">Choose a new password</h1>
      <div className="mt-6 w-full max-w-[320px] space-y-3">
        <Suspense fallback={<Skeleton className="h-[170px] w-full rounded-md" />}>
          <ResetPassword />
        </Suspense>
      </div>
    </>
  );
}

async function ResetPassword() {
  const viewer = await getViewer();
  if (!viewer) {
    return (
      <>
        <p className="text-[15px] text-muted">
          Your reset link has expired or was already used. Request a new one and open the newest email.
        </p>
        <Link href="/forgot-password" className={buttonClasses({ variant: "primary", className: "h-10 w-full" })}>
          Send a new link
        </Link>
      </>
    );
  }

  return (
    <>
      <p className="text-[15px] text-muted">
        For @{viewer.handle}. Use at least 8 characters; you&apos;ll stay signed in.
      </p>
      <NewPasswordForm />
      <DemoNotice />
    </>
  );
}
