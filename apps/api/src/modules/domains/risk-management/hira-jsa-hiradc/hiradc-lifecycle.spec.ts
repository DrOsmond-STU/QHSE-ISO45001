import { assertHasBaselineOrStandaloneLines, validateHiradcRecordStatusTransition } from "./hiradc-lifecycle";

describe("validateHiradcRecordStatusTransition", () => {
  it.each([
    ["DRAFT", "VERIFIED"],
    ["VERIFIED", "APPROVED"],
    ["VERIFIED", "EXPIRED"],
    ["APPROVED", "EXPIRED"],
  ] as const)("allows %s -> %s", (from, to) => {
    expect(() => validateHiradcRecordStatusTransition(from, to)).not.toThrow();
  });

  it.each([
    ["DRAFT", "APPROVED"],
    ["DRAFT", "EXPIRED"],
    ["APPROVED", "VERIFIED"],
    ["EXPIRED", "DRAFT"],
  ] as const)("rejects %s -> %s", (from, to) => {
    expect(() => validateHiradcRecordStatusTransition(from, to)).toThrow();
  });
});

describe("assertHasBaselineOrStandaloneLines (BR-03)", () => {
  it("allows when related_hira_id is present", () => {
    expect(() => assertHasBaselineOrStandaloneLines({ relatedHiraId: "hira-1", relatedJsaId: null, lineCount: 0 })).not.toThrow();
  });

  it("allows when related_jsa_id is present", () => {
    expect(() => assertHasBaselineOrStandaloneLines({ relatedHiraId: null, relatedJsaId: "jsa-1", lineCount: 0 })).not.toThrow();
  });

  it("allows when no baseline but standalone lines exist", () => {
    expect(() => assertHasBaselineOrStandaloneLines({ relatedHiraId: null, relatedJsaId: null, lineCount: 1 })).not.toThrow();
  });

  it("throws when no baseline and no standalone lines", () => {
    expect(() => assertHasBaselineOrStandaloneLines({ relatedHiraId: null, relatedJsaId: null, lineCount: 0 })).toThrow(/BR-03/);
  });
});
