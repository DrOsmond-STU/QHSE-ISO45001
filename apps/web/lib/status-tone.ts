import type { StatusTone } from "@qhse/ui-components";

// Pemetaan nilai enum status -> tone StatusBadge (DESIGN.md §3.3).
//
// Daftar di bawah ini DISALIN dari nilai enum yang benar-benar ada di
// apps/api/prisma/schema.prisma (DocumentStatus, WorkPermitStatus, dst),
// bukan ditebak dari pola nama. Nilai yang TIDAK ada di sini sengaja
// mengembalikan null -> pemanggil merender teks biasa, bukan badge.
// Alasannya: keempat tone itu semuanya bermuatan severity, jadi menebak
// tone untuk status yang tidak dikenal akan MENYESATKAN pembaca (mis.
// memberi warna merah pada status yang sebenarnya netral). Status
// terminal-tapi-netral (RETIRED/ARCHIVED/OBSOLETE/DISPOSED/INACTIVE)
// juga sengaja dibiarkan tanpa tone karena bukan "baik" maupun "buruk".
const TONE_BY_VALUE: Record<string, StatusTone> = {
  // --- selesai / sehat ---
  APPROVED: "good",
  APPROVED_ACTIVE: "good",
  PUBLISHED: "good",
  ACTIVE: "good",
  CLOSED: "good",
  COMPLETED: "good",
  INVESTIGATION_COMPLETED: "good",
  REPORT_APPROVED: "good",
  EFFECTIVE_CLOSED: "good",
  PREQUALIFIED: "good",
  PASS: "good",
  GOOD: "good",
  NOT_SIGNIFICANT: "good",
  LOW: "good",
  // Tingkat risiko HIRA. Kolomnya varchar, BUKAN enum: nilainya berasal dari
  // konfigurasi matriks risiko tenant, dan tenant Indonesia mengisinya dalam
  // bahasa Indonesia. Tanpa baris ini, sebaran risiko HIRA tampil dengan
  // gradasi biru netral — benar secara aturan (nilai tak dikenal tidak
  // ditebak tone-nya), tapi menyia-nyiakan satu-satunya tempat di mana warna
  // severity justru paling berarti.
  RENDAH: "good",
  MINOR: "good",
  USE_AS_IS: "good",
  VERIFIED: "good",
  LEVEL_1_LOCAL: "good",
  OFI: "good",
  PASSED: "good",
  EFFECTIVE: "good",

  // --- sedang berjalan / menunggu tindakan ---
  DRAFT: "warning",
  IN_REVIEW: "warning",
  UNDER_REVIEW: "warning",
  UNDER_REVISION: "warning",
  REQUIRES_REVISION: "warning",
  SUBMITTED: "warning",
  PENDING: "warning",
  PENDING_ISSUER_APPROVAL: "warning",
  PENDING_HSE_APPROVAL: "warning",
  PENDING_CLOSURE: "warning",
  PENDING_APPROVAL: "warning",
  PENDING_EFFECTIVENESS_VERIFICATION: "warning",
  PENDING_REGULATORY_REPORT: "warning",
  PENDING_CAPA_CLOSURE: "warning",
  SCHEDULED: "warning",
  PLANNED: "warning",
  IN_PROGRESS: "warning",
  REPORTED: "warning",
  REGISTERED: "warning",
  ROOT_CAUSE_ANALYSIS: "warning",
  ACTION_PLAN_DEFINED: "warning",
  REPORT_DRAFTED: "warning",
  UNDER_VERIFICATION: "warning",
  UNDER_INVESTIGATION: "warning",
  EXTENSION_REQUESTED: "warning",
  UNDER_MAINTENANCE: "warning",
  IN_CALIBRATION: "warning",
  STANDBY: "warning",
  MEDIUM: "warning",
  SEDANG: "warning",
  NOT_ASSESSED: "warning",
  NOT_EVALUATED: "warning",
  PARTIALLY_EFFECTIVE: "warning",
  FAIR: "warning",
  NA: "warning",
  REWORK: "warning",
  REPAIR: "warning",
  REGRADE: "warning",
  OPEN: "warning",
  CAPA_LINKED: "warning",
  OBSERVATION: "warning",
  MINOR_NC: "warning",

  // --- buruk, belum fatal ---
  OVERDUE: "serious",
  EXPIRED: "serious",
  SUSPENDED: "serious",
  SUPERSEDED: "serious",
  REOPENED: "serious",
  NOT_EFFECTIVE_REOPENED: "serious",
  ESCALATED_NON_COMPLIANT: "serious",
  SIGNIFICANT: "serious",
  HIGH: "serious",
  TINGGI: "serious",
  MAJOR: "serious",
  POOR: "serious",
  RETURN_TO_SUPPLIER: "serious",
  LEVEL_2_SITE_WIDE: "serious",
  // Rencana pelatihan yang DITUNDA/DIURUNGKAN tanggalnya, bukan dibatalkan.
  // Diberi tone serius dan bukan netral dengan sengaja: rencana yang terus
  // bergeser adalah kegagalan program pelatihan yang paling sering luput,
  // justru karena tidak pernah tampak sebagai kegagalan.
  DEFERRED: "serious",
  POSTPONED: "serious",

  // --- gagal / dihentikan ---
  REJECTED: "critical",
  CANCELLED: "critical",
  REVOKED: "critical",
  BLACKLISTED: "critical",
  CRITICAL: "critical",
  EKSTREM: "critical",
  FAIL: "critical",
  OUT_OF_SERVICE: "critical",
  SCRAP: "critical",
  MAJOR_NC: "critical",
  FAILED: "critical",
  NOT_EFFECTIVE: "critical",
  LEVEL_3_COMPANY_WIDE_EXTERNAL_AGENCY: "critical",
};

export function statusTone(value: unknown): StatusTone | null {
  if (typeof value !== "string") return null;
  return TONE_BY_VALUE[value] ?? null;
}

// Akronim yang HARUS tetap kapital saat enum dimanusiakan. Daftarnya
// eksplisit — aturan heuristik "kata pendek = akronim" salah untuk kata
// biasa yang kebetulan pendek (LOW jadi "LOW" sementara HIGH jadi "High",
// tampak tidak konsisten berdampingan di kolom yang sama).
const ACRONYMS = new Set([
  "HSE",
  "K3",
  "NCR",
  "NC",
  "JSA",
  "HIRA",
  "HIRADC",
  "CAPA",
  "PTW",
  "MCU",
  "APD",
  "PPE",
  "LB3",
  "TPS",
  "OFI",
  "SLA",
  "ID",
  "NA",
  "IUJP",
  "CSMS",
  "PROPER",
  "BPJS",
]);

/** `PENDING_HSE_APPROVAL` -> `Pending HSE approval` — enum mentah sulit dibaca di tabel. */
export function humanizeEnum(value: string): string {
  return value
    .split("_")
    .map((word, index) => {
      if (ACRONYMS.has(word)) return word;
      const lower = word.toLowerCase();
      return index === 0 ? lower.charAt(0).toUpperCase() + lower.slice(1) : lower;
    })
    .join(" ");
}
