// demo-api — server HTTP baca-saja untuk demo/presentasi.
//
// Melayani persis rute yang dipanggil apps/web dan tidak lebih: alur masuk
// PKCE, daftar+detail 15 modul, temuan audit, dan notifikasi. Semua tulis
// domain tetap hanya ada di apps/api.
//
// TANPA framework dan tanpa langkah build. Keduanya bukan soal selera:
// server tujuan sudah terbukti membunuh `tsc` dan `prisma generate` karena
// batas memori akun, jadi apa pun yang harus dikompilasi di sana menambah
// satu titik gagal yang sudah pernah terjadi. Berkas ini dijalankan `node`
// apa adanya.
//
// Yang TIDAK dilakukan berkas ini, supaya tidak disalahpahami sebagai
// pengganti apps/api:
//   - Tidak ada RBAC per izin, tidak ada EntitlementGuard. Siapa pun yang
//     berhasil masuk melihat seluruh modul. Isolasi antar tenant TETAP
//     ditegakkan, tapi oleh basis data lewat RLS (lihat db.js), bukan oleh
//     kode di sini.
//   - Tidak ada audit log, tidak ada workflow, tidak ada notifikasi keluar.
const http = require("node:http");
const { withRls } = require("./db");
const { verifyAccessToken } = require("./jwt");
const { findModuleByEndpoint, findChild } = require("./modules");
const { attachLabels } = require("./labels");
const { login, exchangeAuthorizationCode, exchangeRefreshToken, revokeRefreshToken, AuthError } = require("./auth");
const { sendData, sendProblem, readJsonBody, parseCookies, readPagination, rowToCamel } = require("./http");
const { EVENT_CATEGORIES, getCategoryLabel } = require("./event-category");

const PORT = Number(process.env.PORT || 3401);
const HOST = process.env.HOST || "127.0.0.1";
// Dipotong .htaccess sebelum sampai ke sini, jadi harus menyertakan awalan
// yang DILIHAT PERAMBAN — alasan lengkapnya di auth.controller.ts apps/api.
const REFRESH_COOKIE_PATH = process.env.REFRESH_COOKIE_PATH || "/auth/token";
const REFRESH_COOKIE_NAME = "refresh_token";
// Di produksi frontend dan API satu origin (Apache mem-proxy /api), jadi
// tidak ada CORS sama sekali. Variabel ini hanya untuk menjalankan web di
// :3000 dan demo-api di :3401 saat pengembangan lokal.
const WEB_ORIGIN = process.env.WEB_ORIGIN || "";

function refreshCookie(token) {
  return `${REFRESH_COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=${REFRESH_COOKIE_PATH}; Max-Age=43200`;
}

function clearedRefreshCookie() {
  return `${REFRESH_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=${REFRESH_COOKIE_PATH}; Max-Age=0`;
}

function applyCors(req, res) {
  if (!WEB_ORIGIN) return;
  const origin = req.headers.origin;
  if (origin !== WEB_ORIGIN) return;
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-tenant-id");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
}

function requireClaims(req, res) {
  const header = req.headers.authorization || "";
  const claims = header.startsWith("Bearer ") ? verifyAccessToken(header.slice(7)) : null;
  if (!claims) {
    sendProblem(res, 401, "Tidak terautentikasi.", "Token akses tidak ada, tidak sah, atau sudah kedaluwarsa.");
    return null;
  }
  return claims;
}

// --- Modul domain ------------------------------------------------------------

async function handleModuleList(res, claims, moduleDef, searchParams) {
  const { page, limit, offset } = readPagination(searchParams);
  const result = await withRls(claims.tenant_id, async (client) => {
    const [rows, count] = await Promise.all([
      client.query(
        `SELECT t.*, t.${moduleDef.pk} AS id
           FROM ${moduleDef.table} t
          WHERE t.tenant_id = $1
          ORDER BY ${moduleDef.orderBy}
          LIMIT $2 OFFSET $3`,
        [claims.tenant_id, limit, offset],
      ),
      client.query(`SELECT count(*)::int AS total FROM ${moduleDef.table} WHERE tenant_id = $1`, [claims.tenant_id]),
    ]);
    return { rows: await attachLabels(client, rows.rows), total: count.rows[0].total };
  });
  sendData(res, result.rows.map(rowToCamel), { page, limit, total: result.total });
}

async function handleModuleDetail(res, claims, moduleDef, id) {
  const row = await withRls(claims.tenant_id, async (client) => {
    const { rows } = await client.query(
      `SELECT t.*, t.${moduleDef.pk} AS id FROM ${moduleDef.table} t WHERE t.${moduleDef.pk} = $1 AND t.tenant_id = $2`,
      [id, claims.tenant_id],
    );
    if (!rows[0]) return null;
    return (await attachLabels(client, rows))[0];
  });
  if (!row) return sendProblem(res, 404, "Data tidak ditemukan.");
  sendData(res, rowToCamel(row));
}

