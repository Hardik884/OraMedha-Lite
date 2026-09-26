import { describe, expect, it } from "vitest";
import { getInitials } from "./PatientAvatar";

describe("getInitials", () => {
  it("takes the first letter of the first two names", () => {
    expect(getInitials("Rahul Sharma")).toBe("RS");
    expect(getInitials("neha")).toBe("N");
    expect(getInitials("Aman Kumar Verma")).toBe("AK");
  });

  it("ignores extra spaces", () => {
    expect(getInitials("  Riya   Singh ")).toBe("RS");
  });
});
