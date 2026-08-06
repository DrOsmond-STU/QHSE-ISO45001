// Data referensi — kategori, jenis, dan template yang diacu baris transaksi.
//
// Tidak ada satu pun dari ini yang tampil sebagai modul tersendiri di
// antarmuka, tapi semuanya wajib ada: kolom seperti
// inspection_records.inspection_checklist_template_id dan
// assets.asset_category_id NOT NULL, jadi tanpa baris di sini modul yang
// terlihat di layar tidak bisa disemai sama sekali.
const { uuidFor, upsert, dateOnly, daysAgo } = require("./lib");

const DOCUMENT_CATEGORIES = [
  { code: "SOP", name: "Prosedur Operasi Standar" },
  { code: "POL", name: "Kebijakan Perusahaan" },
  { code: "MAN", name: "Manual Sistem Manajemen" },
  { code: "FRM", name: "Formulir & Rekaman" },
];

const WORK_PERMIT_TYPES = [
  { code: "HOT", name: "Izin Kerja Panas (Hot Work)", risk: "HIGH" },
  { code: "CSE", name: "Izin Masuk Ruang Terbatas (Confined Space Entry)", risk: "HIGH" },
  { code: "HEI", name: "Izin Kerja di Ketinggian (Working at Height)", risk: "HIGH" },
  { code: "EXC", name: "Izin Penggalian (Excavation)", risk: "MEDIUM" },
  { code: "ELE", name: "Izin Kerja Listrik Bertegangan", risk: "HIGH" },
  { code: "GEN", name: "Izin Kerja Umum (Cold Work)", risk: "LOW" },
];

const INSPECTION_TYPES = [
  { code: "HKP", name: "Inspeksi Housekeeping Area Kerja" },
  { code: "APD", name: "Inspeksi Kepatuhan Alat Pelindung Diri" },
  { code: "FIR", name: "Inspeksi Sarana Proteksi Kebakaran" },
  { code: "LIF", name: "Inspeksi Alat Angkat & Angkut" },
  { code: "ENV", name: "Inspeksi Pengelolaan Limbah & Lingkungan" },
];

const AUDIT_TYPES = [
  { code: "IA-SMK3", name: "Audit Internal SMK3 / ISO 45001" },
  { code: "IA-9001", name: "Audit Internal Mutu ISO 9001" },
  { code: "IA-14001", name: "Audit Internal Lingkungan ISO 14001" },
  { code: "EA-CERT", name: "Audit Eksternal Sertifikasi" },
  { code: "VEND", name: "Audit Vendor / Kontraktor" },
];

const AUDIT_CHECKLISTS = [
  { key: "iso45001", name: "Checklist Audit ISO 45001:2018 — Klausul 4-10", standard: "ISO 45001:2018" },
  { key: "iso9001", name: "Checklist Audit ISO 9001:2015 — Klausul 4-10", standard: "ISO 9001:2015" },
  { key: "iso14001", name: "Checklist Audit ISO 14001:2015 — Klausul 4-10", standard: "ISO 14001:2015" },
  { key: "pp50", name: "Checklist Audit SMK3 PP 50/2012 — 166 Kriteria", standard: "PP 50/2012" },
];

const ASSET_CATEGORIES = [
  { key: "rotating", name: "Peralatan Berputar (Rotating Equipment)" },
  { key: "static", name: "Peralatan Statis & Bejana Tekan" },
  { key: "electrical", name: "Instalasi Listrik & Genset" },
  { key: "lifting", name: "Alat Angkat & Angkut" },
  { key: "fire", name: "Sarana Proteksi Kebakaran" },
  { key: "instrument", name: "Instrumentasi & Alat Ukur" },
];

