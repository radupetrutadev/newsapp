"use client";

import Link from "next/link";
import { useActionState, type InputHTMLAttributes } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { requestPasswordReset, signIn, signUp, updatePassword, type AuthState } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

/** An input whose label floats above the value once it has one. */
export function FloatingInput({
  label,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  return (
    <label className={cn("relative block", className)}>
      <input
        {...props}
        placeholder=" "
        className="peer h-14 w-full rounded-xl border border-border-strong bg-surface px-3.5 pt-5 text-[16px] text-foreground transition-colors outline-none hover:border-muted/50 focus:border-accent focus:ring-2 focus:ring-accent/25"
      />
      <span className="pointer-events-none absolute top-2 left-3.5 text-[12px] text-muted transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-[16px] peer-focus:top-2 peer-focus:text-[12px] peer-focus:text-accent">
        {label}
      </span>
    </label>
  );
}

export function FormStatus({ state }: { state: AuthState }) {
  if (state.error) {
    return (
      <p role="alert" className="rounded-xl border border-live/40 bg-live/10 px-3.5 py-2.5 text-[14px] text-danger">
        {state.error}
      </p>
    );
  }
  if (state.message) {
    return (
      <p role="status" className="rounded-xl border border-repost/40 bg-repost/10 px-3.5 py-2.5 text-[14px] text-repost">
        {state.message}
      </p>
    );
  }
  return null;
}

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, {});

  return (
    <form action={action} className="space-y-3">
      <FloatingInput
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={state.values?.email}
        required
      />
      <FloatingInput
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      <FormStatus state={state} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <Link href="/forgot-password" className="block text-[14px] font-medium text-accent hover:underline">
        Forgot password?
      </Link>
    </form>
  );
}

export function SignupForm() {
  const [state, action, pending] = useActionState(signUp, {});

  return (
    <form action={action} className="space-y-3">
      <FloatingInput
        label="Name"
        name="name"
        autoComplete="name"
        maxLength={50}
        defaultValue={state.values?.name}
        required
      />
      <FloatingInput
        label="Username"
        name="handle"
        autoComplete="username"
        pattern="@?[A-Za-z0-9_]{3,15}"
        title="3–15 letters, numbers or underscores"
        defaultValue={state.values?.handle}
        required
      />
      <FloatingInput
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={state.values?.email}
        required
      />
      <FloatingInput
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
      />
      <FormStatus state={state} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, {});

  return (
    <form action={action} className="space-y-3">
      <FloatingInput
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={state.values?.email}
        required
      />
      <FormStatus state={state} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, {});

  if (state.message) {
    return (
      <div className="space-y-3">
        <FormStatus state={state} />
        <Link href="/" className={buttonClasses({ size: "lg", className: "w-full" })}>
          Continue to the feed
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <FloatingInput
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
      />
      <FloatingInput
        label="Confirm new password"
        name="confirm"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
      />
      <FormStatus state={state} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Change password"}
      </Button>
    </form>
  );
}
