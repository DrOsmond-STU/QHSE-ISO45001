import { authenticator } from "otplib";
import { MfaService } from "./mfa.service";

describe("MfaService", () => {
  const service = new MfaService();

  beforeAll(() => {
    process.env.MFA_SECRET_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  });

  it("generateSecret menghasilkan secret base32 yang bisa dipakai verifyToken", () => {
    const secret = service.generateSecret();
    const validToken = authenticator.generate(secret);
    expect(service.verifyToken(secret, validToken)).toBe(true);
  });

  it("verifyToken menolak kode yang salah", () => {
    const secret = service.generateSecret();
    expect(service.verifyToken(secret, "000000")).toBe(false);
  });

  it("verifyToken menolak format bukan angka tanpa melempar error", () => {
    const secret = service.generateSecret();
    expect(() => service.verifyToken(secret, "bukan-angka")).not.toThrow();
    expect(service.verifyToken(secret, "bukan-angka")).toBe(false);
  });

  it("getProvisioningUri menghasilkan otpauth:// URI yang memuat email & issuer", () => {
    const secret = service.generateSecret();
    const uri = service.getProvisioningUri("dev@qhse.local", secret, "QHSE Test");
    expect(uri.startsWith("otpauth://totp/")).toBe(true);
    expect(uri).toContain(encodeURIComponent("QHSE Test"));
  });

  it("encryptSecret lalu decryptSecret mengembalikan secret asli", () => {
    const secret = service.generateSecret();
    const encrypted = service.encryptSecret(secret);
    expect(encrypted).not.toBe(secret);
    expect(service.decryptSecret(encrypted)).toBe(secret);
  });

  it("decryptSecret gagal kalau ciphertext dirusak (authTag GCM tidak cocok)", () => {
    const secret = service.generateSecret();
    const encrypted = service.encryptSecret(secret);
    const [iv, authTag, ciphertext] = encrypted.split(":");
    const tampered = [iv, authTag, ciphertext.slice(0, -2) + (ciphertext.endsWith("A") ? "BB" : "AA")].join(":");
    expect(() => service.decryptSecret(tampered)).toThrow();
  });
});
