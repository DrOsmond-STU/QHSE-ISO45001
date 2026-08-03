import type { ColumnType } from "./modules";
import { humanizeEnum } from "./status-tone";

// Field @db.Date di Prisma diserialisasi jadi ISO tengah malam UTC
// ("2026-03-15T00:00:00.000Z"). Memformatnya di zona waktu lokal akan
// menggeser tanggalnya di zona mana pun yang berada di sebelah barat UTC
// (Eropa/Amerika) — "15 Mar" jadi "14 Mar". Karena itu formatter
// tanggal-saja DIKUNCI ke UTC, sementara field @db.Timestamptz (yang memang
// menandai satu titik waktu nyata) tetap dirender di zona waktu pembaca.
const DATE_ONLY = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "UTC" });
const DATE_TIME = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });
const NUMBER = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });
const CURRENCY = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

export const EMPTY_PLACEHOLDER = "—";

export function formatCell(value: unknown, type: ColumnType = "text"): string {
  if (type === "filesize") {
    const bytes = Number(value);
    if (!Number.isFinite(bytes)) return EMPTY_PLACEHOLDER;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace(".", ",")} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
  }

  if (value === null || value === undefined || value === "") return EMPTY_PLACEHOLDER;

  switch (type) {
    case "date":
    case "datetime": {
      const parsed = new Date(String(value));
      if (Number.isNaN(parsed.getTime())) return String(value);
      return (type === "date" ? DATE_ONLY : DATE_TIME).format(parsed);
    }
    case "number": {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? String(value) : NUMBER.format(parsed);
    }
    case "currency": {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? String(value) : CURRENCY.format(parsed);
    }
    case "longtext":
      return String(value);
    case "bool":
      return value ? "Ya" : "Tidak";
    case "enum":
    case "status":
      return typeof value === "string" ? humanizeEnum(value) : String(value);
    default:
      if (typeof value === "boolean") return value ? "Ya" : "Tidak";
      if (typeof value === "object") return JSON.stringify(value);
      return String(value);
  }
}

const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
const ALL_CAPS_ENUM = /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/;

/**
 * Menebak tipe tampilan untuk field yang TIDAK terdaftar di registri modul —
 * dipakai halaman detail, yang sengaja menampilkan seluruh field yang
 * dikembalikan API (bukan hanya kolom tabel) supaya bisa jadi alat periksa
 * data yang jujur. Tebakan hanya memengaruhi FORMAT, bukan isi: nilai yang
 * tidak dikenali tetap ditampilkan apa adanya.
 */
export function inferType(key: string, value: unknown): ColumnType {
  if (typeof value === "boolean") return "bool";
  if (typeof value === "number") return "number";
  if (typeof value === "string") {
    if (ISO_TIMESTAMP.test(value)) return value.endsWith("T00:00:00.000Z") ? "date" : "datetime";
    if (ALL_CAPS_ENUM.test(value) && value.length > 1) return "enum";
  }
  return "text";
}

/**
 * Nilai yang SIAP DITAMPILKAN untuk satu field.
 *
 * API menempelkan `<field>Label` pada setiap kolom kunci asing (lihat
 * apps/demo-api/src/labels.js), jadi `siteId` datang berpasangan dengan
 * `siteIdLabel` berisi "Lapangan Produksi Cepu". Fungsi ini memilih label
 * itu bila ada, dan jatuh kembali ke nilai aslinya bila tidak — sehingga
 * satu pemanggil yang sama bekerja untuk kolom biasa maupun kunci asing.
 *
 * Kalau labelnya TIDAK ada dan nilainya ternyata UUID, yang ditampilkan
 * adalah tanda pisah, bukan UUID-nya: pengenal internal di layar tidak
 * memberi tahu pembaca apa pun, dan kehadirannya justru membuat halaman
 * terbaca seperti dump basis data.
 */
export function displayValue(row: Record<string, unknown>, key: string, type: ColumnType = "text"): string {
  // Satu-satunya tipe yang membaca lebih dari satu kolom. Ditangani di sini
  // dan bukan di formatCell() karena formatCell hanya menerima nilainya, bukan
  // barisnya — dan nomor revisi memang butuh keduanya.
  if (type === "revision") {
    const major = row.majorVersion;
    const minor = row.minorVersion;
    if (major === null || major === undefined) return EMPTY_PLACEHOLDER;
    return `${major}.${minor ?? 0}`;
  }
  const label = row[`${key}Label`];
  if (typeof label === "string" && label.length > 0) return label;
  const value = row[key];
  if (typeof value === "string" && UUID_PATTERN.test(value)) return EMPTY_PLACEHOLDER;
  return formatCell(value, type);
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `plannedStartDatetime` -> `Planned start datetime` — label manusiawi untuk field tak terdaftar. */
export function humanizeFieldName(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
