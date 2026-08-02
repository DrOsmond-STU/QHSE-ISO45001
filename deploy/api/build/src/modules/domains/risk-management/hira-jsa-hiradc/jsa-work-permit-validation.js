"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertJsaValidForWorkPermitAttachment = assertJsaValidForWorkPermitAttachment;
/**
 * BR-08 (PRD Modul 05 §6) — "JSA berstatus EXPIRED/DRAFT tidak dapat
 * dijadikan lampiran valid pada Izin Kerja (Modul 06) — divalidasi lintas
 * modul." Modul 06 (Work Permit) BELUM ADA di codebase ini — helper
 * QUERY-ONLY ini disediakan SIAP dipanggil modul itu nanti (mirror
 * LicensePermitService.findExpiredSioCertifications() 2.2, BR-05
 * cross-module query-only helper), TIDAK ADA enforcement APAPUN yang
 * genuinely terjadi sekarang (gap TDD §26 — tidak ada "izin kerja" utk
 * diblokir).
 */
function assertJsaValidForWorkPermitAttachment(status) {
    if (status === "EXPIRED" || status === "DRAFT") {
        throw new Error(`jsa_records berstatus ${status} tidak dapat dijadikan lampiran valid pada Izin Kerja (BR-08).`);
    }
}
