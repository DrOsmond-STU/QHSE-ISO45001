import { randomBytes } from "node:crypto";
import { decryptWithKey, encryptWithKey } from "./aes-gcm-codec";

describe("aes-gcm-codec", () => {
  const key = randomBytes(32);

  it("round-trips plaintext melalui encrypt lalu decrypt", () => {
    const ciphertext = encryptWithKey(key, "rahasia medis");
    expect(decryptWithKey(key, ciphertext)).toBe("rahasia medis");
  });

  it("menghasilkan ciphertext BEDA tiap panggilan (IV random, bukan ECB)", () => {
    const a = encryptWithKey(key, "sama");
    const b = encryptWithKey(key, "sama");
    expect(a).not.toBe(b);
  });

  it("menolak dekripsi dengan key BEDA (dasar isolasi per-tenant BR-05)", () => {
    const otherKey = randomBytes(32);
    const ciphertext = encryptWithKey(key, "data tenant A");
    expect(() => decryptWithKey(otherKey, ciphertext)).toThrow();
  });

  it("menolak ciphertext yang di-tamper (GCM auth tag gagal verifikasi)", () => {
    const ciphertext = encryptWithKey(key, "data utuh");
    const [iv, authTag, body] = ciphertext.split(":");
    const tamperedBody = Buffer.from(body, "base64");
    tamperedBody[0] ^= 0xff;
    const tampered = [iv, authTag, tamperedBody.toString("base64")].join(":");
    expect(() => decryptWithKey(key, tampered)).toThrow();
  });

  it("menolak format ciphertext yang tidak lengkap", () => {
    expect(() => decryptWithKey(key, "cuma-satu-bagian")).toThrow();
  });

  it("menangani string kosong sebagai plaintext valid", () => {
    const ciphertext = encryptWithKey(key, "");
    expect(decryptWithKey(key, ciphertext)).toBe("");
  });
});
