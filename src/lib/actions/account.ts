"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { AVATAR_BUCKET, BIO_MAX_LENGTH, NAME_MAX_LENGTH, PHOTO_MAX_BYTES, photoType } from "@/lib/profile";
import { getViewer } from "@/lib/data/viewer";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export interface AccountFormState {
  error?: string;
}

const DEMO = "This is the demo account. Connect Supabase to edit a real profile.";

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/** Removes a reader's photos from storage, except `keep`. Best effort. */
async function removePhotos(storage: SupabaseClient["storage"], userId: string, keep?: string) {
  const bucket = storage.from(AVATAR_BUCKET);
  const { data, error } = await bucket.list(userId, { limit: 100 });
  if (error) {
    console.error(`Supabase: failed to list profile photos: ${error.message}`);
    return;
  }
  const paths = data.map((file) => `${userId}/${file.name}`).filter((path) => path !== keep);
  if (paths.length === 0) return;
  const removed = await bucket.remove(paths);
  if (removed.error) console.error(`Supabase: failed to remove profile photos: ${removed.error.message}`);
}

/**
 * Saves the signed-in reader's name, bio and photo. The browser crops and
 * shrinks a new photo before sending it (`photo`); `removePhoto` clears it.
 */
export async function saveProfile(_state: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const name = text(formData, "name").trim().replace(/\s+/g, " ");
  // Forms send line breaks as \r\n.
  const bio = text(formData, "bio").replace(/\r\n?/g, "\n").trim().replace(/\n{3,}/g, "\n\n");
  const photo = formData.get("photo");
  const removePhoto = text(formData, "removePhoto") === "1";

  if (!name) return { error: "Add your name." };
  if (name.length > NAME_MAX_LENGTH) return { error: `Names can be up to ${NAME_MAX_LENGTH} characters.` };
  if (bio.length > BIO_MAX_LENGTH) return { error: `Bios can be up to ${BIO_MAX_LENGTH} characters.` };

  const viewer = await getViewer();
  if (!viewer) return { error: "Sign in to edit your profile." };
  if (!isSupabaseConfigured()) return { error: DEMO };

  const supabase = await createClient();
  let avatarUrl: string | null | undefined;
  let uploaded: string | undefined;

  if (photo instanceof File && photo.size > 0) {
    if (photo.size > PHOTO_MAX_BYTES) return { error: "That photo is too large. Choose another one." };
    // The file's own bytes decide its type, not what the browser claims.
    const type = photoType(new Uint8Array(await photo.slice(0, 16).arrayBuffer()));
    if (!type) return { error: "Choose a JPG, PNG or WebP photo." };

    uploaded = `${viewer.id}/${Date.now()}.${type.extension}`;
    // Sent as bytes, so it's stored with the type found above.
    const { error } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(uploaded, await photo.arrayBuffer(), { contentType: type.mime, cacheControl: "31536000", upsert: false });
    if (error) {
      console.error(`Supabase: failed to upload a profile photo: ${error.message}`);
      return { error: "Couldn't upload your photo. Try again." };
    }
    avatarUrl = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(uploaded).data.publicUrl;
  } else if (removePhoto) {
    avatarUrl = null;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: name, bio, ...(avatarUrl !== undefined ? { avatar_url: avatarUrl } : {}) })
    .eq("id", viewer.id);
  if (error) {
    console.error(`Supabase: failed to save a profile: ${error.message}`);
    if (uploaded) await supabase.storage.from(AVATAR_BUCKET).remove([uploaded]);
    return { error: "Couldn't save your profile. Try again." };
  }

  // Earlier photos aren't shown anywhere any more.
  if (avatarUrl !== undefined) await removePhotos(supabase.storage, viewer.id, uploaded);

  updateTag("profiles");
  updateTag(`user-comments:${viewer.id}`);
  redirect("/profile");
}

/**
 * Deletes the signed-in reader's account for good: their photos, then the
 * auth user, which removes the profile and everything that hangs off it.
 * Replies others answered stay as placeholders without the reader's name.
 * `confirm` must be the reader's username.
 */
export async function deleteAccount(_state: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Sign in to delete your account." };
  if (viewer.isDemo) return { error: "The demo account can't be deleted." };

  const confirmation = text(formData, "confirm").trim().replace(/^@/, "").toLowerCase();
  if (confirmation !== viewer.handle) return { error: `Type ${viewer.handle} to confirm.` };
  // Only the secret key can delete auth users.
  if (!isAdminConfigured()) {
    return { error: "Account deletion isn't set up on this server yet (it needs SUPABASE_SECRET_KEY)." };
  }

  const admin = createAdminClient();
  // Nothing could remove the photos once the account is gone.
  await removePhotos(admin.storage, viewer.id);
  const { error } = await admin.auth.admin.deleteUser(viewer.id);
  if (error) {
    console.error(`Supabase: failed to delete an account: ${error.message}`);
    return { error: "Couldn't delete your account. Try again." };
  }

  // The session belongs to a user that no longer exists; drop its cookies.
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });

  updateTag("profiles");
  updateTag(`user-comments:${viewer.id}`);
  redirect("/login?message=deleted");
}
