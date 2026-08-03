// Pemeriksaan menyeluruh terhadap demo-api yang sedang berjalan.
//
//   node apps/demo-api/src/verify.js [http://127.0.0.1:3401]
//
// Menjalankan persis urutan yang dijalankan peramban saat presentasi: masuk
// lewat PKCE, ambil token, buka dashboard (15 permintaan hitung), buka satu
// daftar dan satu detail per modul, lalu buka kotak masuk notifikasi.
//
// Alasan berkas ini ada: kegagalan yang paling mahal pada pemasangan ini
// bukan yang berisik, melainkan yang sunyi — satu nama kolom yang meleset
// membuat satu kartu dashboard menampilkan "—" sementara empat belas lainnya
// tampak sehat, dan itu baru ketahuan saat sudah ada penonton di ruangan.
// Menjalankan ini setelah setiap pemasangan mengubahnya menjadi daftar
// centang yang selesai dalam beberapa detik.
const crypto = require("node:crypto");
const { MODULES } = require("./modules");

const BASE = (process.argv[2] || process.env.DEMO_API_URL || "http://127.0.0.1:3401").replace(/\/$/, "");
const TENANT_ID = process.env.DEMO_TENANT_ID || require("./seed/foundation").TENANT_ID;
const EMAIL = process.env.DEMO_EMAIL || "budi.santoso@petro-ns.demo";
const PASSWORD = process.env.DEMO_PASSWORD || "Demo!QHSE2026";

let failures = 0;

function report(ok, label, extra) {
  if (!ok) failures += 1;
  console.log(`${ok ? "  ok  " : "  GAGAL"} ${label}${extra ? ` — ${extra}` : ""}`);
}

function base64Url(buffer) {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function call(path, { method = "GET", body, token, tenantId } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(tenantId ? { "x-tenant-id": tenantId } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text.slice(0, 200) };
  }
  return { status: response.status, payload };
}

