import { describe, expect, it } from "vitest";
import { samePhoneHint } from "./duplicates";

describe("samePhoneHint", () => {
  it("nothing when no one else has the number", () => {
    expect(samePhoneHint([])).toBeNull();
  });

  it("names the patient and offers to open them by first name", () => {
    expect(samePhoneHint([{ id: "1", fullName: "Rahul Sharma" }])).toEqual({
      text: "Rahul Sharma already uses this number — same person?",
      openLabel: "Open Rahul",
    });
  });

  it("a shared family phone", () => {
    expect(samePhoneHint([{ id: "1", fullName: "Rahul Sharma" }, { id: "2", fullName: "Sita Sharma" }])?.text).toBe(
      "Rahul Sharma and 1 other patient already use this number — same person?",
    );
    expect(
      samePhoneHint([
        { id: "1", fullName: "A B" },
        { id: "2", fullName: "C" },
        { id: "3", fullName: "D" },
      ])?.text,
    ).toBe("A B and 2 other patients already use this number — same person?");
  });
});
