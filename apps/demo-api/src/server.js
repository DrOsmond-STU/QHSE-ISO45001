// demo-api — server HTTP untuk demo/presentasi.
//
// Melayani persis rute yang dipanggil apps/web: alur masuk PKCE, daftar dan
// detail 15 modul beserta anaknya, analitik, Balanced Scorecard, notifikasi,
// operasi tulis (buat/ubah/hapus), dan persetujuan.
//
// TANPA framework dan tanpa langkah build. Keduanya bukan soal selera:
// server tujuan sudah terbukti membunuh `tsc` dan `prisma generate` karena
// batas memori akun, jadi apa pun yang harus dikompilasi di sana menambah
// satu titik gagal yang sudah pernah terjadi. Berkas ini dijalankan `node`
// apa adanya.
//
// SUDAH TIDAK BACA-SAJA lagi sejak lapisan tulis ditambahkan. Yang perlu
// diketahui pembaca tentang batas-batasnya sekarang:
//
//   ADA — persetujuan sungguhan. Mesin workflow-nya (workflow.js) cerminan
//     apps/api dan menulis ke tabel workflow_* yang sama: tahap, penerima
//     tugas, percabangan bersyarat, dan kunci baris terhadap klik ganda.
//     Status domain hanya berpindah lewat state machine tiap modul.
//
//   ADA — jejak audit. Trigger audit_log_capture sudah terpasang pada
//     tabel-tabelnya di basis data, jadi setiap INSERT/UPDATE/DELETE di sini
//     tercatat tanpa kode tambahan apa pun.
//
//   TIDAK ADA — RBAC per izin dan EntitlementGuard. Siapa pun yang berhasil
//     masuk BISA MEMBUAT dan MENGUBAH data di seluruh modul. Yang tetap
//     ditegakkan: isolasi antar tenant (oleh RLS di basis data, lihat db.js)
//     dan penugasan persetujuan — tombol Setuju hanya berfungsi bagi orang
//     yang memang jadi assignee tugasnya, diperiksa di sisi server.
//     Perbedaan ini penting untuk dinyatakan: pemisahan tugas pada level
//     "siapa boleh membuat izin kerja" belum ada di sini, hanya pada level
//     "siapa boleh menyetujuinya".
//
//   TIDAK ADA — notifikasi keluar (surel/WhatsApp). Notifikasi dalam aplikasi
//     ditulis ke tabel notifications dan muncul di kotak masuk.
const http = require("node:http");
const { withRls } = require("./db");
const { verifyAccessToken } = require("./jwt");
const { MODULES, findModuleByEndpoint, findChild } = require("./modules");
const writes = require("./writes");
const files = require("./files");
const { attachLabels } = require("./labels");
const { hasSoftDelete } = require("./fields");
const ai = require("./ai");
const search = require("./search");
const { findMetric, catalog } = require("./analytics");
const { loadScorecard } = require("./scorecard");
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
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
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

// ---------------------------------------------------------------------------
//  PENGHAPUSAN LUNAK DISARING DI SINI, DAN INI BUKAN KERAPIAN.
//
//  Menghapus di aplikasi ini berarti mengisi deleted_at, bukan menghapus
//  barisnya (writes.js handleDelete) — jejak audit ISO 45001 menuntut baris
//  yang pernah ada tetap bisa ditelusuri. Tapi selama pembacaannya tidak ikut
//  menyaring, "dihapus" tidak berarti apa-apa bagi yang memakainya: barisnya
//  tetap terhitung di dashboard, tetap muncul di daftar, dan tetap terbuka
//  lewat URL-nya. Yang lebih buruk, hapusnya menjawab HTTP 200 — jadi orang
//  yakin sudah menghapus sesuatu yang sebenarnya masih ada di layar.
//
//  Ketahuan dari jumlah record yang naik satu setiap putaran pemeriksaan
//  otomatis (izin kerja 56 -> 57 -> 58) padahal baris ujinya selalu dihapus
//  di akhir. Angka yang menaik pelan-pelan itu satu-satunya gejalanya.
// ---------------------------------------------------------------------------
async function softDeleteClause(client, table, alias = "t") {
  return (await hasSoftDelete(client, table)) ? ` AND ${alias}.deleted_at IS NULL` : "";
}

