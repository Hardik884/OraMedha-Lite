import { describe, expect, it } from "vitest";
import {
  cleanEmail,
  emailAuthError,
  isEmailLinkType,
  validateCredentials,
  validateEmail,
  validateNewPassword,
} from "./email";

describe("cleanEmail / validateEmail", () => {
  it("tidies and accepts ordinary addresses", () => {
    expect(cleanEmail("  Riya.Singh@Gmail.com ")).toBe("riya.singh@gmail.com");
    expect(validateEmail("riya.singh@gmail.com")).toBeUndefined();
    expect(validateEmail("pg@college.edu.in")).toBeUndefined();
  });

  it.each(["", "riya", "riya@", "riya@gmail", "ri ya@gmail.com", "@gmail.com"])("refuses %j", (email) => {
    expect(validateEmail(email)).toBeDefined();
  });

  it("is safe with non-strings", () => {
    expect(cleanEmail(undefined)).toBe("");
    expect(cleanEmail(42)).toBe("");
  });
});

describe("validateNewPassword", () => {
  it("wants 8+ characters with letters and numbers", () => {
    expect(validateNewPassword("opd2026clinic")).toBeUndefined();
    expect(validateNewPassword("")).toBe("Choose a password");
    expect(validateNewPassword("abc12")).toContain("at least 8");
    expect(validateNewPassword("abcdefghij")).toContain("letters and numbers");
    expect(validateNewPassword("1234567890")).toContain("letters and numbers");
  });

  it("refuses passwords longer than bcrypt can use", () => {
    expect(validateNewPassword(`a1${"x".repeat(71)}`)).toBe("That password is too long");
    expect(validateNewPassword(`a1${"x".repeat(70)}`)).toBeUndefined();
    // 72 bytes, not 72 characters: Devanagari letters are 3 bytes each.
    expect(validateNewPassword(`a1${"क".repeat(24)}`)).toBe("That password is too long");
  });
});

describe("validateCredentials", () => {
  it("only needs some password to sign in", () => {
    expect(validateCredentials({ email: " A@B.co ", password: "x" }, "sign-in")).toEqual({
      ok: true,
      email: "a@b.co",
      password: "x",
    });
  });

  it("checks password strength to sign up, and reports both fields at once", () => {
    expect(validateCredentials({ email: "nope", password: "short" }, "sign-up")).toEqual({
      ok: false,
      errors: { email: expect.any(String), password: expect.stringContaining("at least 8") },
    });
    expect(validateCredentials({ email: "a@b.co", password: "" }, "sign-in")).toEqual({
      ok: false,
      errors: { password: "Enter your password" },
    });
  });
});

describe("emailAuthError", () => {
  it.each([
    ["invalid_credentials", "don't match"],
    ["email_not_confirmed", "Confirm your email"],
    ["weak_password", "stronger password"],
    ["over_email_send_rate_limit", "Too many attempts"],
    ["email_provider_disabled", "isn't switched on"],
    ["user_already_exists", "already an account"],
  ])("%s", (code, expected) => {
    expect(emailAuthError(code)).toContain(expected);
  });

  it("falls back on the message, then a generic sentence", () => {
    expect(emailAuthError(undefined, "Failed to fetch")).toContain("Couldn't reach");
    expect(emailAuthError("something_new")).toBe("Something went wrong. Please try again.");
  });

  it("never echoes the email back", () => {
    expect(emailAuthError("invalid_credentials", "riya@gmail.com")).not.toContain("riya");
  });
});

describe("isEmailLinkType", () => {
  it("accepts Supabase's email link types only", () => {
    expect(isEmailLinkType("recovery")).toBe(true);
    expect(isEmailLinkType("email")).toBe(true);
    expect(isEmailLinkType("sms")).toBe(false);
    expect(isEmailLinkType(null)).toBe(false);
  });
});