async function handleModuleChildren(res, claims, child, parentId) {
  // `through` untuk anak yang menggantung dua tingkat di bawah induknya
  // (mis. akar masalah -> investigasi -> laporan insiden). Dinyatakan sebagai
  // subquery, bukan JOIN, supaya `t.*` tetap berisi kolom anaknya saja dan
  // tidak ada nama kolom yang bertabrakan diam-diam antara kedua tabel.
  const where = child.through
    ? `t.${child.foreignKey} IN (SELECT p.${child.through.pk} FROM ${child.through.table} p
         WHERE p.${child.through.foreignKey} = $1 AND p.tenant_id = $2)`
    : `t.${child.foreignKey} = $1`;

  const rows = await withRls(claims.tenant_id, async (client) => {
    const { rows: found } = await client.query(
      `SELECT t.*, t.${child.pk} AS id
         FROM ${child.table} t
        WHERE ${where} AND t.tenant_id = $2
        ORDER BY ${child.orderBy}`,
      [parentId, claims.tenant_id],
    );
    return attachLabels(client, found);
  });
  sendData(res, rows.map(rowToCamel));
}

// --- Notifikasi --------------------------------------------------------------

async function handleNotificationList(res, claims, searchParams) {
  const { page, limit, offset } = readPagination(searchParams);
  const result = await withRls(claims.tenant_id, async (client) => {
    const [rows, count] = await Promise.all([
      client.query(
        `SELECT notification_id AS id, title, body, priority, is_read, read_at, created_at, event_type, entity_type, entity_id
           FROM notifications
          WHERE tenant_id = $1 AND recipient_user_id = $2
          ORDER BY created_at DESC
          LIMIT $3 OFFSET $4`,
        [claims.tenant_id, claims.sub, limit, offset],
      ),
      client.query(`SELECT count(*)::int AS total FROM notifications WHERE tenant_id = $1 AND recipient_user_id = $2`, [
        claims.tenant_id,
        claims.sub,
      ]),
    ]);
    return { rows: await attachLabels(client, rows.rows), total: count.rows[0].total };
  });
  sendData(res, result.rows.map(rowToCamel), { page, limit, total: result.total });
}

async function handleUnreadCount(res, claims) {
  const count = await withRls(claims.tenant_id, async (client) => {
    const { rows } = await client.query(
      `SELECT count(*)::int AS count FROM notifications WHERE tenant_id = $1 AND recipient_user_id = $2 AND is_read = false`,
      [claims.tenant_id, claims.sub],
    );
    return rows[0].count;
  });
  sendData(res, { count });
}

async function handleMarkRead(res, claims, id) {
  const row = await withRls(claims.tenant_id, async (client) => {
    const { rows } = await client.query(
      `UPDATE notifications
          SET is_read = true, read_at = COALESCE(read_at, now())
        WHERE notification_id = $1 AND tenant_id = $2 AND recipient_user_id = $3
        RETURNING notification_id AS id, title, body, priority, is_read, read_at, created_at`,
      [id, claims.tenant_id, claims.sub],
    );
    return rows[0] || null;
  });
  if (!row) return sendProblem(res, 404, "Notifikasi tidak ditemukan.");
  sendData(res, rowToCamel(row));
}

async function handleMarkAllRead(res, claims) {
  const updated = await withRls(claims.tenant_id, async (client) => {
    const { rowCount } = await client.query(
      `UPDATE notifications
          SET is_read = true, read_at = COALESCE(read_at, now())
        WHERE tenant_id = $1 AND recipient_user_id = $2 AND is_read = false`,
      [claims.tenant_id, claims.sub],
    );
    return rowCount;
  });
  sendData(res, { updated });
}

/** Matriks kategori x channel. IN_APP selalu aktif dan tidak bisa dimatikan
 * (BR-02 Modul 25) — `editable:false` itulah yang membuat halaman preferensi
 * menampilkan teks "Selalu aktif" alih-alih toggle yang tidak berfungsi. */
async function handlePreferences(res, claims) {
  const CHANNELS = ["IN_APP", "EMAIL", "WHATSAPP", "TELEGRAM"];
  const stored = await withRls(claims.tenant_id, async (client) => {
    const { rows } = await client.query(
      `SELECT event_category, channel_code, is_enabled FROM notification_preferences WHERE tenant_id = $1 AND user_id = $2`,
      [claims.tenant_id, claims.sub],
    );
    return rows;
  });
  const byKey = new Map(stored.map((row) => [`${row.event_category}:${row.channel_code}`, row.is_enabled]));

  const matrix = [];
  for (const category of EVENT_CATEGORIES) {
    for (const channelCode of CHANNELS) {
      const key = `${category.code}:${channelCode}`;
      matrix.push({
        eventCategory: category.code,
        categoryLabel: category.label,
        channelCode,
        isEnabled: channelCode === "IN_APP" ? true : (byKey.get(key) ?? false),
        editable: channelCode !== "IN_APP",
      });
    }
  }
  sendData(res, { categories: EVENT_CATEGORIES, matrix });
}

