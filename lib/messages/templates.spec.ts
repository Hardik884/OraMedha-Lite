import { describe, expect, it } from "vitest";
import { LANGUAGES, MESSAGE_KINDS, messageText, type MessageContext } from "./templates";

// Tue, 29 Sep 2026, 11:00 AM IST
const ctx: MessageContext = {
  patientName: "Rahul Sharma",
  pgName: "Dr Riya Singh",
  college: "City Dental College",
  startsAt: "2026-09-29T05:30:00Z",
  now: new Date("2026-09-28T13:30:00Z"), // Mon 28 Sep, 7:00 PM IST
};

describe("messageText (English)", () => {
  it("appointment booked: date, time, a way to confirm, signed by the PG", () => {
    expect(messageText("booked", ctx)).toBe(
      "Hello Rahul Sharma, your dental appointment is booked for Tue, 29 Sep at 11:00 AM. " +
        "Please reply YES to confirm, or tell us if you need another time.\n— Dr Riya Singh, City Dental College",
    );
  });

  it("reminder the evening before says tomorrow", () => {
    expect(messageText("reminder", ctx)).toContain("tomorrow, Tue, 29 Sep at 11:00 AM");
  });

  it("reminder on the day says today", () => {
    const text = messageText("reminder", { ...ctx, now: new Date("2026-09-29T03:30:00Z") });
    expect(text).toContain("today at 11:00 AM");
    expect(text).not.toContain("tomorrow");
  });

  it("reminder further ahead gives the date", () => {
    const text = messageText("reminder", { ...ctx, now: new Date("2026-09-25T13:30:00Z") });
    expect(text).toContain("on Tue, 29 Sep at 11:00 AM");
  });

  it("rescheduled gives the new time", () => {
    expect(messageText("rescheduled", ctx)).toContain("has been moved to Tue, 29 Sep at 11:00 AM");
  });

  it("missed asks the patient to call, with the missed date", () => {
    const text = messageText("missed", { ...ctx, now: new Date("2026-09-30T05:30:00Z") });
    expect(text).toContain("we missed you at your dental appointment on Tue, 29 Sep");
    expect(text).toMatch(/call us/i);
  });

  it("every message leaves out clinical details — only name, date, time, PG and college", () => {
    for (const lang of LANGUAGES) {
      for (const kind of MESSAGE_KINDS) {
        const text = messageText(kind, ctx, lang);
        expect(text).toContain("Rahul Sharma");
        expect(text).toContain("Dr Riya Singh, City Dental College");
        // The context has no case, tooth or stage to leak — and the type forbids adding one here.
        expect(text).not.toMatch(/tooth|stage|treatment|procedure/i);
      }
    }
  });

  it("tidies stray spaces in the name", () => {
    expect(messageText("booked", { ...ctx, patientName: "  Neha   Jain " })).toMatch(/^Hello Neha Jain,/);
  });
});
