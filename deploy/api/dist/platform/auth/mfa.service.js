"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MfaService = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const otplib_1 = require("otplib");
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
function getEncryptionKey() {
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
let MfaService = class MfaService {
    generateSecret() {
        return otplib_1.authenticator.generateSecret();
    }
    getProvisioningUri(accountEmail, secret, issuer = "QHSE Enterprise Platform") {
        return otplib_1.authenticator.keyuri(accountEmail, issuer, secret);
    }
    verifyToken(secret, token) {
        try {
            return otplib_1.authenticator.check(token, secret);
        }
        catch {
            // otplib melempar kalau token bukan format numerik valid — perlakukan
            // sebagai kode salah, bukan error server.
            return false;
        }
    }
    encryptSecret(plainSecret) {
        const key = getEncryptionKey();
        const iv = (0, node_crypto_1.randomBytes)(12); // 96-bit nonce standar GCM
        const cipher = (0, node_crypto_1.createCipheriv)(ENCRYPTION_ALGORITHM, key, iv);
        const ciphertext = Buffer.concat([cipher.update(plainSecret, "utf8"), cipher.final()]);
        const authTag = cipher.getAuthTag();
        return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(":");
    }
    decryptSecret(encrypted) {
        const key = getEncryptionKey();
        const [ivB64, authTagB64, ciphertextB64] = encrypted.split(":");
        const iv = Buffer.from(ivB64, "base64");
        const authTag = Buffer.from(authTagB64, "base64");
        const ciphertext = Buffer.from(ciphertextB64, "base64");
        const decipher = (0, node_crypto_1.createDecipheriv)(ENCRYPTION_ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
    }
};
exports.MfaService = MfaService;
exports.MfaService = MfaService = __decorate([
    (0, common_1.Injectable)()
], MfaService);
//# sourceMappingURL=mfa.service.js.map