async function handleUpsertPreference(res, claims, body) {
  const { eventCategory, channelCode, isEnabled } = body || {};
  if (!eventCategory || !channelCode) {
    return sendProblem(res, 400, "Permintaan tidak lengkap.", "eventCategory dan channelCode wajib diisi.");
  }
  if (channelCode === "IN_APP") {
    return sendProblem(res, 400, "Channel IN_APP tidak bisa dimatikan.", "BR-02 Modul 25 — notifikasi in-app selalu aktif.");
  }
  const cell = await withRls(claims.tenant_id, async (client) => {
    await client.query(
      `INSERT INTO notification_preferences (tenant_id, user_id, event_category, channel_code, is_enabled)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, event_category, channel_code)
       DO UPDATE SET is_enabled = EXCLUDED.is_enabled`,
      [claims.tenant_id, claims.sub, eventCategory, channelCode, Boolean(isEnabled)],
    );
    return { eventCategory, categoryLabel: getCategoryLabel(eventCategory), channelCode, isEnabled: Boolean(isEnabled), editable: true };
  });
  sendData(res, cell);
}

// --- Router ------------------------------------------------------------------

async function route(req, res, url) {
  const { pathname, searchParams } = url;
  const method = req.method || "GET";
  const segments = pathname.split("/").filter(Boolean);

  if (pathname === "/health") return sendData(res, { status: "ok", service: "demo-api" });

  // --- auth ---
  if (pathname === "/auth/login" && method === "POST") {
    const body = await readJsonBody(req);
    const result = await login(req.headers["x-tenant-id"], body);
    return sendData(res, result);
  }

  if (pathname === "/auth/token" && method === "POST") {
    const body = await readJsonBody(req);
    const pair =
      body.grantType === "authorization_code"
        ? exchangeAuthorizationCode(body.code, body.codeVerifier)
        : exchangeRefreshToken(parseCookies(req.headers.cookie)[REFRESH_COOKIE_NAME]);
    res.setHeader("Set-Cookie", refreshCookie(pair.refreshToken));
    return sendData(res, { accessToken: pair.accessToken, tokenType: "Bearer", expiresIn: pair.expiresIn });
  }

  if ((pathname === "/auth/logout" || pathname === "/auth/logout-all") && method === "POST") {
    if (!requireClaims(req, res)) return;
    revokeRefreshToken(parseCookies(req.headers.cookie)[REFRESH_COOKIE_NAME]);
    res.setHeader("Set-Cookie", clearedRefreshCookie());
    res.writeHead(204);
    return res.end();
  }

  // --- notifikasi (dicek sebelum registri modul: prefiksnya sama) ---
  if (segments[0] === "notifications") {
    const claims = requireClaims(req, res);
    if (!claims) return;
    if (segments.length === 1 && method === "GET") return handleNotificationList(res, claims, searchParams);
    if (segments[1] === "unread-count" && method === "GET") return handleUnreadCount(res, claims);
    if (segments[1] === "read-all" && method === "POST") return handleMarkAllRead(res, claims);
    if (segments[1] === "preferences" && method === "GET") return handlePreferences(res, claims);
    if (segments[1] === "preferences" && method === "PUT") return handleUpsertPreference(res, claims, await readJsonBody(req));
    if (segments.length === 3 && segments[2] === "read" && method === "POST") return handleMarkRead(res, claims, segments[1]);
    return sendProblem(res, 404, "Rute tidak dikenal.", pathname);
  }

  // --- modul domain ---
  const moduleDef = findModuleByEndpoint(`/${segments[0] || ""}`);
  if (moduleDef && method === "GET") {
    const claims = requireClaims(req, res);
    if (!claims) return;
    if (segments.length === 1) return handleModuleList(res, claims, moduleDef, searchParams);
    if (segments.length === 2) return handleModuleDetail(res, claims, moduleDef, segments[1]);
    if (segments.length === 3) {
      const child = findChild(moduleDef, `/${segments[2]}`);
      if (child) return handleModuleChildren(res, claims, child, segments[1]);
    }
  }

  return sendProblem(res, 404, "Rute tidak dikenal.", pathname);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  applyCors(req, res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  route(req, res, url).catch((error) => {
    if (error instanceof AuthError) return sendProblem(res, error.status, error.title, error.detail, url.pathname);
    // Isi galat tidak diteruskan ke klien — pesan Postgres bisa memuat nama
    // kolom dan potongan nilai. Log server yang menyimpannya.
    console.error(`[demo-api] ${req.method} ${url.pathname} gagal:`, error);
    if (!res.headersSent) sendProblem(res, 500, "Kesalahan internal.", "Permintaan tidak bisa diselesaikan.", url.pathname);
    else res.end();
  });
});

server.listen(PORT, HOST, () => {
  console.log(`[demo-api] mendengarkan di http://${HOST}:${PORT}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
