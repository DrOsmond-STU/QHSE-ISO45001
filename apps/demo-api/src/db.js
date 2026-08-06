// Akses basis data untuk demo-api — `pg` langsung, TANPA Prisma.
//
// Prisma Client memuat skema 162 model ke dalam engine Rust-nya saat proses
// dinyalakan; di server tujuan itu saja sudah ~620 MB memori native, di luar
// heap JavaScript (diukur di deploy/cpanel/qhse-apitest.log). Paket hosting
// membatasi akun pada 1 GB, jadi apa pun yang memuat Prisma di sana akan
// dibunuh sebelum sempat melayani satu permintaan pun. `pg` tidak punya
// engine terpisah sama sekali — biayanya hanya soket dan parser teks.
//
// KONSEKUENSINYA yang harus diingat saat membaca berkas ini: tidak ada
// lapisan yang otomatis menambahkan filter tenant seperti PrismaService.
// withRls() melakukannya. Karena itu SETIAP query di modul ini WAJIB lewat
// withRls() di bawah, yang menyalakan konteks RLS di dalam transaksi persis
// seperti apps/api. Basis datanya sendiri yang menegakkan isolasi — seluruh
// tabel domain memakai FORCE ROW LEVEL SECURITY, jadi query tanpa konteks
// mengembalikan nol baris, bukan data tenant lain.
const { Pool } = require("pg");

let pool = null;

/** Pool tunggal — dibuat malas supaya `require()` berkas ini tidak langsung
 * membuka koneksi (skrip seed dan server memuat modul yang sama). */
function getPool() {
  if (pool) return pool;
  const connectionString = process.env.APP_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("APP_DATABASE_URL (atau DATABASE_URL) belum diisi — demo-api tidak bisa jalan tanpa itu.");
  }
  pool = new Pool({
    connectionString,
    // Kecil disengaja: satu akun shared hosting menjalankan beberapa aplikasi
    // sekaligus, dan Postgres cPanel punya batas koneksi yang tidak besar.
    max: Number(process.env.DEMO_API_POOL_MAX || 4),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  return pool;
}

/**
 * Menjalankan satu unit kerja di dalam transaksi dengan
 * `app.current_tenant_id` disetel — cerminan langsung PrismaService.withRls()
 * di apps/api, termasuk sifat fail-closed-nya: tanpa tenantId ia melempar,
 * bukan diam-diam menjalankan query tanpa filter.
 *
 * set_config() dengan parameter terikat, BUKAN interpolasi string ke `SET
 * LOCAL` — tenantId datang dari JWT yang kita tanda tangani sendiri, tapi
 * membangun kebiasaan yang benar di satu-satunya tempat yang menyentuh SQL
 * mentah jauh lebih murah daripada mengauditnya lagi nanti.
 */
async function withRls(tenantId, fn) {
  if (!tenantId) throw new Error("Tenant context tidak ditemukan — permintaan ditolak (fail closed).");
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [tenantId]);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Varian untuk kebutuhan pra-tenant: POST /auth/login menerima tenant lewat
 * header dan harus mencari user SEBELUM ada JWT. Konteks RLS tetap disetel —
 * yang berbeda hanya dari mana tenantId-nya datang, sama seperti alur
 * `x-tenant-id` di apps/api.
 */
async function withTenant(tenantId, fn) {
  return withRls(tenantId, fn);
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = { getPool, withRls, withTenant, closePool };
