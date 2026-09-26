import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("joins conditional classes", () => {
    expect(cn("a", false && "b", "c")).toBe("a c");
  });

  it("lets a later class override a conflicting earlier one", () => {
    expect(cn("h-9 px-4", "h-12")).toBe("px-4 h-12");
  });

  it("resolves conflicts between custom colour tokens", () => {
    expect(cn("bg-surface", "bg-accent")).toBe("bg-accent");
  });
});
