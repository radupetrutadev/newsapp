import { Info } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/** Explains demo mode on the auth screens when Supabase isn't connected. */
export function DemoNotice() {
  if (isSupabaseConfigured()) return null;

  return (
    <div className="flex gap-2.5 rounded-xl border border-accent/30 bg-accent/[0.07] p-3 text-[13px] leading-[18px] text-foreground/90">
      <Info className="mt-px size-4 shrink-0 text-accent" />
      <p>
        <strong>Demo mode.</strong> Add your Supabase project URL and publishable key to{" "}
        <code className="font-mono">.env.local</code> to enable sign in. Until then you&apos;re
        browsing as a demo reader.
      </p>
    </div>
  );
}
