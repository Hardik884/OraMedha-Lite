import { MAX_FILE_BYTES, type FileKind } from "./rules";

/**
 * How an image is shrunk on the phone before upload.
 *
 * Photos are made small enough for weak Wi-Fi. X-rays are treated gently:
 * they keep up to 4096 px on the long edge (enough to zoom into detail) and
 * a high JPEG quality, and a PNG X-ray stays PNG (lossless). Every image is
 * re-drawn, which also drops hidden photo data such as the location.
 */
export const IMAGE_SETTINGS = {
  photo: { maxEdge: 2560, quality: 0.85 },
  xray: { maxEdge: 4096, quality: 0.92 },
  thumb: { maxEdge: 480, quality: 0.75 },
} as const;

export type EncodePlan = {
  width: number;
  height: number;
  mime: "image/jpeg" | "image/png";
  quality: number;
};

function fit(width: number, height: number, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function planImage(img: { kind: FileKind; width: number; height: number; mime: string }): EncodePlan {
  const settings = img.kind === "xray" ? IMAGE_SETTINGS.xray : IMAGE_SETTINGS.photo;
  const size = fit(img.width, img.height, settings.maxEdge);
  const lossless = img.kind === "xray" && img.mime === "image/png";
  return { ...size, mime: lossless ? "image/png" : "image/jpeg", quality: settings.quality };
}

export function planThumbnail(img: { width: number; height: number }): EncodePlan {
  return {
    ...fit(img.width, img.height, IMAGE_SETTINGS.thumb.maxEdge),
    mime: "image/jpeg",
    quality: IMAGE_SETTINGS.thumb.quality,
  };
}

/**
 * Which bytes to send. The re-encoded image whenever it fits (it has no
 * hidden photo data); the original when the phone couldn't read the image,
 * e.g. an iPhone HEIC photo in a browser that can't open HEIC.
 */
export function chooseUpload(sizes: {
  originalSize: number;
  encodedSize: number | null;
}): "encoded" | "original" | "too_large" {
  if (sizes.encodedSize !== null && sizes.encodedSize <= MAX_FILE_BYTES) return "encoded";
  if (sizes.originalSize <= MAX_FILE_BYTES) return "original";
  return "too_large";
}
