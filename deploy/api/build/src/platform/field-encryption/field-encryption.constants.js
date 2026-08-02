"use strict";
// Task 5.3 (Modul 13 Occupational Health BR-05) — lihat banner comment
// field-encryption.service.ts soal arsitektur envelope encryption
// lengkap. Master key placeholder KMS asli (AWS KMS/Azure Key Vault/HSM
// DITUNDA ke TDD terpisah, PRD §13 Open Question #5) — pola getMasterKey()
// SAMA PERSIS platform/auth/mfa.service.ts getEncryptionKey() (task 0.7),
// env var BEDA supaya rotasi/kompromi salah satu TIDAK mempengaruhi yang lain.
Object.defineProperty(exports, "__esModule", { value: true });
exports.PHI_DATA_KEY_LENGTH_BYTES = exports.PHI_ENCRYPTION_ALGORITHM = void 0;
exports.getPhiMasterKey = getPhiMasterKey;
exports.PHI_ENCRYPTION_ALGORITHM = "aes-256-gcm";
exports.PHI_DATA_KEY_LENGTH_BYTES = 32;
function getPhiMasterKey() {
    const raw = process.env.PHI_ENCRYPTION_MASTER_KEY;
    if (!raw) {
        throw new Error("PHI_ENCRYPTION_MASTER_KEY tidak di-set.");
    }
    const key = Buffer.from(raw, "base64");
    if (key.length !== exports.PHI_DATA_KEY_LENGTH_BYTES) {
        throw new Error("PHI_ENCRYPTION_MASTER_KEY harus 32 byte (base64).");
    }
    return key;
}
