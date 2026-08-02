"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertWasteCodeRequiredForHazardous = assertWasteCodeRequiredForHazardous;
exports.isStorageDurationWarningDue = isStorageDurationWarningDue;
exports.isStorageDurationExceeded = isStorageDurationExceeded;
exports.validateManifestStatusTransition = validateManifestStatusTransition;
// BR-08 — "waste_manifest_records.waste_code wajib diisi jika
// waste_type=HAZARDOUS_B3."
function assertWasteCodeRequiredForHazardous(wasteType, wasteCode) {
    if (wasteType === "HAZARDOUS_B3" && !wasteCode) {
        throw new Error("waste_manifest_records waste_code wajib diisi jika waste_type=HAZARDOUS_B3 (BR-08).");
    }
}
// BR-03 — "waste_generation_log per batch tidak boleh melebihi
// max_storage_duration_days tanpa tertaut ke waste_manifest_records —
// sistem memberi peringatan H-7 sebelum jatuh tempo." Pure predicate,
// dipanggil scan job (waste-storage-duration-scan) per baris belum tertaut.
function isStorageDurationWarningDue(storageStartDate, maxStorageDurationDays, now) {
    const dueDate = addDays(storageStartDate, maxStorageDurationDays);
    const warningDate = addDays(dueDate, -7);
    return now >= warningDate && now <= dueDate;
}
function isStorageDurationExceeded(storageStartDate, maxStorageDurationDays, now) {
    const dueDate = addDays(storageStartDate, maxStorageDurationDays);
    return now > dueDate;
}
function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}
// PRD §4.3 poin 3 — "Manifest berjalan melalui status ISSUED->IN_TRANSIT->
// RECEIVED_BY_TRANSPORTER->RECEIVED_BY_PROCESSOR->COMPLETED". REJECTED
// (nilai enum §5 literal, TIDAK dijelaskan prosa §4.3) diinterpretasikan
// dapat terjadi dari MANA PUN sebelum COMPLETED (penolakan transporter/
// processor di titik mana pun), gap TDD §26.
const ALLOWED_TRANSITIONS = {
    DRAFT: ["ISSUED"],
    ISSUED: ["IN_TRANSIT", "REJECTED"],
    IN_TRANSIT: ["RECEIVED_BY_TRANSPORTER", "REJECTED"],
    RECEIVED_BY_TRANSPORTER: ["RECEIVED_BY_PROCESSOR", "REJECTED"],
    RECEIVED_BY_PROCESSOR: ["COMPLETED", "REJECTED"],
    REJECTED: [],
    COMPLETED: [],
};
function validateManifestStatusTransition(from, to) {
    if (!ALLOWED_TRANSITIONS[from].includes(to)) {
        throw new Error(`Transisi waste_manifest_records.manifest_status dari ${from} ke ${to} tidak valid.`);
    }
}
