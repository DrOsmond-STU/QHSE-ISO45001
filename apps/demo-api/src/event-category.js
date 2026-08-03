// Salinan katalog kategori event dari
// apps/api/src/modules/domains/notification/event-category.ts.
//
// Disalin, bukan diimpor: berkas asalnya TypeScript dan hanya ada dalam
// bentuk terkompilasi di dalam artefak apps/api, sementara demo-api sengaja
// tidak bergantung pada apa pun di sana (itulah yang membuatnya bisa jalan
// saat apps/api tidak bisa). Halaman preferensi notifikasi menampilkan
// daftar ini apa adanya, jadi kalau katalog di apps/api bertambah, tambahkan
// juga di sini — selisihnya muncul sebagai baris yang hilang di tabel
// preferensi, tanpa galat apa pun.
const EVENT_CATEGORIES = [
  { code: "WORK_PERMIT", label: "Izin Kerja" },
  { code: "INCIDENT", label: "Insiden" },
  { code: "INSPECTION", label: "Inspeksi" },
  { code: "AUDIT", label: "Audit" },
  { code: "CAPA", label: "CAPA (Corrective & Preventive Action)" },
  { code: "COMPLIANCE", label: "Kepatuhan Regulasi" },
  { code: "CALIBRATION", label: "Kalibrasi Alat" },
  { code: "TRAINING", label: "Pelatihan & Sertifikasi" },
  { code: "ASSET", label: "Aset & Peralatan" },
  { code: "EMERGENCY", label: "Tanggap Darurat" },
  { code: "ACTION_TRACKING", label: "Tindak Lanjut" },
  { code: "MANAGEMENT_REVIEW", label: "Tinjauan Manajemen" },
  { code: "MEETING", label: "Rapat" },
  { code: "DOCUMENT", label: "Dokumen" },
];

const BY_CODE = new Map(EVENT_CATEGORIES.map((category) => [category.code, category]));

function getCategoryLabel(code) {
  return BY_CODE.get(code)?.label ?? code;
}

module.exports = { EVENT_CATEGORIES, getCategoryLabel };
