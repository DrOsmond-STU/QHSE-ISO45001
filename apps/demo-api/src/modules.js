// Registri modul sisi server — pasangan dari apps/web/lib/modules.ts.
//
// Kalau `slug`/`endpoint` di sini dan di berkas itu berbeda, gejalanya
// adalah kartu dashboard yang menampilkan "—" tanpa penjelasan apa pun,
// jadi keduanya harus diubah bersamaan. Urutan dan jumlah entri di sini
// mengikuti registri frontend supaya perbandingannya bisa dilakukan sambil
// membaca, bukan dengan mencari-cari.
//
// `orderBy` menentukan baris mana yang muncul di halaman pertama, dan itulah
// yang dilihat penonton presentasi. Kolom tanggal domain dipakai kalau ada
// (tanggal insiden, tanggal terdeteksi) supaya daftarnya terbaca sebagai
// riwayat kerja yang menurun dari yang terbaru, bukan urutan penulisan baris
// ke basis data.
const MODULES = [
  { slug: "documents", endpoint: "/documents", table: "documents", pk: "document_id", orderBy: "created_at DESC" },
  { slug: "regulatory-registers", endpoint: "/regulatory-registers", table: "regulatory_register", pk: "regulatory_register_id", orderBy: "effective_date DESC NULLS LAST" },
  { slug: "hira-assessments", endpoint: "/hira-assessments", table: "hira_assessments", pk: "hira_id", orderBy: "assessment_date DESC NULLS LAST" },
  { slug: "work-permits", endpoint: "/work-permits", table: "work_permits", pk: "work_permit_id", orderBy: "planned_start_datetime DESC" },
  { slug: "incident-reports", endpoint: "/incident-reports", table: "incident_reports", pk: "incident_report_id", orderBy: "incident_datetime DESC" },
  { slug: "capa-registers", endpoint: "/capa-registers", table: "capa_register", pk: "capa_register_id", orderBy: "initiated_at DESC" },
  { slug: "inspection-records", endpoint: "/inspection-records", table: "inspection_records", pk: "inspection_record_id", orderBy: "planned_date DESC NULLS LAST" },
  {
    slug: "audits",
    endpoint: "/audits",
    table: "audits",
    pk: "audit_id",
    orderBy: "planned_start_date DESC",
    // Satu-satunya endpoint anak yang ada padanannya di apps/api
    // (GET /audits/:id/findings) — modul lain belum punya.
    children: { pathSuffix: "/findings", table: "audit_findings", pk: "audit_finding_id", foreignKey: "audit_id", orderBy: "finding_number ASC" },
  },
  { slug: "ncr-records", endpoint: "/ncr-records", table: "ncr_records", pk: "ncr_id", orderBy: "detected_date DESC" },
  { slug: "environmental-aspect-impacts", endpoint: "/environmental-aspect-impacts", table: "environmental_aspects_impacts", pk: "aspect_impact_id", orderBy: "significance_score DESC" },
  { slug: "restricted-duty-assignments", endpoint: "/restricted-duty-assignments", table: "restricted_duty_assignments", pk: "restricted_duty_assignment_id", orderBy: "start_date DESC" },
  { slug: "emergency-response-plans", endpoint: "/emergency-response-plans", table: "emergency_response_plans", pk: "emergency_response_plan_id", orderBy: "plan_number ASC" },
  { slug: "assets", endpoint: "/assets", table: "assets", pk: "asset_id", orderBy: "asset_code ASC" },
  { slug: "calibration-items", endpoint: "/calibration-items", table: "calibration_items", pk: "calibration_item_id", orderBy: "equipment_tag_no ASC" },
  { slug: "contractors", endpoint: "/contractors", table: "contractors", pk: "contractor_id", orderBy: "registered_at DESC NULLS LAST" },
];

const MODULE_BY_ENDPOINT = new Map(MODULES.map((m) => [m.endpoint, m]));

function findModuleByEndpoint(endpoint) {
  return MODULE_BY_ENDPOINT.get(endpoint) || null;
}

module.exports = { MODULES, findModuleByEndpoint };
