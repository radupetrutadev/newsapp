import { AtSign, Database, KeyRound, LogOut, Mail, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { DeleteAccount } from "@/components/settings/delete-account";
import { SettingsRow, SettingsSection } from "@/components/settings/settings-primitives";
import { SettingsView } from "@/components/settings/settings-view";
import { UserAvatar } from "@/components/ui/avatar";
import { buttonClasses } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { signOut } from "@/lib/actions/auth";
import { getViewer } from "@/lib/data/viewer";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" back="/" />
      <Suspense fallback={<AccountSkeleton />}>
        <AccountSection />
      </Suspense>
      <SettingsView />
    </>
  );
}

async function AccountSection() {
  const viewer = await getViewer();

  if (!viewer) {
    return (
      <SettingsSection title="Your account">
        <div className="flex items-center justify-between gap-4 px-4 py-3.5">
          <p className="text-[15px] text-muted">Sign in to manage your account.</p>
          <Link href="/login" className={buttonClasses({ variant: "primary", size: "sm" })}>
            Sign in
          </Link>
        </div>
      </SettingsSection>
    );
  }

  return (
    <SettingsSection title="Your account" description="See information about your account.">
      <div className="flex items-center gap-3 px-4 py-4">
        <UserAvatar user={viewer} size={48} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[17px] font-semibold">{viewer.name}</p>
          <p className="truncate text-[15px] text-muted">@{viewer.handle}</p>
        </div>
        <Link href="/profile/edit" className={buttonClasses({ variant: "outline", size: "sm" })}>
          Edit profile
        </Link>
      </div>
      <SettingsRow icon={UserRound} title="Display name" description={viewer.name} />
      <SettingsRow icon={AtSign} title="Username" description={`@${viewer.handle}`} />
      <SettingsRow icon={Mail} title="Email" description={viewer.email ?? "Not set"} />
      {viewer.isDemo ? (
        <SettingsRow
          icon={Database}
          title="Connect Supabase"
          description="Demo mode. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local to enable accounts."
        />
      ) : (
        <>
          <SettingsRow
            icon={KeyRound}
            title="Password"
            description="Choose a new password for signing in with your email."
            control={
              <Link href="/reset-password" className={buttonClasses({ variant: "outline", size: "sm" })}>
                Change
              </Link>
            }
          />
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-4 px-4 py-3.5 text-left text-[15px] font-medium transition-colors hover:bg-white/[0.04]"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-elevated text-muted">
                <LogOut className="size-[18px]" />
              </span>
              Log out
            </button>
          </form>
          <DeleteAccount handle={viewer.handle} />
        </>
      )}
    </SettingsSection>
  );
}

function AccountSkeleton() {
  return (
    <div className="space-y-3 px-4 pt-6 md:px-0">
      <Skeleton className="h-5 w-32" />
      <div className="flex items-center gap-3">
        <Skeleton className="size-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  );
}
