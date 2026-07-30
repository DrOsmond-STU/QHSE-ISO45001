import { HiradcRecordStatus } from "@prisma/client";

// PRD Modul 05 §5 enum "DRAFT -> VERIFIED -> APPROVED, otomatis -> EXPIRED
// setelah valid_until." §4.3 poin 2 — "Approval RINGAN — disarankan 1
// stage 'Verifikasi Supervisor'... bisa dikonfigurasi TANPA approval
// formal (VERIFIED oleh pembuat sendiri) utk pekerjaan risiko rendah
// rutin." Dibaca: DRAFT->VERIFIED bisa lewat SELF-VERIFY (tanpa workflow)
// ATAU via workflow 1-stage ringan — KEDUANYA mendarat di status VERIFIED
// yang SAMA, service (HiradcRecordService) yang menentukan jalur mana
// dipakai per pemanggilan, pure function ini cuma menegakkan urutan
// transisi valid. APPROVED bersifat OPSIONAL (tidak seluruh HIRADC perlu
// melewatinya) — VERIFIED sendiri sudah status yang sah dipakai sbg
// lampiran Izin Kerja (PRD §4.3 poin 1). EXPIRED reachable dari VERIFIED
// MAUPUN APPROVED (scan job BR-04 tidak peduli baris sedang di status
// mana selama belum EXPIRED).
const ALLOWED_TRANSITIONS: Record<HiradcRecordStatus, HiradcRecordStatus[]> = {
  DRAFT: ["VERIFIED"],
  VERIFIED: ["APPROVED", "EXPIRED"],
  APPROVED: ["EXPIRED"],
  EXPIRED: [],
};

export function validateHiradcRecordStatusTransition(from: HiradcRecordStatus, to: HiradcRecordStatus): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`Transisi hiradc_records.status dari ${from} ke ${to} tidak valid.`);
  }
}

// BR-03 (PRD §6) — "hiradc_records wajib merujuk minimal salah satu dari
// related_hira_id atau related_jsa_id, ATAU diisi penilaian mandiri
// lengkap (hiradc_lines) jika tidak ada baseline (kondisi darurat/non-
// rutin tanpa HIRA/JSA sebelumnya)." "Penilaian mandiri lengkap" dibaca
// sbg "minimal 1 baris hiradc_lines" (skema §5 tidak mendefinisikan
// "lengkap" lebih detail dari itu — hiradc_lines sendiri py seluruh kolom
// wajib non-null spt control_measures, jadi "lengkap" per-baris SUDAH
// ditegakkan skema, "lengkap" di level HIRADC berarti PALING TIDAK ada
// satu baris).
export interface HiradcBaselineCandidate {
  relatedHiraId: string | null;
  relatedJsaId: string | null;
  lineCount: number;
}

export function assertHasBaselineOrStandaloneLines(candidate: HiradcBaselineCandidate): void {
  const hasBaseline = candidate.relatedHiraId !== null || candidate.relatedJsaId !== null;
  if (!hasBaseline && candidate.lineCount === 0) {
    throw new Error(
      "hiradc_records wajib merujuk related_hira_id/related_jsa_id, atau memiliki minimal satu hiradc_lines mandiri (BR-03).",
    );
  }
}
