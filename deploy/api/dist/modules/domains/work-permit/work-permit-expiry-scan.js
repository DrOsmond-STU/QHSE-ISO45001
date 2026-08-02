"use strict";
// Pure logic — mirror hiradc-expiry-scan.ts (3.2)/work-permit-gas-retest-scan.ts style.
Object.defineProperty(exports, "__esModule", { value: true });
exports.findExpiredWorkPermits = findExpiredWorkPermits;
/**
 * BR-07 (PRD Modul 06 §6), bagian scan — "permit yang melewati batas
 * waktu tanpa extension disetujui otomatis berstatus EXPIRED dan
 * dieskalasi." Kandidat mencakup ACTIVE MAUPUN EXTENSION_REQUESTED
 * (caller sudah query keduanya) — "tanpa extension DISETUJUI" dibaca
 * literal: permit yang masih EXTENSION_REQUESTED (extension SEDANG
 * diajukan, BELUM disetujui) TETAP kena expire kalau planned_end_datetime
 * SUDAH terlampaui sebelum keputusan extension turun; begitu extension
 * genuinely APPROVED, planned_end_datetime permit itu sendiri sudah
 * diperbarui (WorkPermitExtensionWorkflowCompletionListener) sehingga
 * TIDAK LAGI match filter ini pada scan berikutnya.
 */
function findExpiredWorkPermits(candidates, now) {
    return candidates.filter((c) => c.plannedEndDatetime.getTime() < now.getTime());
}
//# sourceMappingURL=work-permit-expiry-scan.js.map