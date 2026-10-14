import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "@/components/auth/auth-forms";
import { DemoNotice } from "@/components/auth/demo-notice";
import { OAuthButtons, OrDivider } from "@/components/auth/oauth-buttons";

export const metadata: Metadata = { title: "Create your account" };

export default function SignupPage() {
  return (
    <>
      <h1 className="text-[40px] leading-[48px] font-extrabold tracking-tight sm:text-[64px] sm:leading-[76px]">
        Never miss a story
      </h1>
      <h2 className="mt-8 text-[23px] font-extrabold sm:mt-12 sm:text-[31px]">Join today.</h2>

      <div className="mt-6 w-full max-w-[320px] space-y-3">
        <OAuthButtons verb="Sign up" />
        <OrDivider />
        <SignupForm />
        <p className="text-[11px] leading-[14px] text-muted">
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
        <p className="pt-6 text-[15px] text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </>
  );
}
