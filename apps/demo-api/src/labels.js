// Menerjemahkan kolom kunci asing menjadi nama yang bisa dibaca manusia.
//
// Endpoint baca-saja mengembalikan baris apa adanya, jadi tanpa lapisan ini
// halaman detail menampilkan `Owner user id: b1171e4a-06d8-5441-964a-...`.
// Itu bukan sekadar kurang rapi — bagi orang yang menonton demo, layar
// penuh UUID membaca sebagai "sistemnya belum jadi", dan mereka tidak salah
// menyimpulkannya: nama pemilik dokumen memang informasi yang seharusnya
// ada di sana, bukan pengenal internal.
//
// Hasilnya ditempel sebagai field bersebelahan berakhiran `Label`
// (`ownerUserId` -> `ownerUserIdLabel`), BUKAN menimpa nilai aslinya.
// Menimpa akan membuat tautan dan pencocokan id di sisi klien diam-diam
// rusak, dan halaman detail tetap butuh id aslinya untuk memuat data anak.
const { toCamelCase } = require("./http");

// Kolom -> tabel tujuan + kolom yang dipakai sebagai label.
//
// Dipetakan berdasar NAMA KOLOM, bukan per tabel: `created_by` berarti hal
// yang sama di 30 tabel, dan menuliskannya 30 kali adalah undangan untuk
// lupa satu. Konsekuensinya nama kolom di seluruh skema harus konsisten —
// dan memang begitu keadaannya di sini.
const BY_COLUMN = {
  // Orang
  created_by: ["users", "user_id", "full_name"],
  updated_by: ["users", "user_id", "full_name"],
  owner_user_id: ["users", "user_id", "full_name"],
  assigned_to: ["users", "user_id", "full_name"],
  initiated_by: ["users", "user_id", "full_name"],
  identified_by: ["users", "user_id", "full_name"],
  inspector_id: ["users", "user_id", "full_name"],
  lead_auditor_id: ["users", "user_id", "full_name"],
  lead_investigator_id: ["users", "user_id", "full_name"],
  requester_id: ["users", "user_id", "full_name"],
  reported_by: ["users", "user_id", "full_name"],
  detected_by: ["users", "user_id", "full_name"],
  assessed_by: ["users", "user_id", "full_name"],
  assigned_by: ["users", "user_id", "full_name"],
  analyzed_by: ["users", "user_id", "full_name"],
  approved_by: ["users", "user_id", "full_name"],
  reviewed_by: ["users", "user_id", "full_name"],
  closed_by: ["users", "user_id", "full_name"],
  linked_by: ["users", "user_id", "full_name"],
  tested_by: ["users", "user_id", "full_name"],
  performed_by: ["users", "user_id", "full_name"],
  pic_user_id: ["users", "user_id", "full_name"],
  user_id: ["users", "user_id", "full_name"],
  employee_user_id: ["users", "user_id", "full_name"],
  supervisor_user_id: ["users", "user_id", "full_name"],
  disposition_approved_by: ["users", "user_id", "full_name"],
  evaluated_by: ["users", "user_id", "full_name"],
  verified_by: ["users", "user_id", "full_name"],

  // Organisasi
  company_id: ["companies", "company_id", "display_name"],
  branch_id: ["branches", "branch_id", "name"],
  site_id: ["sites", "site_id", "name"],
  department_id: ["departments", "department_id", "name"],

  // Data referensi
  document_category_id: ["document_categories", "document_category_id", "name"],
  work_permit_type_id: ["work_permit_types", "work_permit_type_id", "name"],
  inspection_type_id: ["inspection_types", "inspection_type_id", "name"],
  inspection_checklist_template_id: ["inspection_checklist_templates", "inspection_checklist_template_id", "name"],
  audit_type_id: ["audit_types", "audit_type_id", "name"],
  audit_checklist_id: ["audit_checklists", "audit_checklist_id", "name"],
  asset_category_id: ["asset_categories", "asset_category_id", "category_name"],
  risk_matrix_config_id: ["risk_matrix_configs", "risk_matrix_config_id", "name"],
  calibration_provider_id: ["calibration_providers", "calibration_provider_id", "provider_name"],

  // Rujukan silang antar modul — inilah yang membuat rantai
  // insiden -> CAPA dan temuan audit -> CAPA terlihat sebagai nomor
  // yang bisa dicari, bukan sebagai UUID buntu.
  capa_register_id: ["capa_register", "capa_register_id", "capa_number"],
  audit_id: ["audits", "audit_id", "audit_number"],
  incident_report_id: ["incident_reports", "incident_report_id", "incident_number"],
  work_permit_id: ["work_permits", "work_permit_id", "permit_number"],
  document_id: ["documents", "document_id", "document_number"],
  regulatory_register_id: ["regulatory_register", "regulatory_register_id", "regulation_number"],
  hira_id: ["hira_assessments", "hira_id", "hira_number"],
  inspection_record_id: ["inspection_records", "inspection_record_id", "inspection_record_number"],
  emergency_response_plan_id: ["emergency_response_plans", "emergency_response_plan_id", "plan_number"],
  asset_id: ["assets", "asset_id", "asset_name"],
  calibration_item_id: ["calibration_items", "calibration_item_id", "equipment_tag_no"],
  contractor_id: ["contractors", "contractor_id", "contractor_name"],
  ncr_id: ["ncr_records", "ncr_id", "ncr_number"],
};

