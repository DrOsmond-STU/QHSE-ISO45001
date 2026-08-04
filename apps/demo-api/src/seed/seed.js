// Penyemai data dummy untuk demo/presentasi.
//
//   node apps/demo-api/src/seed/seed.js
//
// Membaca APP_DATABASE_URL (atau DATABASE_URL) dari lingkungan; di server
// keduanya sudah diekspor oleh ~/qhse-secrets.sh lewat qhse-runner.sh.
//
// BEDANYA DENGAN apps/api/prisma/seed-demo-data.ts — keduanya ada, dan
// keduanya masih berguna:
//
//   Penyemai itu memanggil service NestJS yang sebenarnya, jadi penomoran,
//   instans workflow, jejak audit, dan notifikasi lahir dari jalur bisnis
//   sungguhan. Itu representasi yang paling jujur, dan tetap jalur yang
//   dipakai di lingkungan yang memang mampu menjalankannya.
//
//   Yang ini menulis baris langsung lewat SQL. Ia TIDAK menjalankan aturan
//   bisnis apa pun — status ditulis apa adanya, bukan dicapai lewat
//   persetujuan. Yang ditukar dengan itu adalah kemampuan berjalan sama
//   sekali di shared hosting: ia tidak memuat AppModule, tidak memuat
//   Prisma, dan puncak pemakaian memorinya puluhan megabita, bukan ratusan.
//
// Skrip ini aman dijalankan berulang: setiap baris ber-UUID tetap yang
// diturunkan dari namanya, jadi penyemaian kedua memperbarui baris yang
// sama alih-alih menggandakannya.
const { getPool, withRls, closePool } = require("../db");
const { ensureAuditLogPartition, NOW } = require("./lib");
const { seedFoundation, TENANT_ID, TENANT_CODE, DEMO_PASSWORD, USERS } = require("./foundation");
const { seedReference } = require("./reference");
const { seedCompliance } = require("./domain-compliance");
const { seedEvents } = require("./domain-events");
const { seedOperations } = require("./domain-operations");
const { seedChildren } = require("./domain-children");
const { seedScorecard } = require("./scorecard");
const { seedHseStatistics } = require("./hse-statistics");
const { seedWorkflows } = require("./workflows");
const { seedFiles } = require("./files");
const { seedNotifications } = require("./notifications");

async function main() {
  const started = Date.now();
  console.log(`=== menyemai data demo untuk tenant ${TENANT_CODE} (${TENANT_ID}) ===`);

  // Partisi audit dibuat DI LUAR transaksi utama: CREATE TABLE di dalam
  // transaksi yang kemudian gagal akan ikut hilang, dan pesan galat yang
  // muncul justru pesan partisi hilang — menutupi penyebab sebenarnya.
  const bootstrap = await getPool().connect();
  try {
    await ensureAuditLogPartition(bootstrap, NOW);
  } finally {
    bootstrap.release();
  }

  const summary = await withRls(TENANT_ID, async (client) => {
    console.log("[1/10] fondasi — tenant, organisasi, pengguna");
    const ctx = await seedFoundation(client);

    console.log("[2/10] data referensi — kategori, jenis, template");
    const ref = await seedReference(client, ctx);

    console.log("[3/10] dokumen, peraturan, HIRA, izin kerja, tanggap darurat");
    const compliance = await seedCompliance(client, ctx, ref);

    console.log("[4/10] insiden, CAPA, inspeksi, audit, NCR mutu");
    const events = await seedEvents(client, ctx, ref);

    console.log("[5/10] lingkungan, kerja terbatas, aset, kalibrasi, kontraktor");
    const operations = await seedOperations(client, ctx, ref);

    // Baris anak disemai TERAKHIR dan membaca ulang induknya dari basis
    // data, bukan menerima id dari langkah sebelumnya. Itu membuat langkah
    // ini bisa dijalankan ulang sendirian setelah data induk berubah, dan
    // menghilangkan satu jalur di mana anak menunjuk induk yang sudah tidak
    // ada lagi.
    console.log("[6/10] isi detail — versi dokumen, temuan, akar masalah, rencana tindakan");
    const children = await seedChildren(client, ctx);

    // Sasaran mutu disemai setelah data domain: angka capaian yang ditulis di
    // sana mengacu pada isi modul lain (13 CAPA lewat tenggat, satu insiden
    // hilang hari kerja), jadi urutannya membuat keterkaitan itu terbaca saat
    // membaca log penyemaian dari atas ke bawah.
    console.log("[7/10] sasaran mutu & Balanced Scorecard");
    const scorecard = await seedScorecard(client, ctx);

    // Definisi workflow disemai SETELAH fondasi (butuh role_id) dan sebelum
    // notifikasi. Ia tidak bergantung pada data domain mana pun: yang dibuat
    // hanya kerangka tahap dan transisinya, bukan instance-nya.
    // Statistik HSE bulanan disemai setelah insiden: jam kerjanya sengaja
    // diselaraskan dengan jumlah insiden yang sudah ada, supaya LTIFR yang
    // muncul di dashboard eksekutif jatuh di kisaran yang wajar untuk operasi
    // migas alih-alih angka yang langsung terlihat karangan.
    console.log("[7b/10] statistik HSE bulanan — jam kerja & leading indicator");
    const statistik = await seedHseStatistics(client, ctx);

    console.log("[8/10] definisi workflow persetujuan");
    const workflows = await seedWorkflows(client, ctx);

    // Berkas dibuat SETELAH versi dokumennya ada, dan membaca ulang barisnya
    // dari basis data — sama seperti langkah isi detail.
    console.log("[9/10] berkas contoh — PDF versi dokumen & lampiran peraturan");
    const berkas = await seedFiles(client, ctx);

    console.log("[10/10] notifikasi");
    const notifications = await seedNotifications(client, ctx);

    return { ...compliance, ...events, ...operations, ...children, ...scorecard, ...statistik, ...workflows, ...berkas, ...notifications, users: ctx.users.length };
  });

  console.log("\n=== selesai dalam %d detik ===", Math.round((Date.now() - started) / 1000));
  console.log(JSON.stringify({ tenantId: TENANT_ID, tenantCode: TENANT_CODE, demoPassword: DEMO_PASSWORD, jumlah: summary }, null, 2));
  console.log("\nAkun demo (kata sandi sama untuk semuanya):");
  for (const user of USERS) console.log(`  ${user.email.padEnd(42)} ${user.roleCode}`);
  console.log(`\nTenant ID untuk halaman masuk: ${TENANT_ID}`);

  // Dipakai qhse-runner.sh untuk mengisi NEXT_PUBLIC_DEFAULT_TENANT_ID saat
  // membangun apps/web. Ditulis dari sini, bukan disalin manusia dari
  // keluaran di atas — UUID yang disalin dengan tangan adalah salah satu
  // cara termudah menghabiskan satu jam untuk satu karakter yang meleset.
  const tenantIdFile = process.env.QHSE_TENANT_ID_FILE;
  if (tenantIdFile) {
    require("node:fs").writeFileSync(tenantIdFile, `${TENANT_ID}\n`, "utf8");
    console.log(`Tenant ID juga ditulis ke ${tenantIdFile}`);
  }
}

main()
  .then(() => closePool())
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error("\n!!! penyemaian GAGAL:", error.message);
    if (error.detail) console.error("    detail:", error.detail);
    if (error.table) console.error("    tabel :", error.table);
    await closePool().catch(() => {});
    process.exit(1);
  });
