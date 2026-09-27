import { describe, expect, it } from "vitest";
import { isTestEmail, isTestSignInEnabled } from "./test-sign-in";

const LOCAL = { requireLocal: "1", supabaseUrl: "http://127.0.0.1:54321", nodeEnv: "development" };

describe("isTestSignInEnabled", () => {
  it("is on only for the local test server against the local stack", () => {
    expect(isTestSignInEnabled(LOCAL)).toBe(true);
    expect(isTestSignInEnabled({ ...LOCAL, supabaseUrl: "http://localhost:54321" })).toBe(true);
  });

  it("is off against the hosted project, whatever else is set", () => {
    expect(isTestSignInEnabled({ ...LOCAL, supabaseUrl: "https://dicoaegpjohnybnklrui.supabase.co" })).toBe(false);
    expect(isTestSignInEnabled({ ...LOCAL, supabaseUrl: "https://localhost:54321" })).toBe(false);
    expect(isTestSignInEnabled({ ...LOCAL, supabaseUrl: undefined })).toBe(false);
  });

  it("is off without the local-server flag and in production builds", () => {
    expect(isTestSignInEnabled({ ...LOCAL, requireLocal: undefined })).toBe(false);
    expect(isTestSignInEnabled({ ...LOCAL, requireLocal: "true" })).toBe(false);
    expect(isTestSignInEnabled({ ...LOCAL, nodeEnv: "production" })).toBe(false);
  });
});

describe("isTestEmail", () => {
  it("accepts only .test addresses", () => {
    expect(isTestEmail("pg1@oramedha.test")).toBe(true);
    expect(isTestEmail("someone@gmail.com")).toBe(false);
    expect(isTestEmail("pg1@test.local")).toBe(false);
    expect(isTestEmail("not an email")).toBe(false);
  });
});