// tenant_id sengaja TIDAK ada di peta: ia sama untuk seluruh baris yang
// bisa dilihat pengguna, jadi menampilkannya hanya menambah baris kosong
// yang harus dilewati mata.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Menempelkan `<field>Label` pada setiap baris.
 *
 * Satu query per tabel tujuan untuk SELURUH baris sekaligus, bukan satu
 * query per baris: halaman daftar memuat 20 baris yang masing-masing punya
 * lima kolom kunci asing, dan pendekatan naif berarti seratus perjalanan
 * pulang-pergi ke basis data untuk satu halaman.
 */
async function attachLabels(client, rows) {
  if (rows.length === 0) return rows;

  const wanted = new Map(); // tabel -> { pk, labelColumn, ids:Set }
  for (const row of rows) {
    for (const [column, value] of Object.entries(row)) {
      const target = BY_COLUMN[column];
      if (!target || !value || typeof value !== "string" || !UUID_PATTERN.test(value)) continue;
      const [table, pk, labelColumn] = target;
      if (!wanted.has(table)) wanted.set(table, { pk, labelColumn, ids: new Set() });
      wanted.get(table).ids.add(value);
    }
  }
  if (wanted.size === 0) return rows;

  const resolved = new Map(); // `${tabel}:${id}` -> label
  for (const [table, { pk, labelColumn, ids }] of wanted) {
    const { rows: found } = await client.query(
      `SELECT "${pk}" AS id, "${labelColumn}" AS label FROM "${table}" WHERE "${pk}" = ANY($1::uuid[])`,
      [[...ids]],
    );
    for (const entry of found) resolved.set(`${table}:${entry.id}`, entry.label);
  }

  for (const row of rows) {
    for (const [column, value] of Object.entries(row)) {
      const target = BY_COLUMN[column];
      if (!target || !value || typeof value !== "string") continue;
      const label = resolved.get(`${target[0]}:${value}`);
      // Kunci asing yang menunjuk baris terhapus tidak diberi label sama
      // sekali, bukan diberi teks "(tidak ditemukan)": halaman detail sudah
      // punya cara menampilkan nilai mentah, dan menambah kalimat galat ke
      // dalam data membuat pemanggil harus membedakan keduanya.
      if (label) row[`${toCamelCase(column)}Label`] = label;
    }
  }
  return rows;
}

module.exports = { attachLabels, BY_COLUMN };
