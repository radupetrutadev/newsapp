"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export interface AuthState {
  error?: string;
  message?: string;
}

const NOT_CONFIGURED =
  "Pulse is running in demo mode. Add your Supabase URL and key to .env.local to enable sign in.";

async function origin(): Promise<string> {
  const headerList = await headers();
  return (
    headerList.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  );
}

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function signIn(_state: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };

  const email = field(formData, "email");
  const password = field(formData, "password");
  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  redirect("/");
}

const HANDLE_PATTERN = /^[a-z0-9_]{3,15}$/;

export async function signUp(_state: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };

  const name = field(formData, "name");
  const handle = field(formData, "handle").replace(/^@/, "").toLowerCase();
  const email = field(formData, "email");
  const password = field(formData, "password");

  if (!name || !email || !password) return { error: "Fill in every field to continue." };
  if (!HANDLE_PATTERN.test(handle)) {
    return { error: "Usernames are 3–15 characters: letters, numbers and underscores." };
  }
  if (password.length < 8) return { error: "Use at least 8 characters for your password." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: name, handle },
      emailRedirectTo: `${await origin()}/auth/callback`,
    },
  });
  if (error) return { error: error.message };

  // With email confirmation disabled Supabase returns a session right away.
  if (data.session) redirect("/");
  return { message: `Check ${email} for a link to confirm your account.` };
}

/**
 * Emails a link to choose a new password. The answer is the same whether or
 * not an account uses the address, so the form can't be used to find accounts.
 */
export async function requestPasswordReset(_state: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };

  const email = field(formData, "email");
  if (!email) return { error: "Enter the email you signed up with." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await origin()}/auth/callback?next=/reset-password`,
  });
  if (error?.status === 429) {
    return { error: "Too many emails were sent just now. Wait a few minutes and try again." };
  }
  if (error) console.error(`Supabase: failed to send a password reset email: ${error.message}`);
  return { message: `If an account uses ${email}, we've sent it a link to choose a new password.` };
}

/** Sets a new password for the signed-in reader (after a reset link, or from Settings). */
export async function updatePassword(_state: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };

  const password = field(formData, "password");
  if (password.length < 8) return { error: "Use at least 8 characters for your password." };
  if (password !== field(formData, "confirm")) return { error: "The two passwords don't match." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your reset link has expired. Request a new one." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    switch (error.code) {
      case "same_password":
        return { error: "That's your current password. Choose a different one." };
      case "weak_password":
        return { error: error.message };
      case "reauthentication_needed":
        return { error: "For your security, sign in again before changing your password." };
      default:
        console.error(`Supabase: failed to change a password: ${error.message}`);
        return { error: "Couldn't change your password. Try again." };
    }
  }
  return { message: "Your password was changed." };
}

export async function signInWithProvider(formData: FormData) {
  const provider = field(formData, "provider");
  if (!isSupabaseConfigured()) redirect("/login?error=demo");
  if (provider !== "google" && provider !== "github") redirect("/login?error=oauth");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${await origin()}/auth/callback` },
  });
  if (error || !data.url) redirect("/login?error=oauth");

  redirect(data.url);
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
