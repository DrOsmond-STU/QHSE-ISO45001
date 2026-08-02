"use strict";
// Pure — BR-02 (PRD Modul 31 §6): "usage_counters.current_value melebihi
// subscription_plans.max_users/max_sites TIDAK memblokir operasional
// berjalan, tetapi memicu notifikasi." Fungsi ini cuma MENDETEKSI
// pelanggaran kuota; caller (UsageCounterScanService) yang memutuskan apa
// yang dilakukan dengan hasilnya (log/notifikasi — notifikasi SENGAJA
// belum di-wire, gap TDD §26).
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkQuota = checkQuota;
/** maxValue NULL = unlimited (PRD literal "NULL = unlimited") — tidak
 * pernah exceeded. */
function checkQuota(input) {
    return { ...input, exceeded: input.maxValue !== null && input.currentValue > input.maxValue };
}
//# sourceMappingURL=usage-quota.js.map