// JWT HS256 seadanya — tanda tangan dan verifikasi lewat `crypto` bawaan
// Node, tanpa dependensi.
//
// Klaimnya SENGAJA identik dengan yang dikeluarkan apps/api
// (platform/auth/auth.service.ts): sub, tenant_id, scope_roles, sid, exp.
// apps/web membaca token itu di lib/auth-session.ts#readSession() untuk
// mengetahui user dan tenant yang sedang aktif, jadi token yang bentuknya
// berbeda akan membuat frontend menganggap sesinya tidak sah — tanpa pesan
// galat yang menjelaskan kenapa.
const crypto = require("node:crypto");

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

function base64UrlEncode(input) {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(input) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded + "=".repeat((4 - (padded.length % 4)) % 4), "base64");
}

function secret() {
  const value = process.env.JWT_ACCESS_TOKEN_SECRET;
  if (!value) throw new Error("JWT_ACCESS_TOKEN_SECRET belum diisi — demo-api menolak menandatangani token.");
  return value;
}

function signAccessToken({ userId, tenantId, sessionId }) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64UrlEncode(
    JSON.stringify({
      sub: userId,
      tenant_id: tenantId,
      scope_roles: [],
      sid: sessionId,
      iat: issuedAt,
      exp: issuedAt + ACCESS_TOKEN_TTL_SECONDS,
    }),
  );
  const signature = crypto.createHmac("sha256", secret()).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

/** Mengembalikan klaim bila token sah dan belum kedaluwarsa, selain itu null. */
function verifyAccessToken(token) {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;

  const expected = crypto.createHmac("sha256", secret()).update(`${header}.${payload}`).digest("base64url");
  // timingSafeEqual melempar kalau panjangnya beda, jadi panjangnya dicek dulu.
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

  let claims;
  try {
    claims = JSON.parse(base64UrlDecode(payload).toString("utf8"));
  } catch {
    return null;
  }
  if (!claims.sub || !claims.tenant_id) return null;
  if (typeof claims.exp === "number" && claims.exp * 1000 <= Date.now()) return null;
  return claims;
}

module.exports = { signAccessToken, verifyAccessToken, ACCESS_TOKEN_TTL_SECONDS };
