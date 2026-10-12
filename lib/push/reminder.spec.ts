import { describe, expect, it } from "vitest";
import {
  formatReminderTime,
  isWrapUpReminderTime,
  reminderTimeFromDb,
  testPushMessage,
  wrapUpReminderMessage,
} from "./reminder";

describe("reminder times", () => {
  it("accepts only the offered evening times", () => {
    expect(isWrapUpReminderTime("19:00")).toBe(true);
    expect(isWrapUpReminderTime("19:30")).toBe(false);
    expect(isWrapUpReminderTime("03:00")).toBe(false);
    expect(isWrapUpReminderTime(19)).toBe(false);
  });

  it("formats times the way people say them", () => {
    expect(formatReminderTime("19:00")).toBe("7 PM");
    expect(formatReminderTime("21:00:00")).toBe("9 PM");
    expect(formatReminderTime("12:30")).toBe("12:30 PM");
    expect(formatReminderTime("00:00")).toBe("12 AM");
  });

  it("reads the database's time, or none", () => {
    expect(reminderTimeFromDb("19:00:00")).toBe("19:00");
    expect(reminderTimeFromDb(null)).toBeNull();
    expect(reminderTimeFromDb("19:30:00")).toBeNull();
  });
});

describe("notification text", () => {
  it("counts patients and never names them", () => {
    expect(wrapUpReminderMessage("App", 1)).toEqual({
      title: "App",
      body: "1 patient to wrap up today. Takes a minute.",
      url: "/wrap-up",
      tag: "wrap-up",
    });
    expect(wrapUpReminderMessage("App", 5).body).toBe("5 patients to wrap up today. Takes a few minutes.");
  });

  it("has a test message that opens the reminder settings", () => {
    expect(testPushMessage("App").url).toBe("/settings/reminder");
  });
});
