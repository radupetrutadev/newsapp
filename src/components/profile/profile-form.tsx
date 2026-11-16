"use client";

import { Camera, X } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { UserAvatar } from "@/components/ui/avatar";
import { Button, buttonClasses } from "@/components/ui/button";
import { Cover } from "@/components/ui/cover";
import { saveProfile } from "@/lib/actions/account";
import { AVATAR_SIZE, BIO_MAX_LENGTH, NAME_MAX_LENGTH } from "@/lib/profile";
import type { Viewer } from "@/lib/types";

/** Larger originals aren't worth decoding in the browser. */
const ORIGINAL_MAX_BYTES = 25 * 1024 * 1024;

/**
 * Crops a photo to a square from its center and scales it down, so uploads
 * are small and every avatar has the same shape.
 */
async function toAvatar(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
  if (file.size > ORIGINAL_MAX_BYTES) throw new Error("That photo is too large. Choose one under 25 MB.");

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("That photo can't be opened here. Try a JPG, PNG or WebP.");
  }
  const side = Math.min(bitmap.width, bitmap.height);
  const size = Math.min(AVATAR_SIZE, side);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("That photo can't be opened here.");
  context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  bitmap.close();

  const encode = (type: string, quality: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  // Browsers that can't write WebP fall back to PNG; JPEG is smaller then.
  const webp = await encode("image/webp", 0.86);
  const blob = webp?.type === "image/webp" ? webp : await encode("image/jpeg", 0.88);
  if (!blob) throw new Error("That photo can't be opened here.");
  return blob;
}

type Photo =
  | { kind: "current" }
  | { kind: "new"; blob: Blob; preview: string }
  | { kind: "removed" };

export function ProfileForm({ viewer }: { viewer: Viewer }) {
  const [state, dispatch, pending] = useActionState(saveProfile, {});
  const [name, setName] = useState(viewer.name);
  const [bio, setBio] = useState(viewer.bio);
  const [photo, setPhoto] = useState<Photo>({ kind: "current" });
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const preview = photo.kind === "new" ? photo.preview : photo.kind === "removed" ? null : viewer.avatarUrl;
  const previewUrl = photo.kind === "new" ? photo.preview : null;
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const error = photoError ?? state.error;

  return (
    <form
      className="mx-4 mt-2 overflow-hidden rounded-3xl border border-border bg-surface md:mx-0"
      action={(formData) => {
        if (photo.kind === "new") {
          const extension = photo.blob.type === "image/webp" ? "webp" : "jpg";
          formData.set("photo", new File([photo.blob], `avatar.${extension}`, { type: photo.blob.type }));
        }
        if (photo.kind === "removed") formData.set("removePhoto", "1");
        dispatch(formData);
      }}
    >
      <div className="aspect-[3/1] w-full overflow-hidden bg-elevated">
        <Cover seed={viewer.handle} category="tech" className="size-full" />
      </div>
      <div className="flex items-end justify-between gap-3 px-5">
        <div className="relative -mt-[9%] rounded-full border-4 border-surface bg-surface">
          {photo.kind === "new" ? (
            // A blob: preview can't go through next/image.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo.preview} alt="" className="size-[112px] rounded-full object-cover" />
          ) : (
            <UserAvatar user={{ ...viewer, name: name || viewer.name, avatarUrl: preview }} size={112} />
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label={preview ? "Change photo" : "Add photo"}
            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/55"
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-black/60">
              <Camera className="size-[22px]" />
            </span>
          </button>
        </div>
        {preview ? (
          <button
            type="button"
            onClick={() => {
              setPhoto({ kind: "removed" });
              setPhotoError(null);
            }}
            className="mb-2 flex items-center gap-1 rounded-xl px-3 py-1.5 text-[14px] font-medium text-muted transition-colors hover:bg-white/[0.06] hover:text-foreground"
          >
            <X className="size-4" /> Remove photo
          </button>
        ) : null}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          try {
            const blob = await toAvatar(file);
            setPhoto({ kind: "new", blob, preview: URL.createObjectURL(blob) });
            setPhotoError(null);
          } catch (cause) {
            setPhotoError(cause instanceof Error ? cause.message : "That photo can't be used.");
          }
        }}
      />

      <div className="space-y-5 px-5 pt-6 pb-5">
        <Field label="Name" count={name.length} max={NAME_MAX_LENGTH}>
          <input
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={NAME_MAX_LENGTH}
            autoComplete="name"
            required
            className="w-full bg-transparent px-3.5 pb-2.5 text-[16px] outline-none"
          />
        </Field>
        <Field label="Bio" count={bio.length} max={BIO_MAX_LENGTH}>
          <textarea
            name="bio"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            maxLength={BIO_MAX_LENGTH}
            rows={3}
            className="w-full resize-none bg-transparent px-3.5 pb-2.5 text-[16px] leading-6 outline-none"
          />
        </Field>

        {error ? (
          <p role="alert" className="rounded-xl border border-live/40 bg-live/10 px-3.5 py-2.5 text-[14px] text-danger">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-3">
          <Link href="/profile" className={buttonClasses({ variant: "outline" })}>
            Cancel
          </Link>
          <Button type="submit" variant="primary" disabled={pending || !name.trim()}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function Field({ label, count, max, children }: { label: string; count: number; max: number; children: ReactNode }) {
  return (
    <label className="group block rounded-xl border border-border-strong bg-background transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25">
      <span className="flex justify-between px-3.5 pt-2.5 text-[12px] text-muted group-focus-within:text-accent">
        {label}
        <span className="tabular-nums opacity-0 group-focus-within:opacity-100">
          {count} / {max}
        </span>
      </span>
      {children}
    </label>
  );
}
