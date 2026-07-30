import { CapaRegisterStatus, CapaVerificationResult } from "@prisma/client";

// PRD Modul 10 §5 enum literal (9 nilai) — jalur PENDING_APPROVAL->ACTION_PLAN_DEFINED
// (reject path action plan approval) DAN EFFECTIVE_CLOSED->NOT_EFFECTIVE_REOPENED
// (manual reopen, permission capa.register.reopen §3 literal terpisah dari
// alur otomatis BR-04) BEYOND §4 prosa literal tapi konsisten kebutuhan
// "capa.register.reopen" py aksi eksplisit sendiri, bukan cuma efek
// samping BR-04. BR-04 "mewajibkan minimal 1 capa_root_cause_analysis
// baru sebelum action plan baru dapat ditambahkan" TERPENUHI BY
// CONSTRUCTION di tabel ini — NOT_EFFECTIVE_REOPENED HANYA bisa ke
// ROOT_CAUSE_ANALYSIS, TIDAK PERNAH langsung ke ACTION_PLAN_DEFINED.
const ALLOWED_TRANSITIONS: Record<CapaRegisterStatus, CapaRegisterStatus[]> = {
  DRAFT: ["ROOT_CAUSE_ANALYSIS", "CANCELLED"],
  ROOT_CAUSE_ANALYSIS: ["ACTION_PLAN_DEFINED", "CANCELLED"],
  ACTION_PLAN_DEFINED: ["PENDING_APPROVAL", "CANCELLED"],
  PENDING_APPROVAL: ["IN_PROGRESS", "ACTION_PLAN_DEFINED", "CANCELLED"],
  IN_PROGRESS: ["PENDING_EFFECTIVENESS_VERIFICATION", "CANCELLED"],
  PENDING_EFFECTIVENESS_VERIFICATION: ["EFFECTIVE_CLOSED", "NOT_EFFECTIVE_REOPENED", "CANCELLED"],
  EFFECTIVE_CLOSED: ["NOT_EFFECTIVE_REOPENED"],
  NOT_EFFECTIVE_REOPENED: ["ROOT_CAUSE_ANALYSIS"],
  CANCELLED: [],
};

export function validateCapaRegisterStatusTransition(from: CapaRegisterStatus, to: CapaRegisterStatus): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`Transisi capa_register.status dari ${from} ke ${to} tidak valid.`);
  }
}

// BR-01 ("EFFECTIVE_CLOSED tanpa capa_effectiveness_verification result=
// EFFECTIVE" DILARANG — aturan PALING KRITIKAL modul ini) + BR-04
// ("NOT_EFFECTIVE -> otomatis NOT_EFFECTIVE_REOPENED"). Dipanggil listener
// approval Effectiveness Verification SETELAH result dibaca dari baris
// capa_effectiveness_verification yang baru saja diverifikasi — result
// PENDING tidak boleh sampai di sini (listener hanya jalan setelah
// verifiedAt/result terisi, dijamin CapaEffectivenessVerificationService).
export function resolveEffectivenessOutcome(result: CapaVerificationResult): CapaRegisterStatus {
  if (result === "EFFECTIVE") return "EFFECTIVE_CLOSED";
  if (result === "NOT_EFFECTIVE") return "NOT_EFFECTIVE_REOPENED";
  throw new Error(`resolveEffectivenessOutcome dipanggil dgn result=PENDING — BR-01 tidak dapat dievaluasi.`);
}
