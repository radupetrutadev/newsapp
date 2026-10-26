/** Limits for profiles, matching the checks in the accounts migration. */
export const NAME_MAX_LENGTH = 50;
export const BIO_MAX_LENGTH = 160;

/** Supabase Storage bucket for profile photos, one folder per reader. */
export const AVATAR_BUCKET = "avatars";
/** Photos are cropped square and scaled down to this many pixels in the browser. */
export const AVATAR_SIZE = 400;
/** The bucket's limit; a resized photo is far smaller. */
export const PHOTO_MAX_BYTES = 2 * 1024 * 1024;

export interface PhotoType {
  mime: "image/jpeg" | "image/png" | "image/webp";
  extension: "jpg" | "png" | "webp";
}

/** Recognizes a JPEG, PNG or WebP file from its first bytes. */
export function photoType(bytes: Uint8Array): PhotoType | null {
  const starts = (signature: number[], offset = 0) =>
    signature.every((byte, index) => bytes[offset + index] === byte);
  if (starts([0xff, 0xd8, 0xff])) return { mime: "image/jpeg", extension: "jpg" };
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { mime: "image/png", extension: "png" };
  // "RIFF" <size> "WEBP"
  if (starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8)) {
    return { mime: "image/webp", extension: "webp" };
  }
  return null;
}
