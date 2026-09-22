// Client-side photo compression (Story 2.2, AD-4 / Boundaries &
// Constraints). Canvas API only — no new dependency. Caps the longest
// dimension to ~1600px and re-encodes as JPEG at ~0.8 quality before the
// photo ever leaves the device, so the request stays safely under Vercel's
// 4.5MB body ceiling after base64 inflation. If the compressed result is
// still too large, the caller rejects client-side and sends no request.

// Longest-edge cap for the compressed image.
export const MAX_PHOTO_LONGEST_DIMENSION = 1600;

// JPEG re-encode quality.
export const PHOTO_JPEG_QUALITY = 0.8;

// Ceiling checked *after* compression, on the raw (decoded) byte size —
// ~3MB raw is safely under Vercel's 4.5MB request-body ceiling once
// inflated by base64 (~4/3x). Exported so app/api/entries/route.ts can
// defensively re-check the decoded size server-side without duplicating the
// number.
export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

const COMPRESSED_MIME_TYPE = "image/jpeg";

export type CompressImageResult =
  | { ok: true; base64: string; mimeType: string }
  | { ok: false; reason: "too_large" };

// Draws `file` onto an offscreen canvas at a capped size and re-encodes it
// as JPEG, returning a base64 payload (no `data:` prefix) ready to send as
// `photoBase64`. The original file's bytes are never persisted anywhere —
// this function only ever holds them in memory for the duration of the
// draw/encode.
export async function compressImage(file: File): Promise<CompressImageResult> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const { width, height } = scaledDimensions(image.naturalWidth, image.naturalHeight);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas 2D context is unavailable — cannot compress image.");
    }
    context.drawImage(image, 0, 0, width, height);

    const blob = await canvasToBlob(canvas, COMPRESSED_MIME_TYPE, PHOTO_JPEG_QUALITY);
    if (blob.size > MAX_PHOTO_BYTES) {
      return { ok: false, reason: "too_large" };
    }

    const base64 = await blobToBase64(blob);
    return { ok: true, base64, mimeType: COMPRESSED_MIME_TYPE };
  } finally {
    // Object URL is created before the try block so it's always revoked —
    // including when `loadImage` itself rejects (a corrupt/unsupported
    // file), which the previous revoke-in-image.src-only approach missed.
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(objectUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Couldn't read the selected photo."));
    image.src = objectUrl;
  });
}

function scaledDimensions(width: number, height: number): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= MAX_PHOTO_LONGEST_DIMENSION || longest === 0) {
    return { width, height };
  }
  const scale = MAX_PHOTO_LONGEST_DIMENSION / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Image compression failed."));
      },
      type,
      quality
    );
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the "data:<mime>;base64," prefix — only the raw base64
      // payload is sent to the API.
      const commaIndex = result.indexOf(",");
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(new Error("Couldn't read the compressed photo."));
    reader.readAsDataURL(blob);
  });
}
