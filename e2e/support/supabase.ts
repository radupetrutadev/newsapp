import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { test as base, type BrowserContext, type Page } from "@playwright/test";
import type { Database } from "../../src/lib/supabase/database.types";
import { keepOffline } from "./test";

export { expect } from "@playwright/test";

// Set by scripts/e2e.mjs from `supabase status`.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const secretKey = process.env.SUPABASE_SECRET_KEY ?? "";
const mailpit = process.env.E2E_MAILPIT_URL ?? "";
export const cronSecret = process.env.CRON_SECRET ?? "";

if (!url || !secretKey) throw new Error("Run these tests with `npm run test:e2e:supabase`.");

/** Bypasses row-level security: for setting up data and checking what was saved. */
export const admin = createClient<Database>(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** A client signed in as a reader, as their browser would be (row-level security applies). */
export async function clientFor(reader: Reader) {
  const client = createClient<Database>(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email: reader.email, password: reader.password });
  if (error) throw error;
  return client;
}

export interface Reader {
  id: string;
  name: string;
  handle: string;
  email: string;
  password: string;
}

/** A new, confirmed account. Every test makes its own, so tests can run in parallel. */
export async function createReader(name: string): Promise<Reader> {
  // Usernames are 3–15 characters: letters, numbers and underscores.
  const handle = `r${Date.now().toString(36).slice(-6)}${Math.random().toString(36).slice(2, 8)}`;
  const reader = { name, handle, email: `${handle}@example.com`, password: `Pw-${handle}-1` };
  const { data, error } = await admin.auth.admin.createUser({
    email: reader.email,
    password: reader.password,
    email_confirm: true,
    user_metadata: { display_name: name, handle },
  });
  if (error) throw error;
  return { id: data.user.id, ...reader };
}

/** Signs in through Supabase Auth, like the login form, and hands the browser the session cookies. */
export async function signIn(context: BrowserContext, reader: Reader, baseURL: string) {
  const cookies = new Map<string, string>();
  const client = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
      setAll: (changes) => {
        for (const { name, value } of changes) {
          if (value) cookies.set(name, value);
          else cookies.delete(name);
        }
      },
    },
  });
  const { error } = await client.auth.signInWithPassword({ email: reader.email, password: reader.password });
  if (error) throw error;
  await context.addCookies([...cookies].map(([name, value]) => ({ name, value, url: baseURL })));
}

/** Whether a password signs the reader in. */
export async function canSignIn(email: string, password: string) {
  const client = createClient<Database>(url, publishableKey, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  return !error;
}

/** The newest link in an email to `to` that contains `contains`, from the local mail catcher. */
export async function emailLink(to: string, contains: string): Promise<string | null> {
  const search = await fetch(`${mailpit}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
  const { messages } = (await search.json()) as { messages: { ID: string }[] };
  if (!messages?.length) return null;
  const message = (await (await fetch(`${mailpit}/api/v1/message/${messages[0].ID}`)).json()) as { HTML: string };
  const href = [...message.HTML.matchAll(/href="([^"]+)"/g)]
    .map((match) => match[1].replaceAll("&amp;", "&"))
    .find((link) => link.includes(contains));
  return href ?? null;
}

/** The story with this slug. */
export async function story(slug: string) {
  const { data, error } = await admin.from("articles").select("id, slug, title").eq("slug", slug).single();
  if (error) throw error;
  return data;
}

/** Adds a reply as a reader, skipping the browser (and the spam limits, which apply to readers). */
export async function addReply(reader: Reader, articleId: string, body: string, parentId: string | null = null) {
  const { data, error } = await admin
    .from("comments")
    .insert({ article_id: articleId, user_id: reader.id, body, parent_id: parentId })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

/** The id of a reply a reader posted, by its text. */
export async function replyId(reader: Reader, body: string) {
  const { data, error } = await admin.from("comments").select("id").eq("user_id", reader.id).eq("body", body).single();
  if (error) throw error;
  return data.id;
}

type SignedInReader = Reader & { page: Page; context: BrowserContext };

export const test = base.extend<{
  /** A new reader, signed in, in their own browser. */
  signedIn: (name: string) => Promise<SignedInReader>;
  /** A signed-out visitor in their own browser. */
  visitor: () => Promise<Page>;
}>({
  context: async ({ context }, use) => {
    await keepOffline(context);
    await use(context);
  },
  signedIn: async ({ browser, baseURL }, use) => {
    const contexts: BrowserContext[] = [];
    await use(async (name) => {
      const reader = await createReader(name);
      const context = await browser.newContext();
      contexts.push(context);
      await keepOffline(context);
      await signIn(context, reader, baseURL!);
      return { ...reader, context, page: await context.newPage() };
    });
    await Promise.all(contexts.map((context) => context.close()));
  },
  visitor: async ({ browser }, use) => {
    const contexts: BrowserContext[] = [];
    await use(async () => {
      const context = await browser.newContext();
      contexts.push(context);
      await keepOffline(context);
      return context.newPage();
    });
    await Promise.all(contexts.map((context) => context.close()));
  },
});
