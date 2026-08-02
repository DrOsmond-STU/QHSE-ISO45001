"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DATA_IMPORT_ROW_MAPPERS = void 0;
// PRD Modul 31 §5 — target_module_code contoh literal: ORGANIZATION,
// EMPLOYEE, ASSET, DOCUMENT, TRAINING_CERTIFICATE, INCIDENT_HISTORY. Hanya
// EMPLOYEE yang py mapper konkret task 1.6 (lihat employee-row-mapper.ts) —
// modul lain BELUM py tabel domain target sama sekali (ASSET/DOCUMENT/
// TRAINING_CERTIFICATE/INCIDENT_HISTORY = Phase 2+) atau butuh keputusan
// desain terpisah (ORGANIZATION: company/site/department punya hierarki
// parent-child yang tidak bisa diwakili 1 baris flat Excel tanpa skema
// kolom tambahan) — didokumentasikan gap TDD §26, bukan oversight.
// Registry (data-import-row-mapper-registry.service.ts) dirancang supaya
// menambah mapper baru nanti CUMA butuh: (1) implement interface ini,
// (2) daftarkan providers array di data-import.module wiring — TIDAK ada
// perubahan DataImportService/DataImportProcessingService yang genuinely
// generic terhadap targetModuleCode.
exports.DATA_IMPORT_ROW_MAPPERS = Symbol("DATA_IMPORT_ROW_MAPPERS");
