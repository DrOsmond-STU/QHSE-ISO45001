import { createHash, timingSafeEqual } from "node:crypto";

// RFC 7636 (PKCE) — dipakai Authorization Code Flow task 0.6 (TDD §8.1), juga
// untuk web app sendiri (bukan hanya SSO eksternal). Hanya method S256
// didukung — "plain" sengaja tidak diterima (tidak melindungi apa pun kalau
// code dicegat, satu-satunya alasan PKCE ada).

function base64url(input: Buffer): string {
  return input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function computeChallenge(verifier: string): string {
  return base64url(createHash("sha256").update(verifier).digest());
}

export function verifyPkce(
  verifier: string,
  challenge: string,
  method: "S256",
): boolean {
  if (method !== "S256") {
    return false;
  }
  const expected = computeChallenge(verifier);
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(challenge);
  if (expectedBuf.length !== actualBuf.length) {
    return false;
  }
  return timingSafeEqual(expectedBuf, actualBuf);
}