async function handleModuleList(res, claims, moduleDef, searchParams) {
  const { page, limit, offset } = readPagination(searchParams);
  const result = await withRls(claims.tenant_id, async (client) => {
    const hidup = await softDeleteClause(client, moduleDef.table);
    const [rows, count] = await Promise.all([
      client.query(
        `SELECT t.*, t.${moduleDef.pk} AS id
           FROM ${moduleDef.table} t
          WHERE t.tenant_id = $1${hidup}
          ORDER BY ${moduleDef.orderBy}
          LIMIT $2 OFFSET $3`,
        [claims.tenant_id, limit, offset],
      ),
      client.query(
        `SELECT count(*)::int AS total FROM ${moduleDef.table} t WHERE t.tenant_id = $1${hidup}`,
        [claims.tenant_id],
      ),
    ]);
    return { rows: await attachLabels(client, rows.rows), total: count.rows[0].total };
  });
  sendData(res, result.rows.map(rowToCamel), { page, limit, total: result.total });
}

async function handleModuleDetail(res, claims, moduleDef, id) {
  const row = await withRls(claims.tenant_id, async (client) => {
    const hidup = await softDeleteClause(client, moduleDef.table);
    const { rows } = await client.query(
      `SELECT t.*, t.${moduleDef.pk} AS id FROM ${moduleDef.table} t
        WHERE t.${moduleDef.pk} = $1 AND t.tenant_id = $2${hidup}`,
      [id, claims.tenant_id],
    );
    if (!rows[0]) return null;
    return (await attachLabels(client, rows))[0];
  });
  if (!row) return sendProblem(res, 404, "Data tidak ditemukan.");
  sendData(res, rowToCamel(row));
}

async function handleModuleChildren(res, claims, moduleDef, child, parentId) {
  // `through` untuk anak yang menggantung dua tingkat di bawah induknya
  // (mis. akar masalah -> investigasi -> laporan insiden). Dinyatakan sebagai
  // subquery, bukan JOIN, supaya `t.*` tetap berisi kolom anaknya saja dan
  // tidak ada nama kolom yang bertabrakan diam-diam antara kedua tabel.
  const base = child.through
    ? `t.${child.foreignKey} IN (SELECT p.${child.through.pk} FROM ${child.through.table} p
         WHERE p.${child.through.foreignKey} = $1 AND p.tenant_id = $2)`
    : `t.${child.foreignKey} = $1`;
  // `where` tambahan untuk tabel polimorfik (attachments), ditulis di registri
  // modul dan bukan dirakit dari masukan pengguna.
  const where = child.where ? `${base} AND ${child.where}` : base;

  const rows = await withRls(claims.tenant_id, async (client) => {
    // Induknya diperiksa lebih dulu, bukan hanya anaknya.
    //
    // Tanpa ini, menghapus sebuah dokumen menutup halaman detailnya (404) tapi
    // MEMBIARKAN /documents/<id>/versions terbuka — daftar revisi milik
    // dokumen yang sudah tidak ada lagi, lengkap dengan tautan berkasnya.
    // Kebocoran yang sama dengan yang baru saja ditutup di daftar dan detail,
    // cuma satu tingkat lebih ke bawah dan karena itu lebih mudah terlewat.
    const indukHidup = await softDeleteClause(client, moduleDef.table, "p");
    const { rows: induk } = await client.query(
      `SELECT 1 FROM ${moduleDef.table} p
        WHERE p.${moduleDef.pk} = $1 AND p.tenant_id = $2${indukHidup}`,
      [parentId, claims.tenant_id],
    );
    if (!induk[0]) return null;

    const hidup = await softDeleteClause(client, child.table);
    const { rows: found } = await client.query(
      `SELECT t.*, t.${child.pk} AS id
         FROM ${child.table} t
        WHERE ${where} AND t.tenant_id = $2${hidup}
        ORDER BY ${child.orderBy}`,
      [parentId, claims.tenant_id],
    );
    return attachLabels(client, found);
  });
  if (rows === null) return sendProblem(res, 404, "Data tidak ditemukan.");
  sendData(res, rows.map(rowToCamel));
}

