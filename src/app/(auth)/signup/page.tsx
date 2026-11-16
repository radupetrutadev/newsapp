import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "@/components/auth/auth-forms";
import { DemoNotice } from "@/components/auth/demo-notice";
import { OAuthButtons, OrDivider } from "@/components/auth/oauth-buttons";

export const metadata: Metadata = { title: "Create your account" };

export default function SignupPage() {
  return (
    <>
      <h1 className="font-display text-[34px] leading-[1.1] font-bold tracking-[-0.03em]">Never miss a story</h1>
      <p className="mt-2 text-[15px] text-muted">Create your account. It takes a minute.</p>

      <div className="mt-8 w-full space-y-3">
        <OAuthButtons verb="Sign up" />
        <OrDivider />
        <SignupForm />
        <p className="text-[12px] leading-4 text-muted">
          By signing up, you agree to the{" "}
          <Link href="/terms" className="text-accent hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-accent hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
        <DemoNotice />
        <p className="pt-6 text-[14px] text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </>
  );
}