async function seedReference(client, ctx) {
  const ids = { documentCategories: {}, workPermitTypes: {}, inspectionTypes: {}, checklistTemplates: {}, auditTypes: {}, auditChecklists: {}, assetCategories: {} };

  // Matriks risiko 5x5 — satu-satunya konfigurasi aktif untuk seluruh modul.
  // hira_assessments.risk_matrix_config_id NOT NULL, jadi ini harus ada
  // sebelum satu pun penilaian HIRA bisa ditulis. Indeks unik parsial di
  // basis data hanya mengizinkan SATU konfigurasi aktif per cakupan modul,
  // yang berarti menambah konfigurasi kedua di sini akan gagal — bukan
  // menghasilkan dua matriks yang bersaing.
  ids.riskMatrixConfigId = await upsert(
    client,
    "risk_matrix_configs",
    "risk_matrix_config_id",
    {
      risk_matrix_config_id: uuidFor("risk-matrix", "default-5x5"),
      name: "Matriks Risiko Korporat 5x5",
      applicable_module_scope: "ALL",
      likelihood_levels: 5,
      severity_levels: 5,
      version: 1,
      is_active: true,
    },
    ctx.audit,
  );

  for (const category of DOCUMENT_CATEGORIES) {
    ids.documentCategories[category.code] = await upsert(
      client,
      "document_categories",
      "document_category_id",
      { document_category_id: uuidFor("doc-category", category.code), code: category.code, name: category.name, status: "ACTIVE" },
      ctx.audit,
    );
  }

  for (const type of WORK_PERMIT_TYPES) {
    ids.workPermitTypes[type.code] = await upsert(
      client,
      "work_permit_types",
      "work_permit_type_id",
      { work_permit_type_id: uuidFor("wp-type", type.code), code: type.code, name: type.name, default_risk_level: type.risk, is_active: true },
      ctx.audit,
    );
  }

  for (const type of INSPECTION_TYPES) {
    ids.inspectionTypes[type.code] = await upsert(
      client,
      "inspection_types",
      "inspection_type_id",
      { inspection_type_id: uuidFor("insp-type", type.code), code: type.code, name: type.name, is_active: true },
      ctx.audit,
    );

    // Satu template checklist per jenis inspeksi. Metode skornya
    // WEIGHTED_SCORE supaya kolom "Skor" pada daftar inspeksi berisi angka
    // yang memang punya arti, bukan sekadar lulus/tidak.
    ids.checklistTemplates[type.code] = await upsert(
      client,
      "inspection_checklist_templates",
      "inspection_checklist_template_id",
      {
        inspection_checklist_template_id: uuidFor("insp-template", type.code),
        inspection_type_id: ids.inspectionTypes[type.code],
        name: `Checklist ${type.name}`,
        version_number: 1,
        scoring_method: "WEIGHTED_SCORE",
        effective_date: dateOnly(daysAgo(400)),
        is_active: true,
      },
      ctx.audit,
    );
  }

  for (const type of AUDIT_TYPES) {
    ids.auditTypes[type.code] = await upsert(
      client,
      "audit_types",
      "audit_type_id",
      { audit_type_id: uuidFor("audit-type", type.code), code: type.code, name: type.name, is_active: true },
      ctx.audit,
    );
  }

  for (const checklist of AUDIT_CHECKLISTS) {
    ids.auditChecklists[checklist.key] = await upsert(
      client,
      "audit_checklists",
      "audit_checklist_id",
      {
        audit_checklist_id: uuidFor("audit-checklist", checklist.key),
        name: checklist.name,
        standard_code: checklist.standard,
        version_number: 1,
        is_active: true,
      },
      ctx.audit,
    );
  }

  for (const category of ASSET_CATEGORIES) {
    ids.assetCategories[category.key] = await upsert(
      client,
      "asset_categories",
      "asset_category_id",
      { asset_category_id: uuidFor("asset-category", category.key), category_name: category.name, is_active: true },
      ctx.audit,
    );
  }

  return ids;
}

module.exports = { seedReference, WORK_PERMIT_TYPES, INSPECTION_TYPES, AUDIT_TYPES, ASSET_CATEGORIES };
