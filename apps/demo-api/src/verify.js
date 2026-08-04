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

  /** Token akses untuk pengguna lain — dipakai memeriksa alur persetujuan
   *  berjenjang, yang mustahil diperiksa dari satu akun saja. */
  async function tokenFor(email) {
    const verifier = base64Url(crypto.randomBytes(32));
    const challenge = base64Url(crypto.createHash("sha256").update(verifier).digest());
    const login = await call("/auth/login", {
      method: "POST",
      tenantId: TENANT_ID,
      body: { email, password: PASSWORD, codeChallenge: challenge, codeChallengeMethod: "S256" },
    });
    if (login.status !== 200) return null;
    const exchanged = await call("/auth/token", {
      method: "POST",
      body: { grantType: "authorization_code", code: login.payload.data.code, codeVerifier: verifier },
    });
    return exchanged.payload?.data?.accessToken ?? null;
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
  // PEMULIHAN, dan cabang `else` itu yang selama ini hilang.
  //
  // Sebelumnya hanya `if (original)`. Pada jalan PERTAMA belum ada susunan
  // tersimpan, jadi tidak ada yang dipulihkan — dan layout uji berisi satu
  // widget itu menetap sebagai susunan milik akun demo. Jalan-jalan
  // berikutnya membacanya sebagai "asli" lalu memulihkannya dengan setia,
  // sehingga dashboard analitik akun demo terkunci pada satu widget selamanya.
  // Ditemukan saat membuka halamannya sendiri, bukan oleh pemeriksaan mana pun.
  if (original) {
    await call("/dashboard-layouts/analytics", { method: "PUT", token, body: { layout: original } });
  } else {
    const dihapus = await call("/dashboard-layouts/analytics", { method: "DELETE", token });
    report(dihapus.status === 200, "susunan uji dihapus, dashboard kembali ke bawaan", `HTTP ${dihapus.status}`);
  }

  console.log("\n--- CRUD & persetujuan (izin kerja) ---");
  // Membuat baris SUNGGUHAN lalu menghapusnya lunak di akhir. Alurnya tidak
  // bisa diperiksa tanpa menjalankannya: yang paling mungkin rusak setelah
  // pemasangan justru penomoran, penyelesaian approver, dan percabangan
  // bersyarat — dan ketiganya hanya terlihat saat benar-benar dijalankan.
  const schemaRes = await call("/work-permits/schema", { token });
  const fields = schemaRes.payload?.data?.fields ?? [];
  report(schemaRes.status === 200 && fields.length > 0, "GET /work-permits/schema", `${fields.length} field`);
  report(!fields.some((f) => f.column === "status"), "kolom status tidak bisa diisi lewat formulir");

  const pilihan = (kolom) => fields.find((f) => f.column === kolom)?.options ?? [];
  const tipeHot = pilihan("work_permit_type_id").find((o) => /Panas|Hot/i.test(o.label));
  const lokasi = pilihan("site_id")[0];
  const pemohon = pilihan("requester_id")[0];

  // Jumlah SEBELUM baris uji dibuat, untuk dibandingkan setelah dihapus.
  // Ini pemeriksaan yang seharusnya ada sejak awal: penghapusan lunak sempat
  // menjawab HTTP 200 sementara barisnya tetap terhitung dan tetap terbuka,
  // dan satu-satunya gejalanya adalah angka yang naik satu tiap putaran.
  const totalSebelum = (await call("/work-permits?page=1&limit=1", { token })).payload?.meta?.total ?? -1;

  const dibuat = await call("/work-permits", {
    method: "POST",
    token,
    body: {
      title: "Pemeriksaan otomatis pascapemasangan",
      description: "Dibuat qhse-live-check lalu dihapus lunak di akhir pemeriksaan.",
      workPermitTypeId: tipeHot?.value,
      siteId: lokasi?.value,
      requesterId: pemohon?.value,
      riskLevel: "HIGH",
      locationDetail: "—",
      plannedStartDatetime: new Date(Date.now() + 86400000).toISOString(),
      plannedEndDatetime: new Date(Date.now() + 172800000).toISOString(),
      numberOfWorkers: 2,
    },
  });
  const permitId = dibuat.payload?.data?.id;
  report(dibuat.status === 200 && Boolean(permitId), "POST /work-permits", dibuat.payload?.data?.permitNumber || `HTTP ${dibuat.status}`);

  if (permitId) {
    const kosong = await call("/work-permits", { method: "POST", token, body: {} });
    report(kosong.status === 422, "field wajib kosong ditolak", `HTTP ${kosong.status}`);

    const lompat = await call(`/work-permits/${permitId}/transition`, { method: "POST", token, body: { status: "APPROVED" } });
    report(lompat.status === 409, "DRAFT -> APPROVED ditolak state machine", `HTTP ${lompat.status}`);

    const ajukan = await call(`/work-permits/${permitId}/submit`, { method: "POST", token });
    report(ajukan.status === 200 && (ajukan.payload?.data?.approvers ?? 0) > 0, "POST /submit", `${ajukan.payload?.data?.approvers ?? 0} approver`);

    const ulang = await call(`/work-permits/${permitId}/submit`, { method: "POST", token });
    report(ulang.status === 409, "pengajuan kedua ditolak", `HTTP ${ulang.status}`);

    const panel = await call(`/work-permits/${permitId}/approval`, { token });
    const tahap = panel.payload?.data?.stages?.length ?? 0;
    report(panel.status === 200 && tahap >= 2, "panel persetujuan memuat tahapnya", `${tahap} tahap`);
    report(
      panel.payload?.data?.instance?.status === "IN_PROGRESS",
      "instance workflow berjalan",
      panel.payload?.data?.instance?.currentStageName,
    );

    // Menyetujui sebagai SUPERVISOR, bukan sebagai pengaju. Kalau penugasan
    // approver lewat user_roles rusak, tugasnya tidak akan pernah muncul di
    // sini — dan itulah kegagalan yang paling mungkin terjadi setelah seed
    // dijalankan ulang.
    const supervisorToken = await tokenFor("hendra.kusuma@petro-ns.demo");
    const inbox = await call("/approvals", { token: supervisorToken });
    const tugas = (inbox.payload?.data ?? []).find((t) => t.entityId === permitId);
    report(Boolean(tugas), "tugas muncul di kotak persetujuan Supervisor", `${inbox.payload?.data?.length ?? 0} tugas`);

    if (tugas) {
      const salahOrang = await call(`/approvals/${tugas.taskId}/act`, { method: "POST", token, body: { action: "APPROVE" } });
      report(salahOrang.status === 403, "orang lain tidak bisa menyetujui tugas itu", `HTTP ${salahOrang.status}`);

      const setuju = await call(`/approvals/${tugas.taskId}/act`, {
        method: "POST",
        token: supervisorToken,
        body: { action: "APPROVE", comment: "Pemeriksaan otomatis." },
      });
      report(setuju.status === 200, "Supervisor menyetujui", `HTTP ${setuju.status}`);
      report(setuju.payload?.data?.completed === null, "risiko HIGH lanjut ke tahap HSE, belum selesai");

      const klikGanda = await call(`/approvals/${tugas.taskId}/act`, { method: "POST", token: supervisorToken, body: { action: "APPROVE" } });
      report(klikGanda.status === 409, "klik ganda tidak menyetujui dua kali", `HTTP ${klikGanda.status}`);

      const hseToken = await tokenFor("andi.wijaya@petro-ns.demo");
      const inboxHse = await call("/approvals", { token: hseToken });
      const tugasHse = (inboxHse.payload?.data ?? []).find((t) => t.entityId === permitId);
      report(Boolean(tugasHse), "tahap HSE muncul di kotak HSE Manager", tugasHse?.stageName);

      if (tugasHse) {
        const setujuHse = await call(`/approvals/${tugasHse.taskId}/act`, {
          method: "POST",
          token: hseToken,
          body: { action: "APPROVE", comment: "Pemeriksaan otomatis." },
        });
        report(setujuHse.payload?.data?.completed?.status === "APPROVED", "instance selesai APPROVED");
        report(setujuHse.payload?.data?.domainStatus === "APPROVED", "status izin kerja ikut jadi APPROVED");
      }
    }

    const dihapus = await call(`/work-permits/${permitId}`, { method: "DELETE", token });
    report(dihapus.status === 200, "baris uji dihapus lunak kembali", `HTTP ${dihapus.status}`);

    const dibukaLagi = await call(`/work-permits/${permitId}`, { token });
    report(dibukaLagi.status === 404, "baris terhapus tidak bisa dibuka lewat URL-nya", `HTTP ${dibukaLagi.status}`);

    // Anaknya diperiksa terpisah dari induknya, karena keduanya pernah
    // berbeda: detail sudah menjawab 404 sementara daftar anaknya masih
    // terbuka lebar.
    const anakSetelahHapus = await call(`/work-permits/${permitId}/gas-tests`, { token });
    report(anakSetelahHapus.status === 404, "daftar anak ikut tertutup", `HTTP ${anakSetelahHapus.status}`);

    const totalSesudah = (await call("/work-permits?page=1&limit=1", { token })).payload?.meta?.total ?? -2;
    report(totalSesudah === totalSebelum, "jumlah record kembali seperti semula", `${totalSebelum} -> ${totalSesudah}`);
  }

  console.log("\n--- berkas: dokumen terkendali & register peraturan ---");
  const docList = await call("/documents?page=1&limit=1", { token });
  const docId = docList.payload?.data?.[0]?.id;
  const versions = await call(`/documents/${docId}/versions`, { token });
  const versionId = versions.payload?.data?.[0]?.id;
  report(Boolean(versionId), "dokumen punya versi", `${versions.payload?.data?.length ?? 0} versi`);

  if (versionId) {
    const signed = await call("/files/sign", { method: "POST", token, body: { kind: "version", id: versionId } });
    report(signed.status === 200 && Boolean(signed.payload?.data?.url), "POST /files/sign", signed.payload?.data?.fileName);

    if (signed.payload?.data?.url) {
      // Diambil TANPA header Authorization, persis seperti <iframe> peramban
      // melakukannya. Kalau rute unduh diam-diam menuntut Bearer token,
      // penampilnya akan kosong di layar sementara seluruh pemeriksaan API
      // lain tetap hijau.
      const unduh = await fetch(`${BASE}${signed.payload.data.url}`);
      const bytes = Buffer.from(await unduh.arrayBuffer());
      report(
        unduh.status === 200 && bytes.subarray(0, 5).toString() === "%PDF-",
        "berkas terunduh tanpa header auth dan benar PDF",
        `${bytes.length} byte`,
      );
      report(
        (unduh.headers.get("content-disposition") || "").startsWith("inline"),
        "disajikan inline supaya bisa ditampilkan penampil",
      );
      // includes(), bukan kesetaraan: header ini bisa datang dari demo-api,
      // dari Apache, atau dari keduanya — dan yang penting nilainya ADA, bukan
      // berapa lapis yang memasangnya.
      report(
        (unduh.headers.get("x-content-type-options") || "").includes("nosniff"),
        "nosniff dipasang pada unduhan",
        unduh.headers.get("x-content-type-options") || "(kosong)",
      );

      // PEMERIKSAAN YANG PALING PENTING DI BAGIAN INI. Penampil dokumen
      // menampilkan PDF di dalam <iframe> pada origin yang sama. Kalau proxy
      // di depan memasang X-Frame-Options: DENY pada respons ini, bingkainya
      // kosong — dan tidak ada satu pun pemeriksaan API lain yang akan
      // memperlihatkannya, karena berkasnya tetap terunduh dengan benar.
      const xfo = (unduh.headers.get("x-frame-options") || "").toUpperCase();
      report(!xfo.includes("DENY"), "unduhan boleh dibingkai halaman sendiri", xfo || "(tanpa X-Frame-Options)");
    }

    const tokenPalsu = await fetch(`${BASE}/files/download?token=ngawur.deadbeef`);
    report(tokenPalsu.status === 403, "token berkas cacat ditolak", `HTTP ${tokenPalsu.status}`);
  }

  // --------------------------------------------------------------------------
  //  Unggahan diuji pada dokumen SEKALI PAKAI, bukan pada dokumen demo.
  //
  //  Mengunggah berkas ke dokumen terkendali berarti MELAHIRKAN REVISI BARU,
  //  dan revisi dokumen terkendali memang tidak boleh bisa dihapus lagi — itu
  //  justru inti gunanya. Akibatnya, pemeriksaan yang menumpang pada dokumen
  //  demo menumpuk revisi permanen padanya, satu setiap putaran cron:
  //
  //      05:16  3 versi    05:36  4 versi    05:46  5 versi
  //
  //  Tiga putaran sudah menambah dua revisi palsu pada dokumen yang dipakai
  //  saat presentasi. Yang benar bukan membuat revisi bisa dihapus, melainkan
  //  tidak menyentuh dokumen sungguhan sama sekali: dokumen sekali pakai
  //  dibuat di sini dan dihapus lunak di akhir, sama seperti izin kerja uji.
  //
  //  Penandatanganan dan pengunduhan di atas tetap memakai dokumen demo —
  //  keduanya hanya MEMBACA, dan berkas hasil seed-lah yang justru ingin
  //  dipastikan masih bisa dibuka.
  // --------------------------------------------------------------------------
  const docSchema = await call("/documents/schema", { token });
  const docFields = docSchema.payload?.data?.fields ?? [];
  const pilihanDok = (kolom) => docFields.find((f) => f.column === kolom)?.options ?? [];
  const kategori = pilihanDok("document_category_id")[0];
  const pemilik = pilihanDok("owner_user_id")[0];
  const jenisDok = pilihanDok("document_type").find((o) => /PROCEDURE/i.test(o.value)) ?? pilihanDok("document_type")[0];

  const dokUji = await call("/documents", {
    method: "POST",
    token,
    body: {
      title: "Dokumen uji pemeriksaan otomatis",
      description: "Dibuat qhse-live-check lalu dihapus lunak di akhir pemeriksaan.",
      documentType: jenisDok?.value,
      documentCategoryId: kategori?.value,
      ownerUserId: pemilik?.value,
    },
  });
  const dokUjiId = dokUji.payload?.data?.id;
  report(
    dokUji.status === 200 && Boolean(dokUjiId),
    "POST /documents — dokumen sekali pakai untuk uji unggah",
    dokUji.payload?.data?.documentNumber || `HTTP ${dokUji.status}`,
  );

  if (dokUjiId) {
    // PDF minimum yang sah, dirakit di sini supaya pemeriksaan tidak
    // bergantung pada berkas di disk.
    const pdfKecil = Buffer.from(
      "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
      "latin1",
    );
    const unggah = await call(`/documents/${dokUjiId}/files`, {
      method: "POST",
      token,
      body: {
        fileName: "pemeriksaan-otomatis.pdf",
        mimeType: "application/pdf",
        contentBase64: pdfKecil.toString("base64"),
        changeSummary: "Diunggah pemeriksa otomatis pascapemasangan.",
      },
    });
    report(
      unggah.status === 200,
      "POST /documents/:id/files membuat revisi baru",
      unggah.status === 200 ? `revisi ${unggah.payload?.data?.majorVersion}.${unggah.payload?.data?.minorVersion}` : `HTTP ${unggah.status}`,
    );

    const isiPalsu = await call(`/documents/${dokUjiId}/files`, {
      method: "POST",
      token,
      body: { fileName: "palsu.pdf", mimeType: "application/pdf", contentBase64: Buffer.from("bukan pdf").toString("base64") },
    });
    report(isiPalsu.status === 415, "berkas yang isinya tidak cocok tipenya ditolak", `HTTP ${isiPalsu.status}`);

    const tipeTerlarang = await call(`/documents/${dokUjiId}/files`, {
      method: "POST",
      token,
      body: { fileName: "x.exe", mimeType: "application/x-msdownload", contentBase64: Buffer.from("MZ").toString("base64") },
    });
    report(tipeTerlarang.status === 415, "tipe di luar daftar putih ditolak", `HTTP ${tipeTerlarang.status}`);

    const dokDihapus = await call(`/documents/${dokUjiId}`, { method: "DELETE", token });
    report(dokDihapus.status === 200, "dokumen sekali pakai dihapus lunak kembali", `HTTP ${dokDihapus.status}`);
  }

  const regList = await call("/regulatory-registers?page=1&limit=10", { token });
  const regAktif = (regList.payload?.data ?? []).find((r) => r.status === "ACTIVE");
  if (regAktif) {
    const lampiran = await call(`/regulatory-registers/${regAktif.id}/attachments`, { token });
    const jumlah = lampiran.payload?.data?.length ?? 0;
    report(lampiran.status === 200 && jumlah > 0, "register peraturan punya salinan terlampir", `${jumlah} lampiran`);
    if (jumlah > 0) {
      const signedReg = await call("/files/sign", {
        method: "POST",
        token,
        body: { kind: "attachment", id: lampiran.payload.data[0].id },
      });
      report(signedReg.status === 200, "lampiran peraturan bisa ditandatangani", signedReg.payload?.data?.fileName);
    }
  }

  // --------------------------------------------------------------------------
  //  Pencarian & bantuan AI.
  //
  //  Yang diperiksa di sini BUKAN kecerdasan modelnya, melainkan pembagian
  //  tugasnya: pencarian dokumen milik perusahaan harus tetap bekerja penuh
  //  ketika kunci API tidak ada, dan rute yang memang butuh model harus
  //  menolak dengan jelas — bukan mengembalikan hasil kosong yang terlihat
  //  seperti "tidak ada dokumen yang cocok".
  // --------------------------------------------------------------------------
  // --------------------------------------------------------------------------
  //  Dashboard eksekutif.
  //
  //  Yang diperiksa terutama SATU HAL: bahwa indikator kekerapan membedakan
  //  "nol" dari "belum bisa dihitung". LTIFR nol berarti tidak ada kecelakaan;
  //  LTIFR kosong berarti jam kerjanya belum diisi. Menampilkan yang kedua
  //  sebagai yang pertama adalah kabar baik yang dikarang dari data yang tidak
  //  ada — dan pada dashboard direksi, itu jenis kesalahan yang paling mahal.
  // --------------------------------------------------------------------------
  console.log("\n--- dashboard eksekutif ---");
  const jamKerja = await call("/analytics/exec-manhours?from=2025-09-01&to=2026-08-31", { token });
  report((jamKerja.payload?.data?.value ?? 0) > 0, "jam kerja terisi", `${jamKerja.payload?.data?.value} jam`);

  const ltifr = await call("/analytics/exec-ltifr?from=2025-09-01&to=2026-08-31", { token });
  const nilaiLtifr = ltifr.payload?.data?.value;
  report(ltifr.status === 200 && typeof nilaiLtifr === "number", "LTIFR terhitung", nilaiLtifr?.toFixed?.(2));
  // Kisaran kewajaran, bukan sekadar "ada angkanya": LTIFR 40 atau 0,0001
  // berarti pembilang dan penyebutnya tidak sepadan, dan itu tidak akan
  // ketahuan dari pemeriksaan yang hanya menuntut angka bukan null.
  report(nilaiLtifr > 0 && nilaiLtifr < 20, "LTIFR berada di kisaran yang masuk akal");

  // Periode tanpa statistik jam kerja HARUS mengembalikan null, bukan nol.
  const ltifrKosong = await call("/analytics/exec-ltifr?from=2015-01-01&to=2015-12-31", { token });
  report(ltifrKosong.payload?.data?.value === null, "LTIFR tanpa jam kerja kosong, bukan nol", String(ltifrKosong.payload?.data?.value));

  const leading = await call("/analytics/exec-leading-indicators?from=2025-09-01&to=2026-08-31", { token });
  const irisan = leading.payload?.data?.slices ?? [];
  report(irisan.length === 5, "leading indicator memuat lima kegiatan", `${irisan.length} irisan`);
  report(!irisan.some((s) => s.code === "TRAINING_HOUR"), "jam pelatihan tidak dicampur ke cacah kegiatan");

  const tataEksekutif = await call("/dashboard-layouts/executive", { token });
  report(tataEksekutif.status === 200, "GET /dashboard-layouts/executive", `HTTP ${tataEksekutif.status}`);

  const objektif = await call("/quality-objectives?page=1&limit=1", { token });
  report((objektif.payload?.meta?.total ?? 0) > 0, "indikator scorecard bisa dikelola sebagai modul", `${objektif.payload?.meta?.total} indikator`);

  const statistik = await call("/hse-period-statistics?page=1&limit=1", { token });
  report((statistik.payload?.meta?.total ?? 0) >= 12, "statistik HSE bulanan tersedia", `${statistik.payload?.meta?.total} bulan`);

  // --------------------------------------------------------------------------
  //  PELATIHAN — yang diperiksa di sini adalah HUBUNGAN rencana dan realisasi,
  //  bukan sekadar keberadaan barisnya.
  //
  //  Dua modul yang masing-masing berisi data yang benar tetapi tidak
  //  berhubungan akan lulus setiap pemeriksaan "ada berapa record" dan tetap
  //  tidak menjawab satu pun pertanyaan yang membuat modul ini dibuat:
  //  rencana mana yang belum terpenuhi, dan pelatihan mana yang berjalan di
  //  luar rencana.
  // --------------------------------------------------------------------------
  console.log("\n--- program & realisasi pelatihan ---");
  const program = await call("/training-programs?page=1&limit=100", { token });
  const barisProgram = program.payload?.data ?? [];
  report((program.payload?.meta?.total ?? 0) > 0, "program pelatihan tersedia", `${program.payload?.meta?.total} program`);
  report(
    barisProgram.some((baris) => baris.isMandatory === true && baris.regulatoryBasis),
    "pelatihan wajib menyebut dasar peraturannya",
  );
  // Ketiga keadaan ini yang membuat tingkat pencapaian punya arti. Kalau
  // seluruh program berstatus sama, angkanya tidak pernah bergerak.
  const statusProgram = new Set(barisProgram.map((baris) => baris.status));
  report(statusProgram.size >= 3, "status program beragam", [...statusProgram].join(", "));

  const realisasi = await call("/training-realizations?page=1&limit=100", { token });
  const barisRealisasi = realisasi.payload?.data ?? [];
  report((realisasi.payload?.meta?.total ?? 0) > 0, "realisasi pelatihan tersedia", `${realisasi.payload?.meta?.total} sesi`);
  report(
    barisRealisasi.some((baris) => baris.trainingProgramId === null),
    "ada pelatihan yang terjadi tanpa program — kolomnya memang boleh kosong",
  );
  report(
    barisRealisasi.some((baris) => baris.trainingProgramIdLabel),
    "realisasi menunjuk nomor programnya, bukan UUID",
  );
  // Sesi yang belum berlangsung TIDAK boleh sudah punya angka kehadiran.
  const kehadiranMasaDepan = barisRealisasi.filter(
    (baris) => baris.status === "SCHEDULED" && Number(baris.actualParticipants) > 0,
  );
  report(kehadiranMasaDepan.length === 0, "sesi terjadwal belum punya kehadiran", `${kehadiranMasaDepan.length} pelanggaran`);
  // Peserta lulus tidak boleh melebihi peserta hadir — pertentangan yang
  // paling mudah lolos karena kedua kolomnya diisi terpisah.
  const lulusBerlebih = barisRealisasi.filter((baris) => Number(baris.passedParticipants) > Number(baris.actualParticipants));
  report(lulusBerlebih.length === 0, "peserta lulus tidak melebihi peserta hadir", `${lulusBerlebih.length} pelanggaran`);

  const induk = barisRealisasi.find((baris) => baris.trainingProgramId);
  if (induk) {
    const anak = await call(`/training-programs/${induk.trainingProgramId}/realizations`, { token });
    report((anak.payload?.data?.length ?? 0) > 0, "detail program memuat realisasinya", `${anak.payload?.data?.length} sesi`);
  }

  const bersertifikat = barisRealisasi.find((baris) => baris.certificateIssued === true);
  if (bersertifikat) {
    const peserta = await call(`/training-realizations/${bersertifikat.trainingRealizationId}/participants`, { token });
    const daftar = peserta.payload?.data ?? [];
    report(daftar.length > 0, "sesi bersertifikat memuat daftar peserta", `${daftar.length} peserta`);
    // Sertifikat pada peserta yang tidak lulus adalah cacat data yang paling
    // memalukan saat auditor membuka satu baris secara acak.
    const salahSertifikat = daftar.filter((baris) => baris.result !== "PASSED" && baris.certificateNumber);
    report(salahSertifikat.length === 0, "hanya peserta lulus yang bernomor sertifikat", `${salahSertifikat.length} pelanggaran`);
    report(
      daftar.some((baris) => baris.userId === null),
      "peserta kontraktor tanpa akun tetap bisa dicatat",
    );
  }

  const pencapaian = await call("/analytics/training-realization-rate", { token });
  const nilaiPencapaian = pencapaian.payload?.data?.value;
  report(
    typeof nilaiPencapaian === "number" && nilaiPencapaian > 0 && nilaiPencapaian < 100,
    "pencapaian program pelatihan terhitung dan belum 100%",
    `${nilaiPencapaian?.toFixed?.(1)}%`,
  );
  const jamOrang = await call("/analytics/training-participant-hours?from=2025-09-01&to=2026-08-31", { token });
  report((jamOrang.payload?.data?.value ?? 0) > 0, "jam-orang pelatihan terealisasi", `${jamOrang.payload?.data?.value} jam-orang`);
  const wajibBelum = await call("/analytics/training-mandatory-not-done", { token });
  report(typeof wajibBelum.payload?.data?.value === "number", "pelatihan wajib belum terlaksana terhitung", `${wajibBelum.payload?.data?.value} program`);

  // Modul baru yang hanya bisa DIBACA adalah modul setengah jadi, dan itu
  // tidak terlihat dari pemeriksaan mana pun di atas. Yang paling mungkin
  // rusak pada modul baru justru penomorannya: penghitung dimulai dari nol
  // sementara tabelnya sudah memuat 18 baris hasil penyemaian, dan gejalanya
  // adalah nomor duplikat yang baru ketahuan saat UNIQUE-nya menolak.
  const skemaProgram = await call("/training-programs/schema", { token });
  const fieldProgram = skemaProgram.payload?.data?.fields ?? [];
  report(skemaProgram.status === 200 && fieldProgram.length > 0, "GET /training-programs/schema", `${fieldProgram.length} field`);
  report(!fieldProgram.some((f) => f.column === "program_number"), "nomor program tidak diisi lewat formulir");

  const totalProgramSebelum = program.payload?.meta?.total ?? -1;
  const programBaru = await call("/training-programs", {
    method: "POST",
    token,
    body: {
      title: "Pemeriksaan otomatis pascapemasangan",
      trainingType: "AWARENESS",
      fiscalYear: new Date().getFullYear(),
      plannedParticipants: 1,
      plannedHoursPerParticipant: 1,
      plannedSessions: 1,
      deliveryMethod: "IN_HOUSE",
    },
  });
  const nomorBaru = programBaru.payload?.data?.programNumber;
  report(programBaru.status === 201 || programBaru.status === 200, "POST /training-programs", nomorBaru || `HTTP ${programBaru.status}`);
  // Nomor yang bertabrakan dengan hasil penyemaian berarti penghitungnya
  // tidak diselaraskan — bukan sekadar nomor jelek.
  report(
    Boolean(nomorBaru) && !barisProgram.some((baris) => baris.programNumber === nomorBaru),
    "nomor program baru tidak menabrak nomor yang sudah ada",
    nomorBaru,
  );

  const idProgramBaru = programBaru.payload?.data?.trainingProgramId;
  if (idProgramBaru) {
    // DRAFT -> COMPLETED tidak ada di state machine; kalau ia lolos, berarti
    // daftar transisinya tidak dibaca sama sekali.
    const lompat = await call(`/training-programs/${idProgramBaru}/transition`, { method: "POST", token, body: { status: "COMPLETED" } });
    report(lompat.status === 409, "DRAFT -> COMPLETED ditolak state machine", `HTTP ${lompat.status}`);

    const sah = await call(`/training-programs/${idProgramBaru}/transition`, { method: "POST", token, body: { status: "APPROVED" } });
    report(sah.status === 200, "DRAFT -> APPROVED diterima", `HTTP ${sah.status}`);

    const dihapus = await call(`/training-programs/${idProgramBaru}`, { method: "DELETE", token });
    report(dihapus.status === 200, "baris uji dihapus lunak kembali", `HTTP ${dihapus.status}`);
    const totalProgramSesudah = (await call("/training-programs?page=1&limit=1", { token })).payload?.meta?.total ?? -1;
    report(
      totalProgramSesudah === totalProgramSebelum,
      "jumlah program kembali seperti semula",
      `${totalProgramSebelum} -> ${totalProgramSesudah}`,
    );
  }

  console.log("\n--- pencarian & bantuan AI ---");
  const statusAi = await call("/ai/status", { token });
  const aiAktif = statusAi.payload?.data?.enabled === true;
  report(statusAi.status === 200, "GET /ai/status", aiAktif ? `aktif — ${statusAi.payload?.data?.model}` : "belum diaktifkan");
  report((statusAi.payload?.data?.jenis ?? []).length >= 4, "jenis dokumen yang bisa disusunkan terdaftar");

  const cariRuang = await call("/ai/search", { method: "POST", token, body: { q: "ruang terbatas" } });
  const dokumenDitemukan = cariRuang.payload?.data?.documents ?? [];
  report(cariRuang.status === 200 && dokumenDitemukan.length > 0, "POST /ai/search menemukan dokumen", `${dokumenDitemukan.length} dokumen`);
  report(
    dokumenDitemukan.some((d) => /Ruang Terbatas/i.test(d.title)),
    "dokumen yang paling cocok ikut terbawa",
    dokumenDitemukan[0]?.documentNumber,
  );
  report(Boolean(dokumenDitemukan[0]?.cuplikan), "cuplikan penjelas ikut dikirim");

  // Pencarian nomor peraturan menempuh jalur ILIKE, bukan tsquery — dan itu
  // jalur terpisah yang pernah gagal sendiri karena tanda baca pada nomor.
  const cariNomor = await call("/ai/search", { method: "POST", token, body: { q: "PermenLHK" } });
  report(
    (cariNomor.payload?.data?.regulations ?? []).length > 0,
    "pencarian nomor peraturan menempuh jalur ILIKE",
    `${(cariNomor.payload?.data?.regulations ?? []).length} peraturan`,
  );

  const cariPendek = await call("/ai/search", { method: "POST", token, body: { q: "a" } });
  report(cariPendek.status === 400, "kata kunci terlalu pendek ditolak", `HTTP ${cariPendek.status}`);

  const susun = await call("/ai/structure", { method: "POST", token, body: { q: "ruang terbatas", jenis: "IK" } });
  if (aiAktif) {
    report(susun.status === 200 && (susun.payload?.data?.bagian ?? []).length > 0, "POST /ai/structure menyusun kerangka", `${(susun.payload?.data?.bagian ?? []).length} bagian`);
  } else {
    // Tanpa kunci, yang benar adalah menolak dengan alasan yang terbaca —
    // bukan mengembalikan kerangka kosong yang tampak seperti jawaban.
    report(susun.status === 503, "tanpa kunci API, rute yang butuh model menolak dengan jelas", `HTTP ${susun.status}`);
    report(/ANTHROPIC_API_KEY/.test(susun.payload?.detail || ""), "penolakannya menyebutkan apa yang kurang");
  }

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

  console.log(`\n=== ${failures === 0 ? "SEMUA PEMERIKSAAN LULUS" : `${failures} PEMERIKSAAN GAGAL`} — total ${grandTotal} record di ${MODULES.length} modul ===`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("Pemeriksaan berhenti karena galat:", error);
  process.exit(1);
});
