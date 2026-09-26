import { describe, expect, it } from "vitest";
import { isUuid, newId } from "./ids";

describe("newId", () => {
  it("makes valid, distinct v4 UUIDs", () => {
    const ids = Array.from({ length: 200 }, newId);
    for (const id of ids) {
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      expect(isUuid(id)).toBe(true);
    }
    expect(new Set(ids).size).toBe(200);
  });

  it("isUuid rejects non-ids", () => {
    expect(isUuid("abc")).toBe(false);
    expect(isUuid(null)).toBe(false);
  });
});
