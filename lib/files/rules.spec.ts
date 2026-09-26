import { describe, expect, it } from "vitest";
import {
  MAX_FILE_BYTES,
  checkFile,
  defaultKind,
  displayName,
  extensionFor,
  formatBytes,
  isImageMime,
  resolveMime,
} from "./rules";

const MB = 1024 * 1024;

describe("resolveMime", () => {
  it("uses the type the phone reports when it is allowed", () => {
    expect(resolveMime("scan.jpg", "image/jpeg")).toBe("image/jpeg");
    expect(resolveMime("x.pdf", "application/pdf")).toBe("application/pdf");
  });

  it("falls back to the extension when the phone reports nothing or something generic", () => {
    expect(resolveMime("Case.PPTX", "")).toBe(
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    );
    expect(resolveMime("IMG_0001.HEIC", "application/octet-stream")).toBe("image/heic");
    expect(resolveMime("photo.jpeg", "")).toBe("image/jpeg");
  });

  it("treats image/jpg as JPEG", () => {
    expect(resolveMime("a.jpg", "image/jpg")).toBe("image/jpeg");
  });

  it("isn't fooled by names every object has", () => {
    expect(resolveMime("x", "toString")).toBeNull();
    expect(resolveMime("x.constructor", "")).toBeNull();
    expect(isImageMime("constructor")).toBe(false);
  });

  it("refuses types that are not on the list", () => {
    expect(resolveMime("archive.zip", "application/zip")).toBeNull();
    expect(resolveMime("clip.mp4", "video/mp4")).toBeNull();
    expect(resolveMime("noextension", "")).toBeNull();
  });
});

describe("checkFile", () => {
  it("accepts an allowed file within the limit", () => {
    expect(checkFile({ name: "a.jpg", type: "image/jpeg", size: 3 * MB })).toEqual({
      ok: true,
      mime: "image/jpeg",
      isImage: true,
    });
    expect(checkFile({ name: "c.pdf", type: "application/pdf", size: 1000 })).toMatchObject({
      ok: true,
      isImage: false,
    });
  });

  it("explains a wrong type in plain words", () => {
    const r = checkFile({ name: "notes.zip", type: "application/zip", size: 1000 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/can't be added.*photos.*PDF/i);
  });

  it("explains a file that is too large, with its size", () => {
    const r = checkFile({ name: "big.pdf", type: "application/pdf", size: 31 * MB });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("big.pdf is 31 MB. Files can be up to 25 MB.");
  });

  it("lets an image over the limit through, because it is shrunk before upload", () => {
    expect(checkFile({ name: "huge.jpg", type: "image/jpeg", size: 40 * MB }).ok).toBe(true);
  });

  it("refuses an empty file", () => {
    const r = checkFile({ name: "e.pdf", type: "application/pdf", size: 0 });
    expect(r.ok).toBe(false);
  });

  it("uses a 25 MB limit", () => {
    expect(MAX_FILE_BYTES).toBe(25 * MB);
  });
});

describe("defaultKind", () => {
  it("documents are documents", () => {
    expect(defaultKind("application/pdf", "xray")).toBe("document");
  });
  it("images follow the button the PG tapped, photo by default", () => {
    expect(defaultKind("image/jpeg", "xray")).toBe("xray");
    expect(defaultKind("image/jpeg")).toBe("photo");
    expect(defaultKind("image/png", "document")).toBe("photo");
  });
});

describe("helpers", () => {
  it("isImageMime", () => {
    expect(isImageMime("image/heic")).toBe(true);
    expect(isImageMime("application/pdf")).toBe(false);
  });

  it("extensionFor", () => {
    expect(extensionFor("image/jpeg")).toBe("jpg");
    expect(extensionFor("application/vnd.ms-powerpoint")).toBe("ppt");
  });

  it("formatBytes", () => {
    expect(formatBytes(900)).toBe("1 KB");
    expect(formatBytes(820 * 1024)).toBe("820 KB");
    expect(formatBytes(1.24 * MB)).toBe("1.2 MB");
    expect(formatBytes(31 * MB)).toBe("31 MB");
  });

  it("displayName: label first, then the document's own name, then the type", () => {
    expect(displayName({ label: "Pre-op", originalName: "IMG_1.jpg", kind: "photo" })).toBe("Pre-op");
    expect(displayName({ label: null, originalName: "Consent form.pdf", kind: "document" })).toBe("Consent form");
    expect(displayName({ label: null, originalName: "IMG_1.jpg", kind: "xray" })).toBe("X-ray");
    expect(displayName({ label: null, originalName: null, kind: "photo" })).toBe("Photo");
  });
});
