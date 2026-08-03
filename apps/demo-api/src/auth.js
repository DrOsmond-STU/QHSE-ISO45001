// Authorization Code + PKCE — jalur yang sama persis dengan yang dipanggil
// apps/web/lib/auth-session.ts:
//
//   1. POST /auth/login  (header x-tenant-id + codeChallenge) -> { code }
//   2. POST /auth/token  (grantType=authorization_code + codeVerifier)
//                        -> { accessToken } + Set-Cookie refresh_token
//
// PKCE dipertahankan utuh (bukan disederhanakan jadi "login langsung
// mengembalikan token") karena frontend-nya memang menghitung
// codeVerifier/codeChallenge dan akan gagal kalau langkah kedua tidak
// memverifikasinya. Menyederhanakan sisi server berarti harus mengubah
// frontend juga, dan frontend itu yang ditampilkan saat presentasi.
//
// BEDA YANG DISENGAJA dari apps/api, dan alasannya:
//   - Kode otorisasi dan refresh token disimpan di MEMORI proses, bukan di
//     tabel authorization_code_entries/user_sessions. Umurnya pendek dan
//     satu-satunya akibat kalau proses dinyalakan ulang adalah penonton
//     harus masuk lagi. Menulis baris sesi berarti ikut menanggung skema
//     rotasi refresh token yang tidak dipakai demo ini.
//   - MFA, penguncian akun setelah gagal berulang, dan rate limit tidak ada.
//     Semuanya tetap ada di apps/api; yang ini bukan penggantinya.
const crypto = require("node:crypto");
const { withTenant } = require("./db");
const { signAccessToken, ACCESS_TOKEN_TTL_SECONDS } = require("./jwt");
const { verifyPassword } = require("./password");

const AUTHORIZATION_CODE_TTL_MS = 60_000;
const REFRESH_TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

const authorizationCodes = new Map();
const refreshTokens = new Map();

/** Membuang entri kedaluwarsa. Dipanggil di setiap penerbitan, bukan lewat
 * setInterval: tanpa timer yang berjalan terus, proses tetap bisa keluar
 * dengan bersih dan tidak ada pekerjaan periodik yang membangunkan CPU
 * pada akun yang memang sedang berhemat. */
function sweep(store) {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) store.delete(key);
  }
}

function sha256Base64Url(input) {
  return crypto.createHash("sha256").update(input).digest("base64url");
}

class AuthError extends Error {
  constructor(status, title, detail) {
    super(detail || title);
    this.status = status;
    this.title = title;
    this.detail = detail;
  }
}

/**
 * Verifikasi kredensial lalu terbitkan kode otorisasi sekali pakai.
 *
 * Pesan galatnya sengaja sama untuk "email tidak ada" dan "sandi salah" —
 * membedakan keduanya memberi tahu penyerang alamat mana yang terdaftar,
 * dan halaman login tidak jadi lebih membantu karenanya.
 */
async function login(tenantId, { email, password, codeChallenge, codeChallengeMethod }) {
  if (!tenantId) throw new AuthError(400, "Header x-tenant-id wajib diisi.");
  if (!email || !password) throw new AuthError(400, "Email dan kata sandi wajib diisi.");
  if (codeChallengeMethod !== "S256" || !codeChallenge) {
    throw new AuthError(400, "codeChallenge wajib diisi dengan codeChallengeMethod S256.");
  }

  const user = await withTenant(tenantId, async (client) => {
    const { rows } = await client.query(
      `SELECT user_id, tenant_id, password_hash, status
         FROM users
        WHERE tenant_id = $1 AND lower(email) = lower($2) AND deleted_at IS NULL
        LIMIT 1`,
      [tenantId, email],
    );
    return rows[0] || null;
  });

  const invalid = new AuthError(401, "Kredensial tidak valid.", "Email atau kata sandi salah.");
  if (!user || !user.password_hash) throw invalid;
  if (user.status !== "ACTIVE") {
    throw new AuthError(401, "Akun tidak aktif.", "Akun ini tidak berstatus aktif, jadi tidak bisa dipakai masuk.");
  }

  if (!(await verifyPassword(user.password_hash, password))) throw invalid;

  sweep(authorizationCodes);
  const code = crypto.randomBytes(32).toString("base64url");
  authorizationCodes.set(code, {
    userId: user.user_id,
    tenantId: user.tenant_id,
    codeChallenge,
    expiresAt: Date.now() + AUTHORIZATION_CODE_TTL_MS,
  });
  return { code };
}

function issueTokenPair(userId, tenantId) {
  const sessionId = crypto.randomUUID();
  const accessToken = signAccessToken({ userId, tenantId, sessionId });
  const refreshToken = crypto.randomBytes(32).toString("base64url");
  sweep(refreshTokens);
  refreshTokens.set(refreshToken, { userId, tenantId, expiresAt: Date.now() + REFRESH_TOKEN_TTL_MS });
  return { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_TTL_SECONDS };
}

function exchangeAuthorizationCode(code, codeVerifier) {
  if (!code || !codeVerifier) throw new AuthError(400, "code dan codeVerifier wajib untuk grant authorization_code.");
  const entry = authorizationCodes.get(code);
  // Dihapus sebelum diperiksa — kode otorisasi sekali pakai, dan kode yang
  // gagal verifikasi tetap harus hangus supaya tidak bisa dicoba berkali-kali.
  authorizationCodes.delete(code);
  if (!entry || entry.expiresAt <= Date.now()) {
    throw new AuthError(401, "Kode otorisasi tidak berlaku.", "Kode sudah dipakai atau kedaluwarsa. Silakan masuk lagi.");
  }
  if (sha256Base64Url(codeVerifier) !== entry.codeChallenge) {
    throw new AuthError(401, "Verifikasi PKCE gagal.", "codeVerifier tidak cocok dengan codeChallenge saat login.");
  }
  return issueTokenPair(entry.userId, entry.tenantId);
}

function exchangeRefreshToken(presented) {
  if (!presented) throw new AuthError(401, "Refresh token tidak ditemukan.");
  const entry = refreshTokens.get(presented);
  refreshTokens.delete(presented);
  if (!entry || entry.expiresAt <= Date.now()) {
    throw new AuthError(401, "Refresh token tidak berlaku.", "Sesi sudah berakhir. Silakan masuk lagi.");
  }
  return issueTokenPair(entry.userId, entry.tenantId);
}

function revokeRefreshToken(presented) {
  if (presented) refreshTokens.delete(presented);
}

module.exports = { login, exchangeAuthorizationCode, exchangeRefreshToken, revokeRefreshToken, AuthError };
