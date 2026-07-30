import { computeMissingPersonCount, validateEmergencyActivationStatusTransition } from "./emergency-activation-rules";

describe("validateEmergencyActivationStatusTransition", () => {
  it("mengizinkan ACTIVE->ALL_CLEAR_DECLARED dan ACTIVE->STOOD_DOWN", () => {
    expect(() => validateEmergencyActivationStatusTransition("ACTIVE", "ALL_CLEAR_DECLARED")).not.toThrow();
    expect(() => validateEmergencyActivationStatusTransition("ACTIVE", "STOOD_DOWN")).not.toThrow();
  });

  it("menolak transisi apa pun dari status terminal ALL_CLEAR_DECLARED/STOOD_DOWN", () => {
    expect(() => validateEmergencyActivationStatusTransition("ALL_CLEAR_DECLARED", "ACTIVE")).toThrow();
    expect(() => validateEmergencyActivationStatusTransition("STOOD_DOWN", "ACTIVE")).toThrow();
  });
});

describe("computeMissingPersonCount (BR-07)", () => {
  it("null kalau totalExpectedHeadcount null (estimasi tidak pernah diisi)", () => {
    expect(computeMissingPersonCount(null, 5)).toBeNull();
  });

  it("menghitung selisih biasa", () => {
    expect(computeMissingPersonCount(50, 42)).toBe(8);
  });

  it("clamp ke 0 kalau checked-in MELEBIHI expected (bukan negatif)", () => {
    expect(computeMissingPersonCount(20, 25)).toBe(0);
  });

  it("0 kalau seluruh expected sudah checked-in", () => {
    expect(computeMissingPersonCount(30, 30)).toBe(0);
  });
});
