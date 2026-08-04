import type { GaugeBand } from "@qhse/ui-components";
import { defaultPeriod, type MetricCatalogEntry } from "./analytics";

// Dashboard Eksekutif — susunan bawaan, pilihan tampilan, dan zona gauge.
//
// BEDANYA DENGAN HALAMAN ANALITIK, dan kenapa keduanya tidak dilebur:
//
//   Analitik menjawab "apa yang terjadi di modul ini" — satu metrik, satu
//   grafik, dipilih orang yang sedang menelusuri sesuatu.
//
//   Eksekutif menjawab "apakah kita aman, dan apakah yang kita lakukan untuk
//   mencegahnya berjalan" — angka kekerapan, pemisahan leading vs lagging,
//   dan penilaian terhadap ambang. Pembacanya tidak sedang menelusuri; ia
//   punya lima menit sebelum rapat berikutnya.
//
// Karena itu widget di sini boleh memilih WUJUD tampilannya (`viz`). Satu
// metrik yang sama bisa tampil sebagai angka besar di layar direksi dan
// sebagai gauge berpita di layar rapat bulanan, tanpa perlu dua metrik
// berbeda di server.

export type Viz = "auto" | "angka" | "gauge" | "batang" | "donat" | "garis";

export interface ExecutiveWidget {
  key: string;
  width: 1 | 2;
  /** "auto" = ikuti bentuk data dari server (scalar/series/breakdown). */
  viz: Viz;
}

export interface ExecutiveLayout {
  widgets: ExecutiveWidget[];
  period: { from: string; to: string };
  /** Judul di kepala dashboard — biasanya nama proyek atau periode laporan. */
  judul: string;
}

/**
 * Susunan bawaan: satu layar yang bisa dibaca tanpa disusun dulu.
 *
 * Urutannya mengikuti cara membaca laporan HSE, bukan urutan abjad:
 *   1. Yang paling tidak boleh terjadi (fatal) dan angka kekerapan.
 *   2. Besaran yang jadi pembaginya, supaya angka kekerapan bisa dinilai.
 *   3. Leading indicator — yang masih bisa digerakkan.
 *   4. Tren, untuk arah.
 */
export const DEFAULT_EXECUTIVE_WIDGETS: ExecutiveWidget[] = [
  { key: "exec-fatality", width: 1, viz: "angka" },
  { key: "exec-ltifr", width: 1, viz: "gauge" },
  { key: "exec-trir", width: 1, viz: "gauge" },
  { key: "exec-safe-manhours", width: 1, viz: "angka" },
  { key: "exec-manhours", width: 1, viz: "angka" },
  { key: "exec-manpower", width: 1, viz: "angka" },
  { key: "exec-lost-days", width: 1, viz: "angka" },
  { key: "exec-audit-finding-closed-rate", width: 1, viz: "gauge" },
  { key: "exec-training-hours", width: 1, viz: "angka" },
  { key: "exec-leading-indicators", width: 2, viz: "batang" },
  { key: "exec-unsafe-acts-conditions", width: 1, viz: "donat" },
  { key: "incident-by-classification", width: 1, viz: "batang" },
  { key: "incident-trend", width: 2, viz: "garis" },
  { key: "exec-unsafe-trend", width: 1, viz: "garis" },
  { key: "exec-manhours-trend", width: 1, viz: "garis" },
];

export function defaultExecutiveLayout(): ExecutiveLayout {
  return {
    widgets: [...DEFAULT_EXECUTIVE_WIDGETS],
    period: defaultPeriod(),
    judul: "Kinerja QHSE",
  };
}

