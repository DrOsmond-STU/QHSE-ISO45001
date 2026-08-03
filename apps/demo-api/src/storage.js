// Penyimpanan berkas di disk + URL bertanda tangan.
//
// KENAPA URL BERTANDA TANGAN, BUKAN HEADER AUTHORIZATION. Berkas ditampilkan
// lewat <iframe> dan <img>, dan keduanya tidak bisa mengirim header apa pun —
// peramban yang mengambilnya, bukan kode kita. Jadi izin aksesnya harus ikut
// di dalam URL-nya. Skemanya DISALIN dari
// apps/api/src/platform/attachment/local-storage.util.ts: base64url(JSON) +
// HMAC-SHA256, mandiri tanpa lookup basis data, dan punya masa berlaku.
//
// Token berumur pendek (5 menit) dan hanya menyebut satu berkas. Yang bocor
// karena tersalin dari address bar karena itu hanya membuka satu berkas dan
// hanya sebentar — bukan seluruh penyimpanan tenant.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

// LOCAL_STORAGE_PATH adalah nama yang SUDAH dipakai qhse-runner.sh untuk
// apps/api (STORAGE_MODE=local), dan menunjuk ke ~/qhse-data/storage — di luar
// direktori aplikasi, jadi pemasangan ulang tidak menghapusnya. Dipakai ulang
// di sini supaya kedua aplikasi menyimpan berkas di satu tempat; dua lokasi
// penyimpanan untuk satu tenant berarti separuh dokumennya hilang setiap kali
// yang membacanya berganti.
//
// LOCAL_STORAGE_ROOT hanya untuk menjalankan demo-api sendirian saat
// pengembangan, tanpa menyentuh setelan server.
const ROOT =
  process.env.LOCAL_STORAGE_ROOT ||
  process.env.LOCAL_STORAGE_PATH ||
  path.join(process.env.HOME || "/tmp", "qhse-data", "storage");
const SECRET = process.env.LOCAL_STORAGE_SIGNING_SECRET || "";
const TOKEN_TTL_MS = 5 * 60 * 1000;

// 8 MB, bukan 50 MB seperti DEFAULT_MAX_FILE_SIZE_BYTES di apps/api.
//
// Bedanya disengaja dan alasannya bukan selera: berkas masuk sebagai base64 di
// dalam JSON (lihat catatan di server.js), yang menggelembungkan 8 MB jadi
// ~11 MB di memori, dan prosesnya berjalan di akun dengan batas memori 1 GB
// yang sudah pernah membunuh proses lain di server ini. Batas yang lebih
// longgar akan lolos di laptop dan mematikan API-nya di produksi.
const MAX_FILE_BYTES = 8 * 1024 * 1024;

// Daftar putih tipe berkas. Diambil dari DEFAULT_ALLOWED_MIME_TYPES apps/api,
// DIKURANGI gambar animasi dan ditambah teks biasa.
//
// Daftar putih, bukan daftar hitam: yang tidak disebut ditolak. Daftar hitam
// pada unggahan berkas selalu kalah — selalu ada satu tipe yang lupa
// dicantumkan, dan yang lupa itulah yang dipakai orang.
const ALLOWED_MIME = new Map([
  ["application/pdf", "pdf"],
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["application/msword", "doc"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"],
  ["application/vnd.ms-excel", "xls"],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"],
  ["text/plain", "txt"],
]);

/** Tipe yang bisa ditampilkan langsung di peramban tanpa diunduh. */
const INLINE_VIEWABLE = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "text/plain"]);

class StorageError extends Error {
  constructor(status, title, detail) {
    super(title);
    this.status = status;
    this.title = title;
    this.detail = detail;
  }
}

function assertConfigured() {
  if (!SECRET) {
    throw new StorageError(
      500,
      "Penyimpanan berkas belum dikonfigurasi.",
      "LOCAL_STORAGE_SIGNING_SECRET kosong, jadi URL berkas tidak bisa ditandatangani.",
    );
  }
}

/** Nama berkas yang aman dipakai di disk — hanya untuk kerapian; jalur
 *  sesungguhnya ditentukan UUID, jadi nama tidak pernah bisa menabrak. */
function safeName(fileName) {
  return String(fileName || "berkas")
    .replace(/[^\w.\- ]+/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 80);
}

/**
 * Kunci penyimpanan: <tenant>/<jenis>/<uuid>-<nama>.
 *
 * tenant_id ikut di jalurnya supaya berkas dua tenant tidak pernah berada di
 * direktori yang sama. Itu bukan pengganti pemeriksaan izin — pemeriksaannya
 * tetap di basis data lewat RLS sebelum token dibuat — melainkan supaya satu
 * kekeliruan jalur tidak langsung berarti kebocoran lintas tenant.
 */
