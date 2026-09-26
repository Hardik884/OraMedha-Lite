import { describe, expect, it } from "vitest";
import {
  describeUploadError,
  isUnfinished,
  nextToStart,
  retryDelayMs,
  summarizeUploads,
  type UploadItem,
} from "./queue";

function item(id: string, over: Partial<UploadItem> = {}): UploadItem {
  return {
    id,
    caseId: "c1",
    patientId: "p1",
    visitId: null,
    kind: "photo",
    label: null,
    originalName: `${id}.jpg`,
    mime: "image/jpeg",
    size: 1000,
    status: "waiting",
    progress: 0,
    error: null,
    retryable: true,
    attempts: 0,
    addedAt: 0,
    ...over,
  };
}

describe("nextToStart", () => {
  it("starts waiting uploads in order, at most `limit` at a time", () => {
    const items = [item("a", { status: "uploading" }), item("b"), item("c"), item("d")];
    expect(nextToStart(items, 2).map((i) => i.id)).toEqual(["b"]);
    expect(nextToStart(items, 3).map((i) => i.id)).toEqual(["b", "c"]);
  });

  it("counts preparing and saving as busy", () => {
    const items = [item("a", { status: "preparing" }), item("b", { status: "saving" }), item("c")];
    expect(nextToStart(items, 2)).toEqual([]);
  });

  it("waits for an automatic retry's time", () => {
    const items = [item("a", { retryAt: 5000 }), item("b")];
    expect(nextToStart(items, 2, 1000).map((i) => i.id)).toEqual(["b"]);
    expect(nextToStart(items, 2, 6000).map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("does not restart failed or finished ones", () => {
    expect(nextToStart([item("a", { status: "failed" }), item("b", { status: "done" })], 2)).toEqual([]);
  });
});

describe("summarizeUploads", () => {
  it("adds up progress by size across unfinished uploads", () => {
    const s = summarizeUploads([
      item("a", { status: "uploading", size: 3000, progress: 0.5 }),
      item("b", { status: "waiting", size: 1000 }),
      item("c", { status: "done", size: 5000, progress: 1 }),
      item("d", { status: "failed", size: 1000 }),
    ]);
    expect(s).toEqual({ active: 2, failed: 1, done: 1, progress: 1500 / 4000 });
  });

  it("counts an upload waiting to retry on its own as still going", () => {
    expect(summarizeUploads([item("a", { retryAt: 9e15, error: "Trying again…" })]).active).toBe(1);
  });

  it("is empty-safe", () => {
    expect(summarizeUploads([])).toEqual({ active: 0, failed: 0, done: 0, progress: 0 });
  });
});

describe("isUnfinished — warn before the page is closed", () => {
  it("anything not saved yet, including failed uploads (they would be lost)", () => {
    expect(isUnfinished(item("a"))).toBe(true);
    expect(isUnfinished(item("a", { status: "uploading" }))).toBe(true);
    expect(isUnfinished(item("a", { status: "failed" }))).toBe(true);
    expect(isUnfinished(item("a", { status: "done" }))).toBe(false);
  });
});

describe("describeUploadError", () => {
  it("no connection → retry later", () => {
    expect(describeUploadError({ offline: true })).toEqual({
      message: "No internet. It will try again when you're back online.",
      retryable: true,
    });
    expect(describeUploadError({ status: 0 })).toMatchObject({ retryable: true, message: expect.stringMatching(/connection/i) });
  });

  it("signed out → sign in again", () => {
    expect(describeUploadError({ status: 401 })).toMatchObject({ retryable: false, message: expect.stringMatching(/sign in/i) });
  });

  it("refused type or size → not retryable, plain words", () => {
    expect(describeUploadError({ status: 413 })).toMatchObject({ retryable: false, message: expect.stringMatching(/25 MB/) });
    expect(describeUploadError({ status: 415 })).toMatchObject({ retryable: false });
  });

  it("server trouble → retryable", () => {
    expect(describeUploadError({ status: 503 })).toMatchObject({ retryable: true });
  });

  it("anything else → a friendly retryable message", () => {
    expect(describeUploadError({})).toMatchObject({ retryable: true, message: expect.stringMatching(/try again/i) });
  });
});

describe("retryDelayMs", () => {
  it("backs off and then stops retrying on its own", () => {
    expect(retryDelayMs(1)).toBe(2000);
    expect(retryDelayMs(2)).toBe(6000);
    expect(retryDelayMs(3)).toBeNull();
  });
});
