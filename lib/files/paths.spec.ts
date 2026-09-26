import { describe, expect, it } from "vitest";
import { storagePathFor, thumbPathFor } from "./paths";

const pg = "11111111-1111-4111-8111-111111111111";
const kase = "22222222-2222-4222-8222-222222222222";
const file = "33333333-3333-4333-8333-333333333333";

describe("storage paths", () => {
  it("puts the file under the PG, the case and the file id, without the original name", () => {
    expect(storagePathFor({ pgId: pg, caseId: kase, fileId: file, mime: "image/jpeg" })).toBe(
      `${pg}/${kase}/${file}/original.jpg`,
    );
    expect(storagePathFor({ pgId: pg, caseId: kase, fileId: file, mime: "application/pdf" })).toBe(
      `${pg}/${kase}/${file}/original.pdf`,
    );
  });

  it("keeps the thumbnail next to it", () => {
    expect(thumbPathFor({ pgId: pg, caseId: kase, fileId: file })).toBe(`${pg}/${kase}/${file}/thumb.jpg`);
  });
});