function buildKey(tenantId, kind, fileName) {
  return `${tenantId}/${kind}/${crypto.randomUUID()}-${safeName(fileName)}`;
}

function absolutePathFor(key) {
  const full = path.resolve(ROOT, key);
  // Penjagaan lintas-direktori. `key` datang dari basis data, bukan langsung
  // dari pengguna, tapi satu baris yang keliru tidak boleh cukup untuk membaca
  // /etc/passwd.
  if (full !== path.resolve(ROOT) && !full.startsWith(path.resolve(ROOT) + path.sep)) {
    throw new StorageError(400, "Jalur berkas tidak sah.");
  }
  return full;
}

function decodeUpload({ contentBase64, mimeType, fileName }) {
  if (!contentBase64 || typeof contentBase64 !== "string") {
    throw new StorageError(400, "Isi berkas kosong.", "Field contentBase64 wajib diisi.");
  }
  if (!ALLOWED_MIME.has(mimeType)) {
    throw new StorageError(
      415,
      "Tipe berkas tidak diizinkan.",
      `Yang diterima: ${[...ALLOWED_MIME.keys()].join(", ")}.`,
    );
  }
  const buffer = Buffer.from(contentBase64, "base64");
  if (buffer.length === 0) {
    throw new StorageError(400, "Isi berkas kosong.", "Hasil dekode base64 nol byte.");
  }
  if (buffer.length > MAX_FILE_BYTES) {
    throw new StorageError(
      413,
      "Berkas terlalu besar.",
      `Batasnya ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB; berkas ini ${Math.round(buffer.length / 1024 / 1024)} MB.`,
    );
  }
  // Tanda tangan berkas diperiksa untuk PDF dan gambar: mime_type datang dari
  // klien dan bisa berbohong. Yang diperiksa cuma beberapa byte pertama —
  // bukan pemindaian malware (itu ada di apps/api lewat antrean pemindai,
  // dan TIDAK ada di sini), melainkan supaya berkas yang mengaku PDF memang
  // PDF, sehingga penampil tidak menampilkan sesuatu yang lain.
  assertMagicMatches(buffer, mimeType, fileName);
  return buffer;
}

const MAGIC = {
  "application/pdf": [Buffer.from("%PDF-")],
  "image/png": [Buffer.from([0x89, 0x50, 0x4e, 0x47])],
  "image/jpeg": [Buffer.from([0xff, 0xd8, 0xff])],
  "image/webp": [Buffer.from("RIFF")],
};

function assertMagicMatches(buffer, mimeType, fileName) {
  const expected = MAGIC[mimeType];
  if (!expected) return;
  const cocok = expected.some((magic) => buffer.subarray(0, magic.length).equals(magic));
  if (!cocok) {
    throw new StorageError(
      415,
      "Isi berkas tidak cocok dengan tipenya.",
      `"${fileName}" dinyatakan sebagai ${mimeType}, tapi isinya bukan.`,
    );
  }
}

function saveBuffer(tenantId, kind, buffer, fileName) {
  const key = buildKey(tenantId, kind, fileName);
  const full = absolutePathFor(key);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, buffer);
  return { key, size: buffer.length };
}

function readBuffer(key) {
  const full = absolutePathFor(key);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full);
}

function exists(key) {
  if (!key) return false;
  try {
    return fs.existsSync(absolutePathFor(key));
  } catch {
    return false;
  }
}

// --- Token bertanda tangan ---------------------------------------------------

function sign(payload) {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
}

function createToken({ key, mimeType, fileName }) {
  assertConfigured();
  const json = Buffer.from(JSON.stringify({ key, mimeType, fileName, exp: Date.now() + TOKEN_TTL_MS })).toString(
    "base64url",
  );
  return `${json}.${sign(json)}`;
}

function verifyToken(token) {
  if (!SECRET || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [json, provided] = parts;
  const expected = sign(json);
  const a = Buffer.from(provided, "hex");
  const b = Buffer.from(expected, "hex");
  // Panjang dibandingkan lebih dulu: timingSafeEqual MELEMPAR kalau panjangnya
  // berbeda, dan galat yang tidak tertangkap di jalur verifikasi token adalah
  // cara paling mudah mengubah token cacat menjadi 500.
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(json, "base64url").toString());
    if (!payload.exp || payload.exp <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

module.exports = {
  ROOT,
  MAX_FILE_BYTES,
  ALLOWED_MIME,
  INLINE_VIEWABLE,
  StorageError,
  decodeUpload,
  saveBuffer,
  readBuffer,
  exists,
  createToken,
  verifyToken,
  safeName,
};
