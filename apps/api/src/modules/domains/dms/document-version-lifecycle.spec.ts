import {
  assertCanBeCurrentVersion,
  computeNextVersionNumber,
  validateDocumentVersionStatusTransition,
} from "./document-version-lifecycle";

describe("validateDocumentVersionStatusTransition", () => {
  it.each([
    ["DRAFT", "PENDING_APPROVAL"],
    ["PENDING_APPROVAL", "APPROVED"],
    ["PENDING_APPROVAL", "REJECTED"],
    ["APPROVED", "PUBLISHED"],
    ["PUBLISHED", "SUPERSEDED"],
  ] as const)("mengizinkan %s -> %s", (from, to) => {
    expect(() => validateDocumentVersionStatusTransition(from, to)).not.toThrow();
  });

  it.each([
    ["DRAFT", "PUBLISHED"],
    ["DRAFT", "APPROVED"],
    ["PENDING_APPROVAL", "PUBLISHED"],
    ["REJECTED", "PENDING_APPROVAL"],
    ["SUPERSEDED", "PUBLISHED"],
    ["PUBLISHED", "DRAFT"],
  ] as const)("menolak %s -> %s", (from, to) => {
    expect(() => validateDocumentVersionStatusTransition(from, to)).toThrow();
  });
});

describe("assertCanBeCurrentVersion (BR-02)", () => {
  it("lolos untuk PUBLISHED", () => {
    expect(() => assertCanBeCurrentVersion("PUBLISHED")).not.toThrow();
  });

  it.each(["DRAFT", "PENDING_APPROVAL", "APPROVED", "SUPERSEDED", "REJECTED"] as const)("menolak %s", (status) => {
    expect(() => assertCanBeCurrentVersion(status)).toThrow();
  });
});

describe("computeNextVersionNumber", () => {
  it("dokumen baru (previous null) -> 1.0 terlepas dari bump", () => {
    expect(computeNextVersionNumber(null, "MAJOR")).toEqual({ majorVersion: 1, minorVersion: 0 });
    expect(computeNextVersionNumber(null, "MINOR")).toEqual({ majorVersion: 1, minorVersion: 0 });
  });

  it("MAJOR bump -> major+1, minor reset ke 0", () => {
    expect(computeNextVersionNumber({ majorVersion: 2, minorVersion: 3 }, "MAJOR")).toEqual({
      majorVersion: 3,
      minorVersion: 0,
    });
  });

  it("MINOR bump -> major tetap, minor+1", () => {
    expect(computeNextVersionNumber({ majorVersion: 2, minorVersion: 3 }, "MINOR")).toEqual({
      majorVersion: 2,
      minorVersion: 4,
    });
  });
});
