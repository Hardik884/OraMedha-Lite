import { describe, expect, it } from "vitest";
import { friendlyAuthError } from "./errors";

describe("friendlyAuthError", () => {
  it.each([
    ["Unsupported phone provider", "Phone sign-in isn't switched on yet"],
    ["Phone logins are disabled", "Phone sign-in isn't switched on yet"],
    ["For security purposes, you can only request this after 30 seconds.", "Too many attempts"],
    ["Token has expired or is invalid", "That code is wrong or has expired"],
    ["Failed to fetch", "Couldn't reach OraMedha"],
    ["Signups not allowed for otp", "New sign-ups are closed"],
    ["weird", "Something went wrong"],
  ])("%s", (raw, expected) => {
    expect(friendlyAuthError(raw)).toContain(expected);
  });
});
