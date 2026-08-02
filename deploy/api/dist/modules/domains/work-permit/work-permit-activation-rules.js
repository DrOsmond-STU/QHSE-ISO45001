"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertGasTestPassedIfRequired = assertGasTestPassedIfRequired;
exports.assertLotoVerifiedIfRequired = assertLotoVerifiedIfRequired;
/**
 * BR-02 (PRD Modul 06 §6) — "Jika work_permit_types.requires_gas_test=TRUE,
 * minimal satu gas_test_results dengan result=PASS wajib ada sebelum
 * status ACTIVE." requiresGasTest=false -> tidak ada gate sama sekali;
 * baris FAIL sebelumnya TIDAK memblokir selama ada minimal 1 PASS
 * (retest berhasil sesudah gagal tetap meloloskan).
 */
function assertGasTestPassedIfRequired(requiresGasTest, results) {
    if (!requiresGasTest)
        return;
    if (!results.some((r) => r.result === "PASS")) {
        throw new Error("work_permits memerlukan minimal satu gas_test_results dengan result=PASS sebelum status ACTIVE (BR-02).");
    }
}
/**
 * BR-03 (PRD Modul 06 §6) — "Jika requires_loto=TRUE, seluruh
 * isolation_loto_records terkait wajib berstatus VERIFIED (dengan
 * verified_by ≠ applied_by)... sebelum status ACTIVE." Dibaca SIMETRIS
 * dgn BR-02 (minimal 1 record HARUS ada, BUKAN vacuously-true kalau nol
 * record) — teks literal BR-03 sendiri TIDAK eksplisit sebut "minimal
 * satu" (beda dari BR-02), tapi permit requires_loto=TRUE TANPA isolasi
 * SAMA SEKALI yang tetap lolos ACTIVE bertentangan dgn tujuan BR itu
 * sendiri — interpretasi diperluas, didokumentasikan TDD §26.
 * verified_by≠applied_by DITEGAKKAN di IsolationLotoRecordService.verify()
 * saat status berubah jadi VERIFIED (titik yang tepat, bukan di sini).
 */
function assertLotoVerifiedIfRequired(requiresLoto, records) {
    if (!requiresLoto)
        return;
    if (records.length === 0 || records.some((r) => r.status !== "VERIFIED")) {
        throw new Error("work_permits memerlukan seluruh isolation_loto_records berstatus VERIFIED sebelum status ACTIVE (BR-03).");
    }
}
//# sourceMappingURL=work-permit-activation-rules.js.map