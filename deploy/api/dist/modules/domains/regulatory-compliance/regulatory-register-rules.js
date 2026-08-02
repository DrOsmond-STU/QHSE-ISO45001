"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertRegisterAcceptsNewObligation = assertRegisterAcceptsNewObligation;
exports.assertApplicableScopeConsistency = assertApplicableScopeConsistency;
// BR-04 (PRD §6): "regulatory_register.status = SUPERSEDED/REVOKED tidak
// boleh menjadi acuan compliance_obligations baru; obligation historis yang
// sudah ada tetap tersimpan untuk jejak audit." Guard ini HANYA dipanggil
// saat membuat ComplianceObligation baru — baris lama yang sudah menunjuk
// register yang belakangan di-supersede/revoke TIDAK disentuh (tidak ada
// cascade), pola sama assertDocumentAcceptsNewDistribution (2.1 BR-05).
function assertRegisterAcceptsNewObligation(status) {
    if (status === "SUPERSEDED" || status === "REVOKED") {
        throw new Error(`regulatory_register berstatus ${status} tidak boleh menjadi acuan compliance_obligations baru (BR-04).`);
    }
}
// BR-07 (PRD §6): "applicable_scope = SPECIFIC_SITE mewajibkan
// applicable_site_id terisi (validasi konsistensi field)." SPECIFIC_COMPANY
// -> applicableCompanyId BEYOND teks literal BR-07 (yang hanya menyebut
// SPECIFIC_SITE) — ditambahkan krn bentuk validasinya identik & tanpa ini
// applicable_scope=SPECIFIC_COMPANY dengan applicable_company_id NULL lolos
// tanpa terdeteksi (gap TDD §26, sama semangatnya dgn BR-07 yang literal).
function assertApplicableScopeConsistency(scope, applicableCompanyId, applicableSiteId) {
    if (scope === "SPECIFIC_SITE" && applicableSiteId === null) {
        throw new Error("applicable_scope=SPECIFIC_SITE wajib mengisi applicable_site_id (BR-07).");
    }
    if (scope === "SPECIFIC_COMPANY" && applicableCompanyId === null) {
        throw new Error("applicable_scope=SPECIFIC_COMPANY wajib mengisi applicable_company_id (BR-07, perluasan simetris).");
    }
}
//# sourceMappingURL=regulatory-register-rules.js.map