import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { THEME_COLORS } from "./colors";

const css = readFileSync(
  fileURLToPath(new URL("../../app/globals.css", import.meta.url)),
  "utf8",
);

/** The value of `--name` inside the first block whose selector matches. */
function tokenIn(blockStart: RegExp, name: string): string | undefined {
  const start = css.search(blockStart);
  if (start < 0) return undefined;
  const block = css.slice(start, css.indexOf("\n}", start));
  return block.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`))?.[1];
}

describe("THEME_COLORS mirrors app/globals.css", () => {
  it("light values match the @theme block", () => {
    expect(tokenIn(/@theme \{/, "color-background")).toBe(THEME_COLORS.light.background);
    expect(tokenIn(/@theme \{/, "color-text-primary")).toBe(THEME_COLORS.light.textPrimary);
  });

  it("dark values match the .dark block", () => {
    expect(tokenIn(/^\.dark \{/m, "color-background")).toBe(THEME_COLORS.dark.background);
    expect(tokenIn(/^\.dark \{/m, "color-text-primary")).toBe(THEME_COLORS.dark.textPrimary);
  });
});
