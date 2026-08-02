"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_REGULATORY_REPORT_TENGGAT_HOURS = void 0;
exports.shouldAutoCreateRegulatoryReport = shouldAutoCreateRegulatoryReport;
exports.computeRequiredByDate = computeRequiredByDate;
exports.assertNoPendingOrOverdueRegulatoryReports = assertNoPendingOrOverdueRegulatoryReports;
// BR-03 (PRD Modul 07 §6) — "dibuat otomatis (draft) ketika classification
// masuk kategori wajib lapor SESUAI KONFIGURASI REGULATORY-MAPPING TENANT."
// TIDAK ADA tabel regulatory-mapping tenant-configurable di skema §5 modul
// ini (atau modul manapun lain di codebase ini) — pola sama
// custom_field_definitions (Modul 31) belum ada, TDD §26 #117 (task 3.3).
// Daftar di bawah HARDCODED (SAMA 3 klasifikasi BR-01), regulatory_body
// default KEMNAKER (PP 50/2012, pemetaan §10 paling umum) — bukan
// tenant-configurable, gap didokumentasikan TDD §26.
const MANDATORY_REGULATORY_REPORT_CLASSIFICATIONS = new Set([
    "FATALITY",
    "LOST_TIME_INJURY",
    "PROCESS_SAFETY_EVENT",
]);
// PRD §4 poin 8 — "umumnya 2×24 jam utk kecelakaan kerja di Indonesia —
// WAJIB DIVERIFIKASI ULANG." Konstanta tetap, BUKAN per-regulasi/per-tenant.
exports.DEFAULT_REGULATORY_REPORT_TENGGAT_HOURS = 48;
function shouldAutoCreateRegulatoryReport(classification) {
    return MANDATORY_REGULATORY_REPORT_CLASSIFICATIONS.has(classification);
}
function computeRequiredByDate(incidentDatetime) {
    return new Date(incidentDatetime.getTime() + exports.DEFAULT_REGULATORY_REPORT_TENGGAT_HOURS * 60 * 60 * 1000);
}
// BR-09 (PRD Modul 07 §6) — "incident_reports.status tidak dapat CLOSED jika
// ada incident_regulatory_reports wajib lapor yang masih PENDING/OVERDUE."
function assertNoPendingOrOverdueRegulatoryReports(reports) {
    const blocking = reports.filter((r) => r.status === "PENDING" || r.status === "OVERDUE");
    if (blocking.length > 0) {
        throw new Error(`incident_reports tidak dapat CLOSED — masih ada ${blocking.length} incident_regulatory_reports berstatus PENDING/OVERDUE (BR-09).`);
    }
}
//# sourceMappingURL=incident-regulatory-report-rules.js.map