// --- Pencarian & bantuan AI --------------------------------------------------
//
// Pemisahan yang menentukan bentuk seluruh bagian ini: PENCARIAN DOKUMEN
// MILIK PERUSAHAAN TIDAK BERGANTUNG PADA MODEL. Kalau kunci API tidak ada
// atau pemanggilan model gagal, pencarian tetap menjawab dengan hasil dari
// basis data dan hanya kehilangan perluasan kata kuncinya. Yang gagal adalah
// bantuannya, bukan fungsinya.

function handleAiStatus(res) {
  sendData(res, {
    enabled: ai.aktif(),
    model: ai.aktif() ? ai.MODEL : null,
    jenis: Object.entries(ai.JENIS).map(([kode, j]) => ({ kode, label: j.label })),
  });
}

async function handleAiSearch(res, claims, body) {
  const frasa = String(body?.q || "").trim();
  if (frasa.length < 2) return sendProblem(res, 400, "Kata kunci terlalu pendek.", "Minimal 2 huruf.");

  // Perluasan dicoba lebih dulu, tapi kegagalannya TIDAK menggagalkan
  // pencarian — ia hanya dicatat dan disampaikan apa adanya ke layar.
  let perluasan = null;
  let catatanPerluasan = null;
  if (ai.aktif()) {
    try {
      perluasan = await ai.perluasKataKunci(frasa);
    } catch (error) {
      catatanPerluasan =
        error instanceof ai.AiError
          ? `Perluasan kata kunci dilewati: ${error.title}`
          : "Perluasan kata kunci dilewati karena model tidak terjangkau.";
      console.error("[demo-api] perluasan kata kunci gagal:", error);
    }
  } else {
    catatanPerluasan = "Perluasan kata kunci mati karena kunci API belum disetel.";
  }

  const hasil = await search.cari(claims.tenant_id, frasa, perluasan?.istilah ?? []);
  sendData(res, {
    frasa,
    perluasan: perluasan?.istilah ?? [],
    tafsir: perluasan?.catatan ?? null,
    catatan: catatanPerluasan,
    documents: hasil.documents.map(rowToCamel),
    regulations: hasil.regulations.map(rowToCamel),
  });
}

async function handleAiRegulations(res, body) {
  const frasa = String(body?.q || "").trim();
  if (frasa.length < 2) return sendProblem(res, 400, "Kata kunci terlalu pendek.", "Minimal 2 huruf.");
  try {
    sendData(res, await ai.rekomendasiPeraturan(frasa));
  } catch (error) {
    if (error instanceof ai.AiError) return sendProblem(res, error.status, error.title, error.detail);
    throw error;
  }
}

async function handleAiStructure(res, body) {
  const frasa = String(body?.q || "").trim();
  if (frasa.length < 2) return sendProblem(res, 400, "Kata kunci terlalu pendek.", "Minimal 2 huruf.");
  try {
    sendData(res, await ai.usulSusunan(frasa, String(body?.jenis || "SOP")));
  } catch (error) {
    if (error instanceof ai.AiError) return sendProblem(res, error.status, error.title, error.detail);
    throw error;
  }
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

// --- Analitik ----------------------------------------------------------------

/** Bawaan: 12 bulan terakhir sampai hari ini, termasuk bulan berjalan. */
function readPeriod(searchParams) {
  const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
  const raw = { from: searchParams.get("from"), to: searchParams.get("to") };
  const today = new Date();
  const defaultTo = today.toISOString().slice(0, 10);
  const defaultFrom = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 11, 1)).toISOString().slice(0, 10);

  // Nilai yang tidak berbentuk tanggal DIABAIKAN dan diganti bawaan, bukan
  // diteruskan ke Postgres. Diteruskan, ia jadi galat 500 yang di layar hanya
  // terbaca "gagal memuat" — padahal yang salah cuma isi kotak tanggal.
  const from = raw.from && ISO_DATE.test(raw.from) ? raw.from : defaultFrom;
  const to = raw.to && ISO_DATE.test(raw.to) ? raw.to : defaultTo;
  return from <= to ? { from, to } : { from: to, to: from };
}

