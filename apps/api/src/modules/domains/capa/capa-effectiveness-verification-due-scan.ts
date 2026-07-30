// Pure logic — mirror audit-finding-closure-due-scan.ts (4.1) pattern.

export interface CapaEffectivenessVerificationDueCandidate {
  effectivenessVerificationId: string;
  result: string;
  verificationDueDate: Date;
  dueReminderSentAt: Date | null;
}

// PRD §8 "Verifikasi efektivitas jatuh tempo" — verification_due_date
// SUDAH konkret per baris (diisi CapaEffectivenessVerificationService.create()),
// TIDAK perlu ambang invented seperti root-cause-sla-scan. "jatuh tempo"
// == due date sudah TERLEWATI (<=now), single-shot per baris via
// due_reminder_sent_at (BUKAN "mendekati" H-N — PRD tidak beri angka utk
// itu juga, dan due_date di sini sudah representasi tunggal per siklus
// verifikasi, beda dari license yang genuinely py 3 tier terpisah).
export function findCapaEffectivenessVerificationDue(
  candidates: CapaEffectivenessVerificationDueCandidate[],
  now: Date,
): CapaEffectivenessVerificationDueCandidate[] {
  return candidates.filter((c) => {
    if (c.result !== "PENDING" || c.dueReminderSentAt !== null) return false;
    return c.verificationDueDate.getTime() <= now.getTime();
  });
}
