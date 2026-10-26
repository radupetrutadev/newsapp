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
      <h1 className="text-[40px] leading-[48px] font-extrabold tracking-tight sm:text-[64px] sm:leading-[76px]">
        Happening now
      </h1>
      <h2 className="mt-8 text-[23px] font-extrabold sm:mt-12 sm:text-[31px]">
        Sign in to {site.name}
      </h2>

      <div className="mt-6 w-full max-w-[320px] space-y-3">
        <Suspense>
          <AuthNotice searchParams={searchParams} />
        </Suspense>
        <OAuthButtons />
        <OrDivider />
        <LoginForm />
        <DemoNotice />
        <p className="pt-6 text-[15px] text-muted">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-accent hover:underline">
            Sign up
          </Link>
        </p>
        <Link href="/" className="block text-[15px] text-accent hover:underline">
          Continue to the feed →
        </Link>
      </div>
    </>
  );
}
