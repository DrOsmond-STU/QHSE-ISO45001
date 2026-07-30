import { assertGasTestPassedIfRequired, assertLotoVerifiedIfRequired } from "./work-permit-activation-rules";

describe("assertGasTestPassedIfRequired — BR-02", () => {
  it("tidak melempar kalau requiresGasTest=false, apa pun isi results", () => {
    expect(() => assertGasTestPassedIfRequired(false, [])).not.toThrow();
    expect(() => assertGasTestPassedIfRequired(false, [{ result: "FAIL" }])).not.toThrow();
  });

  it("melempar kalau requiresGasTest=true TANPA hasil sama sekali", () => {
    expect(() => assertGasTestPassedIfRequired(true, [])).toThrow();
  });

  it("melempar kalau requiresGasTest=true tapi seluruh hasil FAIL", () => {
    expect(() => assertGasTestPassedIfRequired(true, [{ result: "FAIL" }, { result: "FAIL" }])).toThrow();
  });

  it("tidak melempar kalau requiresGasTest=true DAN minimal satu PASS (retest berhasil sesudah FAIL tetap lolos)", () => {
    expect(() => assertGasTestPassedIfRequired(true, [{ result: "FAIL" }, { result: "PASS" }])).not.toThrow();
  });
});

describe("assertLotoVerifiedIfRequired — BR-03", () => {
  it("tidak melempar kalau requiresLoto=false, apa pun isi records", () => {
    expect(() => assertLotoVerifiedIfRequired(false, [])).not.toThrow();
    expect(() => assertLotoVerifiedIfRequired(false, [{ status: "APPLIED" }])).not.toThrow();
  });

  it("melempar kalau requiresLoto=true TANPA record sama sekali (interpretasi diperluas, bukan vacuously-true)", () => {
    expect(() => assertLotoVerifiedIfRequired(true, [])).toThrow();
  });

  it("melempar kalau requiresLoto=true tapi ADA record yang belum VERIFIED", () => {
    expect(() => assertLotoVerifiedIfRequired(true, [{ status: "VERIFIED" }, { status: "APPLIED" }])).toThrow();
  });

  it("tidak melempar kalau requiresLoto=true DAN seluruh record VERIFIED", () => {
    expect(() => assertLotoVerifiedIfRequired(true, [{ status: "VERIFIED" }, { status: "VERIFIED" }])).not.toThrow();
  });
});
