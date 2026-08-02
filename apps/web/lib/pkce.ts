// PKCE (RFC 7636) sisi browser — pasangan verifier/challenge untuk
// POST /auth/login. Kontrak server (LoginDto, platform/auth/dto/login.dto.ts):
// `codeChallenge` WAJIB tepat 43 karakter dan `codeChallengeMethod` WAJIB
// "S256" — 43 char itu panjang base64url tanpa padding dari digest SHA-256
// (32 byte), jadi verifier di sini juga dibuat 32 byte acak supaya
// keduanya konsisten 43 karakter.
//
// window.crypto.subtle HANYA tersedia di secure context (https ATAU
// http://localhost). Kalau app di-serve lewat http:// ke hostname/IP lain,
// fungsi ini MELEMPAR — itu disengaja: tidak ada fallback SHA-256 buatan
// sendiri, karena menurunkan jaminan kripto diam-diam lebih buruk daripada
// gagal terang-terangan. Konsekuensinya: deployment WAJIB HTTPS (sudah
// jadi syarat di DEPLOYMENT_SHARED_HOSTING.md — AutoSSL cPanel).

const VERIFIER_BYTES = 32;

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export interface PkcePair {
  codeVerifier: string;
  codeChallenge: string;
}

export async function generatePkcePair(): Promise<PkcePair> {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error(
      "Browser tidak menyediakan Web Crypto. Buka aplikasi lewat HTTPS (atau http://localhost saat pengembangan).",
    );
  }
  const random = new Uint8Array(VERIFIER_BYTES);
  window.crypto.getRandomValues(random);
  const codeVerifier = base64UrlEncode(random);
  const digest = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(codeVerifier));
  return { codeVerifier, codeChallenge: base64UrlEncode(new Uint8Array(digest)) };
}
