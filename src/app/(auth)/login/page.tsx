import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/auth-forms";
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
          <OAuthError searchParams={searchParams} />
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

// Only known codes are shown, so the URL can't inject arbitrary text.
const errorMessages: Record<string, string> = {
  demo: "Pulse is running in demo mode. Add your Supabase URL and key to .env.local to enable sign in.",
  oauth: "We couldn't start that sign-in. Check the provider is enabled in Supabase and try again.",
  callback: "We couldn't sign you in. The link may have expired — please try again.",
};

async function OAuthError({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const { error } = await searchParams;
  const message = errorMessages[String(Array.isArray(error) ? error[0] : error)];
  if (!message) return null;

  return (
    <p
      role="alert"
      className="rounded-md border border-live/40 bg-live/10 px-3 py-2 text-[14px] text-[#ff6b75]"
    >
      {message}
    </p>
  );
}
