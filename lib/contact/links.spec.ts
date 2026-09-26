import { describe, expect, it } from "vitest";
import { telHref, whatsappHref } from "./links";

describe("contact links", () => {
  it("dials with the country code", () => {
    expect(telHref("9876543210")).toBe("tel:+919876543210");
  });

  it("opens the patient's WhatsApp chat", () => {
    expect(whatsappHref("9876543210")).toBe("https://wa.me/919876543210");
  });

  it("encodes a pre-filled message", () => {
    expect(whatsappHref("9876543210", "Hi & bye?")).toBe("https://wa.me/919876543210?text=Hi%20%26%20bye%3F");
  });
});
