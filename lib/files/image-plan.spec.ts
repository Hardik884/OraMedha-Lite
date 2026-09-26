import { describe, expect, it } from "vitest";
import { IMAGE_SETTINGS, chooseUpload, planImage, planThumbnail } from "./image-plan";

const MB = 1024 * 1024;

describe("planImage", () => {
  it("shrinks a phone photo to the photo size, as JPEG", () => {
    expect(planImage({ kind: "photo", width: 4032, height: 3024, mime: "image/jpeg" })).toEqual({
      width: 2560,
      height: 1920,
      mime: "image/jpeg",
      quality: IMAGE_SETTINGS.photo.quality,
    });
  });

  it("keeps much more of an X-ray: larger size, higher quality", () => {
    const plan = planImage({ kind: "xray", width: 4032, height: 3024, mime: "image/jpeg" });
    expect(plan).toEqual({ width: 4032, height: 3024, mime: "image/jpeg", quality: IMAGE_SETTINGS.xray.quality });
    expect(IMAGE_SETTINGS.xray.quality).toBeGreaterThan(IMAGE_SETTINGS.photo.quality);
    expect(IMAGE_SETTINGS.xray.maxEdge).toBeGreaterThanOrEqual(4000);
  });

  it("never enlarges a small image", () => {
    expect(planImage({ kind: "photo", width: 800, height: 600, mime: "image/jpeg" })).toMatchObject({
      width: 800,
      height: 600,
    });
  });

  it("keeps a PNG X-ray lossless (PNG), shrinking only if it is huge", () => {
    expect(planImage({ kind: "xray", width: 1200, height: 900, mime: "image/png" })).toMatchObject({
      mime: "image/png",
      width: 1200,
    });
    expect(planImage({ kind: "xray", width: 8000, height: 4000, mime: "image/png" })).toMatchObject({
      mime: "image/png",
      width: 4096,
      height: 2048,
    });
  });

  it("turns a PNG photo into JPEG", () => {
    expect(planImage({ kind: "photo", width: 1000, height: 1000, mime: "image/png" }).mime).toBe("image/jpeg");
  });

  it("works for portrait images and documents kept as photos", () => {
    expect(planImage({ kind: "document", width: 3024, height: 4032, mime: "image/heic" })).toMatchObject({
      width: 1920,
      height: 2560,
      mime: "image/jpeg",
    });
  });
});

describe("planThumbnail", () => {
  it("is a small JPEG", () => {
    expect(planThumbnail({ width: 4032, height: 3024 })).toEqual({
      width: IMAGE_SETTINGS.thumb.maxEdge,
      height: 360,
      mime: "image/jpeg",
      quality: IMAGE_SETTINGS.thumb.quality,
    });
  });
});

describe("chooseUpload", () => {
  it("uses the re-encoded image (smaller, and without hidden photo data such as location)", () => {
    expect(chooseUpload({ originalSize: 4 * MB, encodedSize: 900_000 })).toBe("encoded");
    expect(chooseUpload({ originalSize: 300_000, encodedSize: 400_000 })).toBe("encoded");
  });

  it("uploads the original when the phone could not read the image (e.g. HEIC outside Safari)", () => {
    expect(chooseUpload({ originalSize: 3 * MB, encodedSize: null })).toBe("original");
  });

  it("falls back to the original if re-encoding somehow made it too large", () => {
    expect(chooseUpload({ originalSize: 20 * MB, encodedSize: 30 * MB })).toBe("original");
  });

  it("says too large when nothing fits", () => {
    expect(chooseUpload({ originalSize: 40 * MB, encodedSize: 30 * MB })).toBe("too_large");
    expect(chooseUpload({ originalSize: 40 * MB, encodedSize: null })).toBe("too_large");
  });
});
