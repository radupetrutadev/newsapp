"use client";

import { useActionState, type InputHTMLAttributes } from "react";
import { Button } from "@/components/ui/button";
import { signIn, signUp, type AuthState } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

/** X-style input whose label floats above the value on focus. */
function FloatingInput({
  label,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  return (
    <label className={cn("relative block", className)}>
      <input
        {...props}
        placeholder=" "
        className="peer h-14 w-full rounded-md border border-[#333639] bg-transparent px-2 pt-5 text-[17px] text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent"
      />
      <span className="pointer-events-none absolute top-2 left-2 text-[13px] text-muted transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-[17px] peer-focus:top-2 peer-focus:text-[13px] peer-focus:text-accent">
        {label}
      </span>
    </label>
  );
}

function FormStatus({ state }: { state: AuthState }) {
  if (state.error) {
    return (
      <p role="alert" className="rounded-md border border-live/40 bg-live/10 px-3 py-2 text-[14px] text-[#ff6b75]">
        {state.error}
      </p>
    );
  }
  if (state.message) {
    return (
      <p role="status" className="rounded-md border border-repost/40 bg-repost/10 px-3 py-2 text-[14px] text-repost">
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
      <FloatingInput label="Email" name="email" type="email" autoComplete="email" required />
      <FloatingInput
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      <FormStatus state={state} />
      <Button type="submit" variant="primary" className="h-10 w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

export function SignupForm() {
  const [state, action, pending] = useActionState(signUp, {});

  return (
    <form action={action} className="space-y-3">
      <FloatingInput label="Name" name="name" autoComplete="name" maxLength={50} required />
      <FloatingInput
        label="Username"
        name="handle"
        autoComplete="username"
        pattern="@?[A-Za-z0-9_]{3,15}"
        title="3–15 letters, numbers or underscores"
        required
      />
      <FloatingInput label="Email" name="email" type="email" autoComplete="email" required />
      <FloatingInput
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
      />
      <FormStatus state={state} />
      <Button type="submit" variant="accent" className="h-10 w-full" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
