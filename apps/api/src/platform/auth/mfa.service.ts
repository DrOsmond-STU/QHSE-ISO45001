import { Injectable } from "@nestjs/common";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { authenticator } from "otplib";

// Task 0.7 — MFA TOTP (Google Authenticator-compatible, TDD §8.1). otplib
// dipakai daripada implementasi HOTP/TOTP manual (RFC 6238 py encoding base32
// + time-step window kalau salah gampang salah diam-diam, library sudah
// teruji luas).
//
// mfa_secret_encrypted (PRD Modul 02 §11: "terenkripsi at-rest") — AES-256-GCM
// (authenticated encryption), BUKAN hash, karena TOTP butuh secret ASLI untuk
// verifikasi kode berikutnya (beda dari password_hash yang cukup satu arah).
// Key dari env MFA_SECRET_ENCRYPTION_KEY (32 byte, base64) — production pakai
// Vault/KMS (SECURITY.md), bukan .env statis.

const ENCRYPTION_ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const raw = process.env.MFA_SECRET_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("MFA_SECRET_ENCRYPTION_KEY tidak di-set.");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("MFA_SECRET_ENCRYPTION_KEY harus 32 byte (base64).");
  }
  return key;
}

@Injectable()
export class MfaService {
  generateSecret(): string {
    return authenticator.generateSecret();
  }

  getProvisioningUri(accountEmail: string, secret: string, issuer = "QHSE Enterprise Platform"): string {
    return authenticator.keyuri(accountEmail, issuer, secret);
  }

  verifyToken(secret: string, token: string): boolean {
    try {
      return authenticator.check(token, secret);
    } catch {
      // otplib melempar kalau token bukan format numerik valid — perlakukan
      // sebagai kode salah, bukan error server.
      return false;
    }
  }

  encryptSecret(plainSecret: string): string {
    const key = getEncryptionKey();
    const iv = randomBytes(12); // 96-bit nonce standar GCM
    const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
    const ciphertext = Buffer.concat([cipher.update(plainSecret, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(":");
  }

  decryptSecret(encrypted: string): string {
    const key = getEncryptionKey();
    const [ivB64, authTagB64, ciphertextB64] = encrypted.split(":");
    const iv = Buffer.from(ivB64, "base64");
    const authTag = Buffer.from(authTagB64, "base64");
    const ciphertext = Buffer.from(ciphertextB64, "base64");

    const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  }
}
