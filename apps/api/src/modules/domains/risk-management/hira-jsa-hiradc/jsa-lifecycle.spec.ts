import { validateJsaRecordStatusTransition } from "./jsa-lifecycle";

describe("validateJsaRecordStatusTransition", () => {
  it.each([
    ["DRAFT", "APPROVED"],
    ["APPROVED", "ACTIVE"],
    ["ACTIVE", "EXPIRED"],
    ["ACTIVE", "ARCHIVED"],
    ["EXPIRED", "ARCHIVED"],
  ] as const)("allows %s -> %s", (from, to) => {
    expect(() => validateJsaRecordStatusTransition(from, to)).not.toThrow();
  });

  it.each([
    ["DRAFT", "ACTIVE"],
    ["DRAFT", "EXPIRED"],
    ["APPROVED", "EXPIRED"],
    ["APPROVED", "ARCHIVED"],
    ["ARCHIVED", "ACTIVE"],
    ["EXPIRED", "ACTIVE"],
  ] as const)("rejects %s -> %s", (from, to) => {
    expect(() => validateJsaRecordStatusTransition(from, to)).toThrow();
  });
});
