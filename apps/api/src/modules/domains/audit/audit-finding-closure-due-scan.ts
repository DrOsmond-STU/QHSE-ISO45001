// Pure logic — mirror license-expiry-scan.ts (2.2) pattern.

export interface AuditFindingClosureDueCandidate {
  auditFindingId: string;
  status: string;
  targetClosureDate: Date | null;
}

// BR-04 penunjang (SLA closure Major NC 30 hari/Minor NC 60 hari sudah
// terhitung di audit_findings.target_closure_date via computeTargetClosureDate).
// PRD §8 "Tenggat closure NC mendekat" — TIDAK ADA ambang H-N eksplisit
// maupun kolom idempotency, didekati SATU jendela 7 hari flat + "daily nag"
// (pola sama auditor-competency-expiry-scan.ts) — findings YANG SUDAH
// BREACH (msUntilDue negatif) TETAP disertakan (lebih urgent, bukan
// dikecualikan) krn scan ini TIDAK punya transisi status terpisah utk
// "breached" (BEDA dari License BR-02 ACTIVE->EXPIRED) — audit_findings
// TIDAK auto-expire, closure genuinely lewat CAPA/verify/close manual.
// targetClosureDate===null (Observation/OFI default, "tanpa tenggat ketat"
// §4 poin 9) otomatis TIDAK PERNAH match filter di bawah — TIDAK perlu
// filter requiresCapa terpisah.
const CLOSURE_DUE_WARNING_WINDOW_DAYS = 7;

export function findFindingsClosureDue(candidates: AuditFindingClosureDueCandidate[], now: Date): AuditFindingClosureDueCandidate[] {
  const windowMs = CLOSURE_DUE_WARNING_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return candidates.filter((c) => {
    if (c.status === "CLOSED" || c.targetClosureDate === null) return false;
    const msUntilDue = c.targetClosureDate.getTime() - now.getTime();
    return msUntilDue <= windowMs;
  });
}
