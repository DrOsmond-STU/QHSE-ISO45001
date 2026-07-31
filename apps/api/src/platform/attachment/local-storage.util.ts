import { createHmac, timingSafeEqual } from "node:crypto";

// Shared-hosting adaptation (STORAGE_MODE=local) — token presign LOKAL:
// base64url(JSON{key,contentType?,exp}) + "." + HMAC-SHA256 hex (secret
// LOCAL_STORAGE_SIGNING_SECRET). SELF-CONTAINED (bukan lookup DB) — pola
// yang sama persis "presigned URL" S3 asli: siapa pun yang PEGANG token
// valid+belum expired bisa upload/download, tidak butuh state server
// tambahan (mirip authcode tapi verifikasi murni via signature, bukan
// tabel — beda krn presign key/exp HARUS readable dari token itu sendiri
// oleh handler PUT/GET, bukan dicocokkan ke baris tersimpan).
export interface LocalStorageTokenPayload {
  key: string;
  contentType?: string;
  exp: number;
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function createLocalStorageToken(payload: LocalStorageTokenPayload, secret: string): string {
  const json = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${json}.${sign(json, secret)}`;
}

export function verifyLocalStorageToken(token: string, secret: string): LocalStorageTokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [json, providedSig] = parts;
  const expectedSig = sign(json, secret);
  const a = Buffer.from(providedSig, "hex");
  const b = Buffer.from(expectedSig, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(json, "base64url").toString()) as LocalStorageTokenPayload;
    if (payload.exp <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
