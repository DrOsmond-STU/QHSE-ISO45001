import { isValidCustomDomainFormat } from "./custom-domain";

describe("isValidCustomDomainFormat() — TDD §16", () => {
  it("hostname bertitik biasa -> valid", () => {
    expect(isValidCustomDomainFormat("acme.qhse.example.com")).toBe(true);
  });

  it("hostname 2 label -> valid", () => {
    expect(isValidCustomDomainFormat("acme.com")).toBe(true);
  });

  it("uppercase -> tetap valid (dicek case-insensitive)", () => {
    expect(isValidCustomDomainFormat("ACME.example.com")).toBe(true);
  });

  it("tanpa titik sama sekali -> invalid", () => {
    expect(isValidCustomDomainFormat("localhost")).toBe(false);
  });

  it("dgn skema URL (https://) -> invalid, harus hostname polos", () => {
    expect(isValidCustomDomainFormat("https://acme.com")).toBe(false);
  });

  it("dgn path -> invalid", () => {
    expect(isValidCustomDomainFormat("acme.com/path")).toBe(false);
  });

  it("label diawali/diakhiri hyphen -> invalid", () => {
    expect(isValidCustomDomainFormat("-acme.com")).toBe(false);
    expect(isValidCustomDomainFormat("acme-.com")).toBe(false);
  });
});
