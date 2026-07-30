import { isAuthorizationActive } from "./access-control-rules";

const asOf = new Date("2026-07-26");

describe("isAuthorizationActive (BR-02 bagian b)", () => {
  it("true jika status ACTIVE, tidak ada expiry, tidak di-revoke", () => {
    expect(isAuthorizationActive({ status: "ACTIVE", expiryDate: null, revokedAt: null }, asOf)).toBe(true);
  });

  it("true jika expiryDate masih di masa depan", () => {
    expect(
      isAuthorizationActive({ status: "ACTIVE", expiryDate: new Date("2026-12-31"), revokedAt: null }, asOf),
    ).toBe(true);
  });

  it("false jika status bukan ACTIVE (mis. EXPIRED/REVOKED)", () => {
    expect(isAuthorizationActive({ status: "EXPIRED", expiryDate: null, revokedAt: null }, asOf)).toBe(false);
    expect(isAuthorizationActive({ status: "REVOKED", expiryDate: null, revokedAt: null }, asOf)).toBe(false);
  });

  it("false jika revokedAt terisi walau status masih ACTIVE (operator lupa update status)", () => {
    expect(
      isAuthorizationActive({ status: "ACTIVE", expiryDate: null, revokedAt: new Date("2026-07-01") }, asOf),
    ).toBe(false);
  });

  it("false jika expiryDate sudah lewat walau status masih ACTIVE (fail closed)", () => {
    expect(
      isAuthorizationActive({ status: "ACTIVE", expiryDate: new Date("2026-07-01"), revokedAt: null }, asOf),
    ).toBe(false);
  });

  it("true jika expiryDate tepat hari ini", () => {
    expect(isAuthorizationActive({ status: "ACTIVE", expiryDate: asOf, revokedAt: null }, asOf)).toBe(true);
  });
});
