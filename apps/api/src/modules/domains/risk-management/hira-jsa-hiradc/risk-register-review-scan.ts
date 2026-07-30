// Pure logic — mirror obligation-due-scan.ts (2.2) style.

export type CorporateRiskScanStatus = "IDENTIFIED" | "ASSESSED" | "TREATMENT_IN_PROGRESS" | "MONITORED" | "CLOSED";

export interface RiskRegisterReviewCandidate {
  riskRegisterId: string;
  nextReviewDate: Date | null;
  status: CorporateRiskScanStatus;
  overdueNotifiedAt: Date | null;
}

/**
 * BR-05 (PRD Modul 05 §6) — "risk_register.next_review_date yang
 * terlewati tanpa last_review_date diperbarui otomatis ditandai overdue
 * pada dashboard." PRD §8 baris 3 menambahkan notifikasi eksplisit ("Risk
 * owner, Top Management") — direalisasikan sbg scan job (pola sama
 * compliance_obligations BR-05 2.2), BUKAN cuma query dashboard on-demand,
 * supaya notifikasi genuinely terkirim (dashboard-only tidak akan pernah
 * memicu apa pun tanpa user membuka halamannya). CLOSED dikecualikan
 * (risiko yang sudah ditutup tidak perlu direview ulang berkala).
 * overdueNotifiedAt di-reset NULL oleh RiskRegisterService.recordReview()
 * begitu lastReviewDate diperbarui — pola PERSIS
 * compliance_obligations.overdueNotifiedAt.
 */
export function findOverdueRiskRegisterReviews(candidates: RiskRegisterReviewCandidate[], now: Date): RiskRegisterReviewCandidate[] {
  return candidates.filter((c) => {
    if (c.status === "CLOSED") return false;
    if (c.nextReviewDate === null) return false;
    if (c.overdueNotifiedAt !== null) return false;
    return c.nextReviewDate.getTime() < now.getTime();
  });
}
