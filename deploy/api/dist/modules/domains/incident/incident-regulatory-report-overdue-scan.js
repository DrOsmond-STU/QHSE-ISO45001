"use strict";
// Pure logic — mirror work-permit-expiry-scan.ts (3.4) style. PRD §8
// "Pelaporan regulator mendekati tenggat -> HSE Manager" (reminder) TIDAK
// diimplementasikan (butuh idempotency tracking terpisah, gap sama H-30-menit
// gas retest Work Permit 3.4) — scan ini HANYA menegakkan transisi
// PENDING->OVERDUE begitu required_by_date terlampaui (status jadi guard
// idempotency alami, konsisten pola scan job lain codebase ini).
Object.defineProperty(exports, "__esModule", { value: true });
exports.findOverdueRegulatoryReports = findOverdueRegulatoryReports;
function findOverdueRegulatoryReports(candidates, now) {
    return candidates.filter((c) => c.requiredByDate.getTime() < now.getTime());
}
//# sourceMappingURL=incident-regulatory-report-overdue-scan.js.map