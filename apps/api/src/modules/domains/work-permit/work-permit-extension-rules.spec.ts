import { assertExtensionRequestAllowed } from "./work-permit-extension-rules";

describe("assertExtensionRequestAllowed — BR-07", () => {
  const plannedEnd = new Date("2026-08-01T18:00:00Z");

  it("tidak melempar kalau sebelum planned_end_datetime dan di bawah batas maksimum", () => {
    expect(() => assertExtensionRequestAllowed(new Date("2026-08-01T12:00:00Z"), plannedEnd, 0, 1)).not.toThrow();
  });

  it("melempar kalau sudah melewati planned_end_datetime", () => {
    expect(() => assertExtensionRequestAllowed(new Date("2026-08-01T19:00:00Z"), plannedEnd, 0, 1)).toThrow();
  });

  it("melempar kalau tepat di planned_end_datetime (batas eksklusif)", () => {
    expect(() => assertExtensionRequestAllowed(plannedEnd, plannedEnd, 0, 1)).toThrow();
  });

  it("melempar kalau existingExtensionCount sudah mencapai maxExtensionCount", () => {
    expect(() => assertExtensionRequestAllowed(new Date("2026-08-01T12:00:00Z"), plannedEnd, 1, 1)).toThrow();
    expect(() => assertExtensionRequestAllowed(new Date("2026-08-01T12:00:00Z"), plannedEnd, 3, 2)).toThrow();
  });

  it("tidak melempar kalau existingExtensionCount masih di bawah maxExtensionCount", () => {
    expect(() => assertExtensionRequestAllowed(new Date("2026-08-01T12:00:00Z"), plannedEnd, 1, 2)).not.toThrow();
  });
});
