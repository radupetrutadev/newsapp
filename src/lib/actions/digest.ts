"use server";

import { redirect } from "next/navigation";
import { unsubscribeFromDigest } from "@/lib/digest/unsubscribe";

/** The confirm button on /unsubscribe. */
export async function confirmUnsubscribe(formData: FormData) {
  const result = await unsubscribeFromDigest(formData.get("u"), formData.get("t"));
  redirect(`/unsubscribe?status=${result}`);
}