async function main() {
  console.log(`=== memeriksa demo-api di ${BASE} ===\n`);

  const health = await call("/health");
  report(health.status === 200, "GET /health", `HTTP ${health.status}`);
  if (health.status !== 200) {
    console.log("\nServer tidak menjawab — periksa apakah prosesnya hidup dan portnya benar.");
    process.exit(1);
  }

  console.log("\n--- masuk (Authorization Code + PKCE) ---");
  const codeVerifier = base64Url(crypto.randomBytes(32));
  const codeChallenge = base64Url(crypto.createHash("sha256").update(codeVerifier).digest());

  const loginResult = await call("/auth/login", {
    method: "POST",
    tenantId: TENANT_ID,
    body: { email: EMAIL, password: PASSWORD, codeChallenge, codeChallengeMethod: "S256" },
  });
  report(loginResult.status === 200 && Boolean(loginResult.payload?.data?.code), `POST /auth/login sebagai ${EMAIL}`, `HTTP ${loginResult.status}`);
  if (loginResult.status !== 200) {
    console.log("   ", JSON.stringify(loginResult.payload));
    process.exit(1);
  }

  const tokenResult = await call("/auth/token", {
    method: "POST",
    body: { grantType: "authorization_code", code: loginResult.payload.data.code, codeVerifier },
  });
  const token = tokenResult.payload?.data?.accessToken;
  report(tokenResult.status === 200 && Boolean(token), "POST /auth/token", `HTTP ${tokenResult.status}`);
  if (!token) process.exit(1);

  // Verifier yang salah harus DITOLAK. Tanpa pemeriksaan ini, PKCE yang
  // rusak (menerima apa pun) akan lolos tanpa gejala apa pun.
  const badExchange = await call("/auth/token", {
    method: "POST",
    body: { grantType: "authorization_code", code: loginResult.payload.data.code, codeVerifier: "salah" },
  });
  report(badExchange.status === 401, "POST /auth/token dengan codeVerifier salah ditolak", `HTTP ${badExchange.status}`);

  const noToken = await call("/documents");
  report(noToken.status === 401, "GET /documents tanpa token ditolak", `HTTP ${noToken.status}`);

  console.log("\n--- dashboard: jumlah record per modul ---");
  let grandTotal = 0;
  for (const moduleDef of MODULES) {
    const result = await call(`${moduleDef.endpoint}?page=1&limit=1`, { token });
    const total = result.payload?.meta?.total;
    const ok = result.status === 200 && typeof total === "number" && total > 0;
    if (ok) grandTotal += total;
    report(ok, `${moduleDef.endpoint.padEnd(34)} ${String(total ?? "-").padStart(5)} record`, ok ? "" : `HTTP ${result.status}`);
  }

  console.log("\n--- daftar dan detail per modul ---");
  for (const moduleDef of MODULES) {
    const list = await call(`${moduleDef.endpoint}?page=1&limit=20`, { token });
    const first = Array.isArray(list.payload?.data) ? list.payload.data[0] : null;
    // `id` adalah kunci yang dipakai apps/web untuk membangun tautan detail
    // (getRowId di halaman daftar) — kalau alias kolom PK hilang, seluruh
    // tautan mengarah ke "undefined" dan tidak ada galat yang muncul.
    report(Boolean(first?.id), `${moduleDef.endpoint} daftar mengembalikan baris ber-id`, first ? "" : `HTTP ${list.status}`);
    if (!first?.id) continue;

    const detail = await call(`${moduleDef.endpoint}/${first.id}`, { token });
    report(detail.status === 200 && Boolean(detail.payload?.data), `${moduleDef.endpoint}/:id detail`, `HTTP ${detail.status}`);

    // Setiap tabel anak diperiksa terpisah. Satu modul kini punya sampai tiga
    // (mis. insiden: investigasi, akar masalah, CAPA terkait), dan yang paling
    // mungkin rusak justru yang jarang dibuka.
    for (const child of moduleDef.children ?? []) {
      const children = await call(`${moduleDef.endpoint}/${first.id}${child.pathSuffix}`, { token });
      const rows = children.payload?.data;
      report(
        children.status === 200 && Array.isArray(rows),
        `${moduleDef.endpoint}/:id${child.pathSuffix}`,
        children.status === 200 ? `${rows?.length ?? 0} baris` : `HTTP ${children.status}`,
      );
    }
  }

  console.log("\n--- analitik ---");
  const catalogRes = await call("/analytics/catalog", { token });
  const entries = Array.isArray(catalogRes.payload?.data) ? catalogRes.payload.data : [];
  report(catalogRes.status === 200 && entries.length > 0, "GET /analytics/catalog", `${entries.length} metrik`);

  // SETIAP metrik dipanggil, bukan sekadar contoh. Metrik adalah SQL agregat
  // yang menyebut nama kolom dan nilai enum secara harfiah, dan satu nama yang
  // meleset hanya terlihat saat metrik ITU dibuka — persis kegagalan sunyi
  // yang jadi alasan berkas ini ada. Ke-32 panggilan ini selesai dalam
  // hitungan detik.
  let kosong = 0;
  for (const entry of entries) {
    const result = await call(`/analytics/${entry.key}`, { token });
    const data = result.payload?.data;
    let ringkas = "";
    let ok = result.status === 200 && Boolean(data);
    if (ok && data.kind === "scalar") {
      ok = typeof data.value === "number";
      ringkas = String(data.value);
      if (data.value === 0) kosong += 1;
    } else if (ok && data.kind === "series") {
      ok = Array.isArray(data.points) && data.points.length > 0;
      ringkas = `${data.points?.length ?? 0} titik`;
    } else if (ok) {
      ok = Array.isArray(data.slices);
      ringkas = `${data.slices?.length ?? 0} irisan`;
      if ((data.slices?.length ?? 0) === 0) kosong += 1;
    }
    report(ok, `/analytics/${entry.key}`.padEnd(46), ok ? ringkas : `HTTP ${result.status}`);
  }
  // Metrik yang hasilnya kosong tidak dihitung gagal — nol CAPA lewat tenggat
  // adalah jawaban yang sah. Tapi kalau SEBAGIAN BESAR kosong, yang salah
  // hampir pasti datanya, bukan metriknya, dan itu perlu terlihat.
  console.log(`  catatan: ${kosong} dari ${entries.length} metrik menghasilkan nol/kosong`);

  console.log("\n--- Balanced Scorecard ---");
  const scorecard = await call("/scorecard", { token });
  const sc = scorecard.payload?.data;
  report(scorecard.status === 200 && (sc?.objectiveCount ?? 0) > 0, "GET /scorecard", `${sc?.objectiveCount ?? 0} sasaran`);
  report(typeof sc?.totalScore === "number", "skor total terhitung", sc?.totalScore?.toFixed?.(1));
  for (const perspective of sc?.perspectives ?? []) {
    const punyaTren = perspective.objectives.every((objective) => Array.isArray(objective.trend) && objective.trend.length > 0);
    report(
      perspective.objectives.length > 0 && perspective.score !== null && punyaTren,
      `perspektif ${perspective.code}`.padEnd(46),
      `${perspective.objectives.length} KPI, skor ${perspective.score?.toFixed?.(1) ?? "-"}`,
    );
  }
  report(Array.isArray(sc?.unmapped), "sasaran belum dipetakan terdaftar terpisah", `${sc?.unmapped?.length ?? 0} sasaran`);

  console.log("\n--- tata letak dashboard ---");
  for (const key of ["analytics", "scorecard"]) {
    const before = await call(`/dashboard-layouts/${key}`, { token });
    report(before.status === 200 && "layout" in (before.payload?.data ?? {}), `GET /dashboard-layouts/${key}`, `HTTP ${before.status}`);
  }
  // Ditulis lalu dibaca kembali: yang perlu dibuktikan bukan bahwa PUT
  // menjawab 200, melainkan bahwa isinya benar-benar tersimpan dan kembali
  // apa adanya. Nilai ujinya kemudian DIPULIHKAN ke keadaan semula agar
  // pemeriksaan ini tidak mengubah susunan milik akun demo.
  const original = (await call("/dashboard-layouts/analytics", { token })).payload?.data?.layout ?? null;
  const probe = { widgets: [{ key: "incident-trend", width: 2 }], period: { from: "2026-01-01", to: "2026-12-31" } };
  const written = await call("/dashboard-layouts/analytics", { method: "PUT", token, body: { layout: probe } });
  const readBack = await call("/dashboard-layouts/analytics", { token });
  report(
    written.status === 200 && readBack.payload?.data?.layout?.widgets?.[0]?.key === "incident-trend",
    "PUT lalu GET /dashboard-layouts/analytics",
    `HTTP ${written.status}`,
  );
  const rejected = await call("/dashboard-layouts/analytics", { method: "PUT", token, body: { layout: "bukan objek" } });
  report(rejected.status === 400, "susunan tidak sah ditolak", `HTTP ${rejected.status}`);
  if (original) await call("/dashboard-layouts/analytics", { method: "PUT", token, body: { layout: original } });

  console.log("\n--- notifikasi ---");
  const inbox = await call("/notifications?page=1&limit=20", { token });
  report(inbox.status === 200 && (inbox.payload?.meta?.total ?? 0) > 0, "GET /notifications", `${inbox.payload?.meta?.total ?? 0} notifikasi`);

  const unread = await call("/notifications/unread-count", { token });
  report(unread.status === 200 && typeof unread.payload?.data?.count === "number", "GET /notifications/unread-count", `${unread.payload?.data?.count} belum dibaca`);

  const preferences = await call("/notifications/preferences", { token });
  const matrixSize = preferences.payload?.data?.matrix?.length ?? 0;
  report(preferences.status === 200 && matrixSize === 56, "GET /notifications/preferences", `${matrixSize} sel matriks (harus 14 kategori x 4 kanal)`);

  const firstNotification = inbox.payload?.data?.[0];
  if (firstNotification) {
    const marked = await call(`/notifications/${firstNotification.id}/read`, { method: "POST", token });
    report(marked.status === 200 && marked.payload?.data?.isRead === true, "POST /notifications/:id/read", `HTTP ${marked.status}`);
  }

  console.log(`\n=== ${failures === 0 ? "SEMUA PEMERIKSAAN LULUS" : `${failures} PEMERIKSAAN GAGAL`} — total ${grandTotal} record di 15 modul ===`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("Pemeriksaan berhenti karena galat:", error);
  process.exit(1);
});
