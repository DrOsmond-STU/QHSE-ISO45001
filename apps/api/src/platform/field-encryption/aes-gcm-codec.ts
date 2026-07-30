import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { PHI_ENCRYPTION_ALGORITHM } from "./field-encryption.constants";

// Codec simetris murni (key masuk sbg parameter, TIDAK baca env/DB sendiri)
// — dipakai DUA layer beda oleh FieldEncryptionService: (1) wrap/unwrap DEK
// pakai master key, (2) enkripsi/dekripsi field PHI pakai DEK ter-unwrap.
// Pola serialisasi iv:authTag:ciphertext (base64, dipisah ":") SAMA PERSIS
// platform/auth/mfa.service.ts encryptSecret/decryptSecret (task 0.7) —
// reuse pola yang sudah teruji, bukan format baru.
export function encryptWithKey(key: Buffer, plaintext: string): string {
  const iv = randomBytes(12); // 96-bit nonce standar GCM
  const cipher = createCipheriv(PHI_ENCRYPTION_ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(":");
}

export function decryptWithKey(key: Buffer, serialized: string): string {
  const parts = serialized.split(":");
  if (parts.length !== 3) {
    throw new Error("Format ciphertext tidak valid (bukan iv:authTag:ciphertext).");
  }
  const [ivB64, authTagB64, ciphertextB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");

  const decipher = createDecipheriv(PHI_ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
