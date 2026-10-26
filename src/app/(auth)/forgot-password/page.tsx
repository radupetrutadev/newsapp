import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/auth/auth-forms";
import { AuthNotice } from "@/components/auth/auth-notice";
import { DemoNotice } from "@/components/auth/demo-notice";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage({ searchParams }: PageProps<"/forgot-password">) {
  return (
    <>
      <h1 className="text-[31px] leading-9 font-extrabold tracking-tight">Find your account</h1>
      <p className="mt-3 max-w-[320px] text-[15px] text-muted">
        Enter the email you signed up with and we&apos;ll send you a link to choose a new password.
      </p>

      <div className="mt-6 w-full max-w-[320px] space-y-3">
        <Suspense>
          <AuthNotice searchParams={searchParams} />
        </Suspense>
        <ForgotPasswordForm />
        <DemoNotice />
        <p className="pt-6 text-[15px] text-muted">
          Remembered it?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </>
  );
}
