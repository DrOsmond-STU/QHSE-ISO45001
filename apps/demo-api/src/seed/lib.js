// Peralatan bersama seluruh berkas penyemai.
//
// Dua sifat yang menentukan bentuk berkas ini:
//
//   DETERMINISTIK. Setiap baris punya UUID yang diturunkan dari namanya
//   sendiri (uuidFor("document", "SOP-001")), bukan acak. Karena itu skrip
//   seed boleh dijalankan berkali-kali: yang kedua memperbarui baris yang
//   sama alih-alih menumpuk salinan. Basis data demo yang isinya berlipat
//   ganda setiap kali skrip dijalankan adalah cara cepat membuat angka di
//   dashboard kehilangan arti.
//
//   SADAR-SKEMA. upsert() membaca daftar kolom tabel dari information_schema
//   lalu membuang kunci yang tidak ada kolomnya. Tanpa itu, satu kolom yang
//   berganti nama di migrasi berikutnya akan menjatuhkan seluruh seed dengan
//   galat Postgres yang menyebut satu nama kolom dan tidak menyebut baris
//   mana yang menyebabkannya.
const crypto = require("node:crypto");

// UUID acak tetap sekali, dipakai sebagai ruang nama. Nilainya tidak penting;
// yang penting ia tidak pernah berubah, karena seluruh id data demo
// diturunkan darinya.
const NAMESPACE = "6f3b2c14-9a5d-4d7e-8f21-4c0a7b5e9d33";

/** UUID v5 (SHA-1) — sama seperti uuid.v5(), tanpa dependensi. */
function uuidFor(kind, key) {
  const namespaceBytes = Buffer.from(NAMESPACE.replace(/-/g, ""), "hex");
  const hash = crypto.createHash("sha1").update(namespaceBytes).update(`${kind}:${key}`, "utf8").digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // versi 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // varian RFC 4122
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** PRNG mulberry32 dengan benih dari string — dipakai untuk variasi yang
 * tetap sama di setiap penyemaian (skor, jeda hari, pemilihan pelaku). */
function seededRandom(seedText) {
  let h = 1779033703 ^ seedText.length;
  for (let i = 0; i < seedText.length; i++) {
    h = Math.imul(h ^ seedText.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(random, list) {
  return list[Math.floor(random() * list.length) % list.length];
}

function intBetween(random, min, max) {
  return min + Math.floor(random() * (max - min + 1));
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Titik acuan waktu untuk seluruh data demo, diambil SEKALI saat skrip mulai.
 *
 * Semua tanggal relatif terhadapnya, jadi data yang "terlambat" memang
 * benar-benar sudah lewat dan yang "akan datang" memang belum — kapan pun
 * skrip dijalankan. Tanggal yang dipatok mati akan pelan-pelan berubah
 * artinya: jadwal yang seharusnya menunggu perlahan berpindah ke kolom
 * terlambat, dan cerita yang disampaikan saat presentasi jadi tidak cocok
 * dengan layar.
 */
const NOW = new Date();

function daysAgo(days) {
  return new Date(NOW.getTime() - days * DAY_MS);
}

function daysFromNow(days) {
  return new Date(NOW.getTime() + days * DAY_MS);
}

/** Tanggal saja (kolom `date`) — dikirim sebagai teks YYYY-MM-DD supaya
 * tidak ada penggeseran zona waktu antara Node dan Postgres. */
function dateOnly(value) {
  return value.toISOString().slice(0, 10);
}

const columnCache = new Map();

async function columnsOf(client, table) {
  if (columnCache.has(table)) return columnCache.get(table);
  const { rows } = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
    [table],
  );
  if (rows.length === 0) throw new Error(`Tabel "${table}" tidak ada di basis data ini — seed dihentikan.`);
  const set = new Set(rows.map((row) => row.column_name));
  columnCache.set(table, set);
  return set;
}

/**
 * INSERT ... ON CONFLICT (pk) DO UPDATE. `defaults` diisi pemanggil dengan
 * nilai yang berlaku untuk semua baris (tenant_id, created_by, ...) dan
 * hanya dipakai kalau tabelnya memang punya kolom itu.
 */
async function upsert(client, table, pk, row, defaults) {
  const columns = await columnsOf(client, table);
  const merged = { ...(defaults || {}), ...row };

  const payload = {};
  for (const [key, value] of Object.entries(merged)) {
    if (value === undefined) continue;
    if (!columns.has(key)) continue;
    payload[key] = value;
  }
  // Prisma mengisi @updatedAt di sisi klien, jadi kolomnya NOT NULL tanpa
  // default di basis data — insert lewat SQL mentah harus mengisinya sendiri.
  if (columns.has("updated_at") && payload.updated_at === undefined) payload.updated_at = NOW;
  if (columns.has("created_at") && payload.created_at === undefined) payload.created_at = NOW;

  const keys = Object.keys(payload);
  const values = keys.map((key) => payload[key]);
  const placeholders = keys.map((_, index) => `$${index + 1}`);
  const updates = keys.filter((key) => key !== pk).map((key) => `"${key}" = EXCLUDED."${key}"`);

  const sql =
    `INSERT INTO "${table}" (${keys.map((key) => `"${key}"`).join(", ")}) VALUES (${placeholders.join(", ")}) ` +
    (updates.length > 0 ? `ON CONFLICT ("${pk}") DO UPDATE SET ${updates.join(", ")}` : `ON CONFLICT ("${pk}") DO NOTHING`);

  await client.query(sql, values);
  return payload[pk];
}

/**
 * Memastikan partisi system_audit_logs untuk bulan berjalan ada.
 *
 * Trigger audit menulis satu baris per baris domain yang disemai, dan
 * INSERT ke tabel berpartisi RANGE yang tidak punya partisi untuk tanggal
 * itu GAGAL — bukan diabaikan. Di apps/api partisi dibuat oleh
 * audit-log-partition-maintenance.worker.ts, yang tidak berjalan di
 * pemasangan shared hosting ini. Tanpa langkah ini, penyemaian pada awal
 * bulan yang partisinya belum dibuat akan berhenti dengan galat yang
 * menyebut nama partisi dan tidak menyebut penyebab sebenarnya.
 */
async function ensureAuditLogPartition(client, when) {
  const { rows } = await client.query(
    `SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'system_audit_logs' AND c.relkind = 'p'`,
  );
  if (rows.length === 0) return;

  const year = when.getUTCFullYear();
  const month = when.getUTCMonth();
  const name = `system_audit_logs_y${year}m${String(month + 1).padStart(2, "0")}`;
  const from = new Date(Date.UTC(year, month, 1));
  const to = new Date(Date.UTC(year, month + 1, 1));
  await client.query(
    `CREATE TABLE IF NOT EXISTS "${name}" PARTITION OF system_audit_logs FOR VALUES FROM ('${dateOnly(from)}') TO ('${dateOnly(to)}')`,
  );
}

module.exports = {
  uuidFor,
  seededRandom,
  pick,
  intBetween,
  NOW,
  DAY_MS,
  daysAgo,
  daysFromNow,
  dateOnly,
  upsert,
  columnsOf,
  ensureAuditLogPartition,
};
