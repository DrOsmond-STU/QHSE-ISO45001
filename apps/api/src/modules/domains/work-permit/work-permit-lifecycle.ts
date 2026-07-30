import { WorkPermitStatus } from "@prisma/client";

// PRD Modul 06 §5 enum PENUH (13 nilai). Task 3.3 (tipe & alur inti)
// sengaja membatasi ACTIVE jadi dead-end (extension/closure tabel belum
// ada) — task 3.4 (extension, closure & cross-link) MEMPERLUASNYA di
// bawah, PERSIS seperti dijanjikan banner comment lama file ini.
//
// SUBMITTED (nilai enum literal PRD) SENGAJA TIDAK PERNAH jadi target/
// sumber transisi di sini — WorkPermitService.submitForApproval() (task
// 3.3) langsung DRAFT->PENDING_ISSUER_APPROVAL SATU TRANSAKSI (generate
// permit_number + startInstance() terjadi bersamaan, PRD §4 poin 3-4 tidak
// mendeskripsikan jeda observable di antaranya) — pola PERSIS
// HiraAssessmentService DRAFT->IN_REVIEW langsung (task 3.2, tidak ada
// status "sedang disubmit" terpisah). Nilai SUBMITTED tetap ada di enum
// Postgres (infrastruktur bersama) tapi TIDAK REACHABLE lewat kode ini —
// gap TDD §26.
//
// REJECTED (baik dari Stage 1 Issuer MAUPUN Stage 2 HSE) dibaca sbg
// TERMINAL — PRD §4 poin 4 menulis "Approve/Return ke Requester" utk Stage
// 1, yang SECARA HARFIAH bisa dibaca sbg loop-back ke DRAFT (bukan
// REJECTED) — TAPI status enum py REJECTED sbg nilai TERSENDIRI yang kalau
// tidak pernah reachable jadi dead value KEDUA (setelah SUBMITTED di atas)
// — dipilih REJECTED sbg target drpd DRAFT supaya nilai enum literal PRD
// genuinely dipakai; interpretasi ini genuinely ambigu, didokumentasikan
// TDD §26 (bukan disembunyikan).
//
// Task 3.4 — ACTIVE sekarang punya 4 keluar: EXTENSION_REQUESTED (BR-07,
// Requester mengajukan perpanjangan), PENDING_CLOSURE (Requester submit
// closure), SUSPENDED (BR-05, scan job gas-retest-due-scan menemukan
// retest terlewat), EXPIRED (BR-07, scan job work-permit-expiry-scan
// menemukan planned_end_datetime terlewat TANPA extension approved).
// EXTENSION_REQUESTED->ACTIVE mencakup KEDUA hasil (APPROVED maupun
// REJECTED extension kembali ke ACTIVE — bedanya HANYA planned_end_datetime
// berubah atau tidak, PRD tidak mendeskripsikan status ANTARA yang beda
// utk kedua hasil itu). PENDING_CLOSURE->ACTIVE = closure RETURNED
// (Issuer menolak verifikasi, Requester merevisi & submit ulang closure
// yang SAMA). SUSPENDED->ACTIVE = retest gas baru PASS direkam
// (WorkPermitService.resumeFromSuspension(), penyelesaian LOOP BR-05 yang
// PRD sendiri tidak eksplisit deskripsikan tapi jelas tersirat — permit
// SUSPENDED selamanya tanpa jalur keluar bukan desain yang masuk akal).
const ALLOWED_TRANSITIONS: Record<WorkPermitStatus, WorkPermitStatus[]> = {
  DRAFT: ["PENDING_ISSUER_APPROVAL", "CANCELLED"],
  SUBMITTED: [],
  PENDING_ISSUER_APPROVAL: ["PENDING_HSE_APPROVAL", "APPROVED", "REJECTED", "CANCELLED"],
  PENDING_HSE_APPROVAL: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["ACTIVE", "CANCELLED"],
  ACTIVE: ["EXTENSION_REQUESTED", "PENDING_CLOSURE", "SUSPENDED", "EXPIRED"],
  SUSPENDED: ["ACTIVE"],
  EXTENSION_REQUESTED: ["ACTIVE"],
  PENDING_CLOSURE: ["CLOSED", "ACTIVE"],
  CLOSED: [],
  REJECTED: [],
  CANCELLED: [],
  EXPIRED: [],
};

export function validateWorkPermitStatusTransition(from: WorkPermitStatus, to: WorkPermitStatus): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`Transisi work_permits.status dari ${from} ke ${to} tidak valid.`);
  }
}