async function handleMetric(res, claims, key, searchParams) {
  const metric = findMetric(key);
  if (!metric) return sendProblem(res, 404, "Metrik tidak dikenal.", key);

  const { from, to } = readPeriod(searchParams);
  const { text, values } = metric.build({ tenantId: claims.tenant_id, from, to });
  const rows = await withRls(claims.tenant_id, (client) => client.query(text, values).then((r) => r.rows));

  const shape =
    metric.kind === "scalar"
      ? { value: rows[0] ? Number(rows[0].value) : 0 }
      : metric.kind === "series"
        ? { points: rows.map((row) => ({ label: row.label, value: Number(row.value) })) }
        : { slices: rows.map((row) => ({ code: row.code, value: Number(row.value) })) };

  sendData(res, {
    key: metric.key,
    title: metric.title,
    caption: metric.caption,
    kind: metric.kind,
    unit: metric.unit,
    format: metric.format || null,
    tone: metric.tone || null,
    // Dikirim SETIAP kali, bukan hanya saat false: widget menampilkan periode
    // yang berlaku baginya, dan yang tidak terpengaruh menyatakannya sendiri.
    periodApplies: Boolean(metric.dateColumn),
    period: { from, to },
    ...shape,
  });
}

async function handleScorecard(res, claims) {
  const result = await withRls(claims.tenant_id, (client) => loadScorecard(client, claims.tenant_id));
  sendData(res, result);
}

// --- Tata letak dashboard ----------------------------------------------------

const LAYOUT_KEYS = new Set(["analytics", "scorecard"]);
// Batas ukuran ditegakkan di sini, bukan diserahkan ke kolom jsonb: kolom itu
// akan menerima berapa pun besarnya, dan satu klien yang keliru sudah cukup
// untuk menumbuhkan tabel preferensi tanpa batas.
const LAYOUT_MAX_BYTES = 32 * 1024;

async function handleGetLayout(res, claims, key) {
  if (!LAYOUT_KEYS.has(key)) return sendProblem(res, 404, "Dashboard tidak dikenal.", key);
  const layout = await withRls(claims.tenant_id, async (client) => {
    const { rows } = await client.query(
      `SELECT layout FROM dashboard_layouts WHERE tenant_id = $1 AND user_id = $2 AND dashboard_key = $3`,
      [claims.tenant_id, claims.sub, key],
    );
    return rows[0]?.layout ?? null;
  });
  // layout null = pengguna belum pernah menyusun sendiri. Klien memakai
  // susunan bawaannya, dan itu BUKAN kondisi galat.
  sendData(res, { key, layout });
}

