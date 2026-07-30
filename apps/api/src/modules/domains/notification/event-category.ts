// PRD Modul 25 §9 "Katalog Event Trigger Standar Platform" mengelompokkan
// event_type per "Modul Sumber", TAPI tidak pernah mendefinisikan
// event_category (Modul 25 §5 notification_preferences.event_category)
// sbg katalog kode formal — cuma prosa "mis. WORK_PERMIT, INCIDENT,
// TRAINING". Katalog di bawah DITURUNKAN dari kolom "Modul Sumber" §9
// (14 modul berbeda muncul di sana) sbg proxy yang masuk akal utk
// event_category, krn TIDAK SATU PUN modul sumber (Work Permit, Incident,
// dst., seluruhnya Phase 2+) benar-benar ada di codebase ini utk
// dikonfirmasi balik — scoped/best-effort, gap TDD §26, pola sama
// SUBSCRIPTION_PLAN_SEEDS.includedModuleCodes (1.5) yang JUGA dibatasi ke
// apa yang genuinely ada. Perlu dikonfirmasi balik ke Modul 25 §5 begitu
// modul sumber sungguhan mulai dibangun (Phase 2+).
export interface EventCategoryDef {
  code: string;
  label: string;
}

export const EVENT_CATEGORIES: readonly EventCategoryDef[] = [
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

const EVENT_CATEGORY_BY_CODE = new Map(EVENT_CATEGORIES.map((c) => [c.code, c]));

export function isKnownEventCategory(code: string): boolean {
  return EVENT_CATEGORY_BY_CODE.has(code);
}

export function getCategoryLabel(code: string): string {
  return EVENT_CATEGORY_BY_CODE.get(code)?.label ?? code;
}
