import { chooseUpload, planImage, planThumbnail, type EncodePlan } from "./image-plan";
import type { FileKind } from "./rules";

/**
 * Browser-only: shrinks an image on the phone before upload (the numbers are
 * in image-plan.ts). If the phone can't read the image at all — typically an
 * iPhone HEIC photo in a browser without HEIC support — it's uploaded as-is.
 */
type Decoded = { source: CanvasImageSource; width: number; height: number; release: () => void };

async function decode(blob: Blob): Promise<Decoded | null> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
    } catch {
      // Fall through to <img>, which Safari can use for HEIC.
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    if (!img.naturalWidth) throw new Error("empty");
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, release: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    return null;
  }
}

function encode(source: CanvasImageSource, plan: EncodePlan): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = plan.width;
  canvas.height = plan.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  if (plan.mime === "image/jpeg") {
    // JPEG has no transparency: paint it white rather than black.
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, plan.width, plan.height);
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, plan.width, plan.height);
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        canvas.width = 0;
        canvas.height = 0;
        resolve(blob);
      },
      plan.mime,
      plan.quality,
    );
  });
}

export type PreparedImage =
  | { ok: true; main: Blob; mime: string; thumb: Blob | null }
  | { ok: false; reason: "too_large" };

export async function prepareImage(file: Blob, kind: FileKind, mime: string): Promise<PreparedImage> {
  const decoded = await decode(file);
  if (!decoded) {
    return chooseUpload({ originalSize: file.size, encodedSize: null }) === "original"
      ? { ok: true, main: file, mime, thumb: null }
      : { ok: false, reason: "too_large" };
  }
  try {
    const plan = planImage({ kind, width: decoded.width, height: decoded.height, mime });
    const encoded = await encode(decoded.source, plan);
    const thumb = await encode(decoded.source, planThumbnail(decoded));
    const pick = chooseUpload({ originalSize: file.size, encodedSize: encoded?.size ?? null });
    if (pick === "too_large") return { ok: false, reason: "too_large" };
    return pick === "encoded"
      ? { ok: true, main: encoded!, mime: plan.mime, thumb }
      : { ok: true, main: file, mime, thumb };
  } finally {
    decoded.release();
  }
}