async function handlePutLayout(res, claims, key, body) {
  if (!LAYOUT_KEYS.has(key)) return sendProblem(res, 404, "Dashboard tidak dikenal.", key);
  const layout = body?.layout;
  if (!layout || typeof layout !== "object" || Array.isArray(layout)) {
    return sendProblem(res, 400, "Susunan tidak sah.", "Field `layout` harus berupa objek.");
  }
  if (Buffer.byteLength(JSON.stringify(layout), "utf8") > LAYOUT_MAX_BYTES) {
    return sendProblem(res, 413, "Susunan terlalu besar.", `Batasnya ${LAYOUT_MAX_BYTES} byte.`);
  }

  await withRls(claims.tenant_id, (client) =>
    client.query(
      `INSERT INTO dashboard_layouts (tenant_id, user_id, dashboard_key, layout, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, now())
       ON CONFLICT (user_id, dashboard_key)
       DO UPDATE SET layout = EXCLUDED.layout, updated_at = now()`,
      [claims.tenant_id, claims.sub, key, JSON.stringify(layout)],
    ),
  );
  sendData(res, { key, layout });
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

  // --- pencarian & bantuan AI ---
  if (segments[0] === "ai") {
    const claims = requireClaims(req, res);
    if (!claims) return;
    if (segments[1] === "status" && method === "GET") return handleAiStatus(res);
    if (segments[1] === "search" && method === "POST") return handleAiSearch(res, claims, await readJsonBody(req));
    if (segments[1] === "regulations" && method === "POST") {
      return handleAiRegulations(res, await readJsonBody(req));
    }
    if (segments[1] === "structure" && method === "POST") return handleAiStructure(res, await readJsonBody(req));
    return sendProblem(res, 404, "Rute tidak dikenal.", pathname);
  }

  // --- analitik & scorecard (dicek sebelum registri modul) ---
  if (segments[0] === "analytics") {
    const claims = requireClaims(req, res);
    if (!claims) return;
    if (segments[1] === "catalog" && method === "GET") return sendData(res, catalog());
    if (segments.length === 2 && method === "GET") return handleMetric(res, claims, segments[1], searchParams);
    return sendProblem(res, 404, "Rute tidak dikenal.", pathname);
  }

  if (segments[0] === "scorecard" && segments.length === 1 && method === "GET") {
    const claims = requireClaims(req, res);
    if (!claims) return;
    return handleScorecard(res, claims);
  }

  if (segments[0] === "dashboard-layouts" && segments.length === 2) {
    const claims = requireClaims(req, res);
    if (!claims) return;
    if (method === "GET") return handleGetLayout(res, claims, segments[1]);
    if (method === "PUT") return handlePutLayout(res, claims, segments[1], await readJsonBody(req));
    return sendProblem(res, 405, "Metode tidak didukung.", method);
  }

  // --- berkas ---
  //
  // /files/download SENGAJA tidak memeriksa Bearer token: ia dipanggil oleh
  // <iframe>/<img> peramban, yang tidak bisa mengirim header. Izinnya sudah
  // diperiksa saat token dibuat lewat POST /files/sign, dan tokennya berlaku
  // lima menit untuk satu berkas.
  if (pathname === "/files/download" && method === "GET") {
    return files.handleDownload(req, res, url);
  }
  if (pathname === "/files/sign" && method === "POST") {
    const claims = requireClaims(req, res);
    if (!claims) return;
    return files.handleSignFile(res, claims, await readJsonBody(req));
  }

  // --- kotak persetujuan (lintas modul) ---
  if (segments[0] === "approvals") {
    const claims = requireClaims(req, res);
    if (!claims) return;
    if (segments.length === 1 && method === "GET") return writes.handleMyApprovals(res, claims);
    if (segments.length === 3 && segments[2] === "act" && method === "POST") {
      return writes.handleAct(res, claims, MODULES, segments[1], await readJsonBody(req));
    }
    return sendProblem(res, 404, "Rute tidak dikenal.", pathname);
  }

  // --- modul domain ---
  const moduleDef = findModuleByEndpoint(`/${segments[0] || ""}`);
  if (moduleDef) {
    const claims = requireClaims(req, res);
    if (!claims) return;

    // `/schema` dicek SEBELUM `/:id` karena keduanya sama-sama dua segmen —
    // tanpa urutan ini, "schema" akan diperlakukan sebagai UUID dan
    // menghasilkan 404 yang membingungkan.
    if (segments.length === 2 && segments[1] === "schema" && method === "GET") {
      return writes.handleSchema(res, claims, moduleDef);
    }

    if (method === "GET") {
      if (segments.length === 1) return handleModuleList(res, claims, moduleDef, searchParams);
      if (segments.length === 2) return handleModuleDetail(res, claims, moduleDef, segments[1]);
      if (segments.length === 3) {
        if (segments[2] === "approval") return writes.handleApprovalPanel(res, claims, moduleDef, segments[1]);
        const child = findChild(moduleDef, `/${segments[2]}`);
        if (child) return handleModuleChildren(res, claims, moduleDef, child, segments[1]);
      }
    }

    if (segments.length === 1 && method === "POST") {
      return writes.handleCreate(res, claims, moduleDef, await readJsonBody(req));
    }
    if (segments.length === 2 && method === "PUT") {
      return writes.handleUpdate(res, claims, moduleDef, segments[1], await readJsonBody(req));
    }
    if (segments.length === 2 && method === "DELETE") {
      return writes.handleDelete(res, claims, moduleDef, segments[1]);
    }
    if (segments.length === 3 && method === "POST") {
      if (segments[2] === "transition") {
        return writes.handleTransition(res, claims, moduleDef, segments[1], await readJsonBody(req));
      }
      if (segments[2] === "submit") return writes.handleSubmit(res, claims, moduleDef, segments[1]);
      if (segments[2] === "files") {
        // Batas badan permintaan dinaikkan HANYA untuk rute ini.
        return writes.wrapUpload(files.handleUpload, res, claims, moduleDef, segments[1], await readJsonBody(req, 12 * 1024 * 1024));
      }
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
