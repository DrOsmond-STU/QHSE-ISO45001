"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVENT_CATEGORIES = void 0;
exports.isKnownEventCategory = isKnownEventCategory;
exports.getCategoryLabel = getCategoryLabel;
exports.EVENT_CATEGORIES = [
    { code: "WORK_PERMIT", label: "Izin Kerja" },
    { code: "INCIDENT", label: "Insiden" },
    { code: "INSPECTION", label: "Inspeksi" },
    { code: "AUDIT", label: "Audit" },
    { code: "CAPA", label: "CAPA (Corrective & Preventive Action)" },
    { code: "COMPLIANCE", label: "Kepatuhan Regulasi" },
    { code: "CALIBRATION", label: "Kalibrasi Alat" },
    { code: "TRAINING", label: "Pelatihan & Sertifikasi" },
    { code: "ASSET", label: "Aset & Peralatan" },
    { code: "EMERGENCY", label: "Tanggap Darurat" },
    { code: "ACTION_TRACKING", label: "Tindak Lanjut" },
    { code: "MANAGEMENT_REVIEW", label: "Tinjauan Manajemen" },
    { code: "MEETING", label: "Rapat" },
    { code: "DOCUMENT", label: "Dokumen" },
];
const EVENT_CATEGORY_BY_CODE = new Map(exports.EVENT_CATEGORIES.map((c) => [c.code, c]));
function isKnownEventCategory(code) {
    return EVENT_CATEGORY_BY_CODE.has(code);
}
function getCategoryLabel(code) {
    return EVENT_CATEGORY_BY_CODE.get(code)?.label ?? code;
}
