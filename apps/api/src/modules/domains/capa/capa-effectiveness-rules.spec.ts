import { assertVerifierNotPic } from "./capa-effectiveness-rules";

describe("assertVerifierNotPic (BR-03)", () => {
  it("tidak throw kalau verifier BEDA dari seluruh PIC", () => {
    expect(() => assertVerifierNotPic("verifier-1", ["pic-1", "pic-2"])).not.toThrow();
  });

  it("throw kalau verifier SAMA dengan salah satu PIC", () => {
    expect(() => assertVerifierNotPic("pic-1", ["pic-1", "pic-2"])).toThrow(/BR-03/);
  });

  it("tidak throw kalau belum ada PIC sama sekali", () => {
    expect(() => assertVerifierNotPic("verifier-1", [])).not.toThrow();
  });
});
