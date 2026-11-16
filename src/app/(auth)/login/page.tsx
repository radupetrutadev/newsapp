import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/auth-forms";
import { AuthNotice } from "@/components/auth/auth-notice";
import { DemoNotice } from "@/components/auth/demo-notice";
import { OAuthButtons, OrDivider } from "@/components/auth/oauth-buttons";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <>
      <h1 className="font-display text-[34px] leading-[1.1] font-bold tracking-[-0.03em]">Welcome back</h1>
      <p className="mt-2 text-[15px] text-muted">Sign in to {site.name} to pick up where you left off.</p>

      <div className="mt-8 w-full space-y-3">
        <Suspense>
          <AuthNotice searchParams={searchParams} />
        </Suspense>
        <OAuthButtons />
        <OrDivider />
        <LoginForm />
        <DemoNotice />
        <p className="pt-6 text-[14px] text-muted">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-semibold text-accent hover:underline">
            Sign up
          </Link>
        </p>
        <Link href="/" className="block text-[14px] font-medium text-muted hover:text-accent">
          Continue to the feed →
        </Link>
      </div>
    </>
  );
}
