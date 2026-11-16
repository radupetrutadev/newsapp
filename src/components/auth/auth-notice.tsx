// Only known codes are shown, so the URL can't inject arbitrary text.
const notices: Record<string, { tone: "error" | "success"; text: string }> = {
  "error:demo": {
    tone: "error",
    text: "Pulse is running in demo mode. Add your Supabase URL and key to .env.local to enable sign in.",
  },
  "error:oauth": {
    tone: "error",
    text: "We couldn't start that sign-in. Check the provider is enabled in Supabase and try again.",
  },
  "error:callback": { tone: "error", text: "We couldn't sign you in. The link may have expired — please try again." },
  "error:link": { tone: "error", text: "That reset link has expired or was already used. Request a new one below." },
  "message:deleted": { tone: "success", text: "Your account and everything in it were deleted." },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** A note passed in the URL (?error=… or ?message=…) by a redirect. Reads searchParams, so render it in <Suspense>. */
export async function AuthNotice({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const first = (value: string | string[] | undefined) => String(Array.isArray(value) ? value[0] : value);
  const notice = notices[`error:${first(params.error)}`] ?? notices[`message:${first(params.message)}`];
  if (!notice) return null;

  return notice.tone === "error" ? (
    <p role="alert" className="rounded-xl border border-live/40 bg-live/10 px-3.5 py-2.5 text-[14px] text-danger">
      {notice.text}
    </p>
  ) : (
    <p role="status" className="rounded-xl border border-repost/40 bg-repost/10 px-3.5 py-2.5 text-[14px] text-repost">
      {notice.text}
    </p>
  );
}
