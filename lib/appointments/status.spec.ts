import { describe, expect, it } from "vitest";
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_LABELS,
  getAppointmentStatusVariant,
} from "./status";

describe("appointment status chips", () => {
  it("every status has a label", () => {
    for (const status of APPOINTMENT_STATUSES) {
      expect(APPOINTMENT_STATUS_LABELS[status]).toBeTruthy();
    }
  });

  it("follows the design-system colour meaning", () => {
    expect(getAppointmentStatusVariant("confirmed")).toBe("success");
    expect(getAppointmentStatusVariant("completed")).toBe("success");
    expect(getAppointmentStatusVariant("unconfirmed")).toBe("warning");
    expect(getAppointmentStatusVariant("missed")).toBe("danger");
    expect(getAppointmentStatusVariant("cancelled")).toBe("danger");
    expect(getAppointmentStatusVariant("scheduled")).toBe("secondary");
  });
});