// --- Zona gauge --------------------------------------------------------------
//
// AMBANGNYA DITULIS DI SINI, PER METRIK, DAN TIDAK DIHITUNG OTOMATIS.
//
// Gauge yang menghitung sendiri zonanya dari nilai minimum-maksimum data akan
// selalu memperlihatkan jarum di tengah, apa pun keadaannya — karena zonanya
// ikut bergeser bersama datanya. Yang dibutuhkan justru sebaliknya: ambang
// yang TETAP, supaya perbaikan dan kemunduran terlihat sebagai perpindahan.
//
// Angka LTIFR/TRIR di bawah memakai acuan yang lazim dipakai kontraktor migas
// di Indonesia; perusahaan yang punya sasaran sendiri mengubahnya di sini.
// Arahnya berlawanan: untuk LTIFR makin kecil makin baik, untuk tingkat
// penutupan temuan makin besar makin baik — dan itulah alasan zona tidak bisa
// disimpulkan dari angkanya saja.

export interface GaugeSpec {
  max: number;
  bands: GaugeBand[];
}

const BAIK = "var(--qhse-status-good)";
const CUKUP = "var(--qhse-status-warning)";
const SERIUS = "var(--qhse-status-serious)";
const BURUK = "var(--qhse-status-critical)";

export const GAUGE_SPEC: Record<string, GaugeSpec> = {
  // Makin kecil makin baik.
  "exec-ltifr": {
    max: 5,
    bands: [
      { hingga: 0.5, color: BAIK, label: "Sangat baik" },
      { hingga: 1.5, color: CUKUP, label: "Cukup" },
      { hingga: 3, color: SERIUS, label: "Perlu perhatian" },
      { hingga: 5, color: BURUK, label: "Buruk" },
    ],
  },
  "exec-trir": {
    max: 12,
    bands: [
      { hingga: 1.5, color: BAIK, label: "Sangat baik" },
      { hingga: 4, color: CUKUP, label: "Cukup" },
      { hingga: 8, color: SERIUS, label: "Perlu perhatian" },
      { hingga: 12, color: BURUK, label: "Buruk" },
    ],
  },
  // Makin besar makin baik — urutan warnanya karena itu terbalik.
  "exec-audit-finding-closed-rate": {
    max: 100,
    bands: [
      { hingga: 50, color: BURUK, label: "Buruk" },
      { hingga: 75, color: SERIUS, label: "Perlu perhatian" },
      { hingga: 90, color: CUKUP, label: "Cukup" },
      { hingga: 100, color: BAIK, label: "Sangat baik" },
    ],
  },
  "capa-closure-rate": {
    max: 100,
    bands: [
      { hingga: 50, color: BURUK, label: "Buruk" },
      { hingga: 75, color: SERIUS, label: "Perlu perhatian" },
      { hingga: 90, color: CUKUP, label: "Cukup" },
      { hingga: 100, color: BAIK, label: "Sangat baik" },
    ],
  },
  "inspection-pass-rate": {
    max: 100,
    bands: [
      { hingga: 60, color: BURUK, label: "Buruk" },
      { hingga: 80, color: SERIUS, label: "Perlu perhatian" },
      { hingga: 92, color: CUKUP, label: "Cukup" },
      { hingga: 100, color: BAIK, label: "Sangat baik" },
    ],
  },
};

/** Wujud yang MASUK AKAL untuk sebuah metrik, dipakai menyusun pilihan di
 *  menu pengaturan. Menawarkan "gauge" untuk deret waktu hanya akan
 *  menghasilkan widget yang kosong dan pengguna yang mengira produknya rusak. */
export function vizPilihan(entry: MetricCatalogEntry): Viz[] {
  if (entry.kind === "scalar") {
    return GAUGE_SPEC[entry.key] ? ["angka", "gauge"] : ["angka"];
  }
  if (entry.kind === "series") return ["garis"];
  return ["batang", "donat"];
}

export function vizBawaan(entry: MetricCatalogEntry): Viz {
  return vizPilihan(entry)[0] ?? "auto";
}

export const VIZ_LABEL: Record<Viz, string> = {
  auto: "Otomatis",
  angka: "Angka besar",
  gauge: "Gauge berpita",
  batang: "Batang",
  donat: "Donat",
  garis: "Garis",
};
