import { assertClosureReadyForClosed } from "./work-permit-closure-rules";

describe("assertClosureReadyForClosed — BR-06", () => {
  it("melempar kalau closure belum VERIFIED", () => {
    expect(() => assertClosureReadyForClosed("SUBMITTED", false, false)).toThrow();
    expect(() => assertClosureReadyForClosed("RETURNED", false, false)).toThrow();
  });

  it("tidak melempar kalau VERIFIED dan requiresLoto=false, apa pun isolationRemovedConfirmed", () => {
    expect(() => assertClosureReadyForClosed("VERIFIED", false, false)).not.toThrow();
    expect(() => assertClosureReadyForClosed("VERIFIED", false, true)).not.toThrow();
  });

  it("melempar kalau VERIFIED, requiresLoto=true, tapi isolationRemovedConfirmed=false", () => {
    expect(() => assertClosureReadyForClosed("VERIFIED", true, false)).toThrow();
  });

  it("tidak melempar kalau VERIFIED, requiresLoto=true, DAN isolationRemovedConfirmed=true", () => {
    expect(() => assertClosureReadyForClosed("VERIFIED", true, true)).not.toThrow();
  });
});
