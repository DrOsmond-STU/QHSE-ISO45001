"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isContractorEligibleForAssignment = isContractorEligibleForAssignment;
exports.hasBlockingExpiredCompliance = hasBlockingExpiredCompliance;
exports.isWorkerEligibleForActiveStatus = isWorkerEligibleForActiveStatus;
exports.isPtk007ComplianceSatisfied = isPtk007ComplianceSatisfied;
exports.areMandatoryDocumentsVerified = areMandatoryDocumentsVerified;
exports.isBlacklistTransition = isBlacklistTransition;
exports.isConsecutiveUnacceptable = isConsecutiveUnacceptable;
exports.isWithinComplianceReminderWindow = isWithinComplianceReminderWindow;
exports.isComplianceExpired = isComplianceExpired;
exports.calculateDaysUntilExpiry = calculateDaysUntilExpiry;
const MS_PER_DAY = 1000 * 60 * 60 * 24;
// BR-01 — contractor_project_assignments HANYA dapat dibuat jika
// contractors.status = PREQUALIFIED atau ACTIVE (BUKAN REGISTERED/
// SUSPENDED/BLACKLISTED).
function isContractorEligibleForAssignment(status) {
    return status === "PREQUALIFIED" || status === "ACTIVE";
}
// BR-02 — work_permits requester_type=CONTRACTOR (proxy: contractorCompanyId
// TERISI, lihat banner comment schema.prisma blok Modul 17 poin 1 — kolom
// requester_type literal PRD TIDAK PERNAH ada di work_permits 3.3) TIDAK
// DAPAT diajukan jika kontraktor terkait py minimal SATU
// contractor_document_compliance WAJIB berstatus EXPIRED. "Wajib" dibaca
// SEMUA baris compliance milik kontraktor (PRD §6 literal tidak
// mengecualikan is_mandatory_for_ptk007=false — SEMUA baris
// contractor_document_compliance yang genuinely tercatat dianggap wajib
// by construction, tabel ini murni utk dokumen WAJIB berkelanjutan).
function hasBlockingExpiredCompliance(complianceStatuses) {
    return complianceStatuses.some((s) => s === "EXPIRED");
}
// BR-03 — contractor_workers.status TIDAK DAPAT menjadi ACTIVE sebelum
// site_induction_completed = TRUE.
function isWorkerEligibleForActiveStatus(siteInductionCompleted) {
    return siteInductionCompleted;
}
// BR-04 — utk tenant sektor Migas (industryTemplate.code = "OIL_GAS", lihat
// banner comment schema.prisma blok Modul 17 poin 2 — kolom
// tenant.industry_type literal PRD TIDAK PERNAH ada, klasifikasi
// sebenarnya lewat industry_templates.code), dokumen IUJP DAN
// CSMS_CERTIFICATE pada contractor_document_compliance WAJIB ada DAN
// is_mandatory_for_ptk007=true SEBELUM contractor_project_assignments.status
// dapat menjadi ACTIVE. Non-Migas tenant TIDAK terikat BR ini sama sekali.
function isPtk007ComplianceSatisfied(isOilGasTenant, complianceDocs) {
    if (!isOilGasTenant)
        return true;
    const hasIujp = complianceDocs.some((d) => d.category === "IUJP" && d.isMandatoryForPtk007);
    const hasCsms = complianceDocs.some((d) => d.category === "CSMS_CERTIFICATE" && d.isMandatoryForPtk007);
    return hasIujp && hasCsms;
}
// BR-05 — contractor_prequalification.result = PASS/CONDITIONAL_PASS HANYA
// dapat ditetapkan jika SELURUH contractor_prequalification_documents
// bertanda is_mandatory=TRUE berstatus VERIFIED.
function areMandatoryDocumentsVerified(documents) {
    return documents.filter((d) => d.isMandatory).every((d) => d.status === "VERIFIED");
}
// BR-06 — perubahan contractors.status MENJADI BLACKLISTED wajib melalui
// approval HSE Manager (TIDAK dapat dilakukan Contractor Coordinator
// sendirian), dicatat system_audit_logs dgn alasan wajib diisi. Fungsi ini
// HANYA mendeteksi APAKAH transisi ybs adalah transisi-ke-BLACKLISTED (gate
// override-dgn-justifikasi ditegakkan service layer, pola sama BR-05
// Calibration 6.2 — fungsi murni di sini TIDAK memodelkan mekanisme
// approval/justifikasi itu sendiri, hanya deteksi kapan gate berlaku).
function isBlacklistTransition(newStatus) {
    return newStatus === "BLACKLISTED";
}
// BR-07 — overall_rating = UNACCEPTABLE DUA KALI BERTURUT-TURUT pada
// kontraktor yang sama memicu NOTIFIKASI rekomendasi peninjauan status ke
// HSE Manager — TIDAK otomatis mengubah status (tetap keputusan manusia,
// PRD §4.4 poin 3 literal "memicu rekomendasi manual"). `previousRating`
// adalah evaluasi APPROVED terakhir SEBELUM evaluasi yang baru saja
// APPROVED (diurutkan evaluationDate DESC), null jika belum ada evaluasi
// sebelumnya (kontraktor baru).
function isConsecutiveUnacceptable(currentRating, previousRating) {
    return currentRating === "UNACCEPTABLE" && previousRating === "UNACCEPTABLE";
}
// PRD §5 "reminder_days_before default 30, PER-BARIS" — beda dari
// Calibration 6.2 (4 tier TETAP), di sini SATU ambang per baris
// (reminder_days_before kolom sungguhan dihormati, bukan konstanta modul).
function isWithinComplianceReminderWindow(expiryDate, now, reminderDaysBefore) {
    const diffDays = (expiryDate.getTime() - now.getTime()) / MS_PER_DAY;
    return diffDays >= 0 && diffDays <= reminderDaysBefore;
}
// §4.2 poin 2 — status compliance otomatis VALID -> EXPIRING_SOON -> EXPIRED
// berdasar expiry_date. EXPIRING_SOON dipakai SAAT genuinely masuk jendela
// reminder (bukan ambang terpisah), EXPIRED saat expiry_date terlewati.
function isComplianceExpired(expiryDate, now) {
    return expiryDate.getTime() < now.getTime();
}
function calculateDaysUntilExpiry(expiryDate, now) {
    return Math.ceil((expiryDate.getTime() - now.getTime()) / MS_PER_DAY);
}
//# sourceMappingURL=contractor-lifecycle.js.map