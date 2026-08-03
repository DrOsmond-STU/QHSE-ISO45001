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
//
// `children` adalah isi sesungguhnya dari halaman detail. Tanpa itu, detail
// hanya menampilkan kolom-kolom satu baris tabel induk — yang secara harfiah
// benar tapi menyesatkan, karena pekerjaan QHSE justru hidup di anaknya:
// temuan sebuah audit, langkah tindakan sebuah CAPA, hasil uji gas sebuah
// izin kerja panas. Audit yang detailnya tidak memuat temuan terbaca sebagai
// modul yang belum jadi.
const MODULES = [
  {
    slug: "documents",
    endpoint: "/documents",
    table: "documents",
    pk: "document_id",
    orderBy: "document_number ASC",
    children: [
      { pathSuffix: "/versions", table: "document_versions", pk: "document_version_id", foreignKey: "document_id", orderBy: "major_version DESC, minor_version DESC" },
    ],
  },
  {
    slug: "regulatory-registers",
    endpoint: "/regulatory-registers",
    table: "regulatory_register",
    pk: "regulatory_register_id",
    orderBy: "effective_date DESC NULLS LAST",
    children: [
      { pathSuffix: "/obligations", table: "compliance_obligations", pk: "obligation_id", foreignKey: "regulatory_register_id", orderBy: "created_at ASC" },
    ],
  },
  {
    slug: "hira-assessments",
    endpoint: "/hira-assessments",
    table: "hira_assessments",
    pk: "hira_id",
    orderBy: "assessment_date DESC NULLS LAST",
    children: [
      { pathSuffix: "/hazards", table: "hira_hazard_lines", pk: "hira_line_id", foreignKey: "hira_id", orderBy: "risk_score_before DESC" },
    ],
  },
  {
    slug: "work-permits",
    endpoint: "/work-permits",
    table: "work_permits",
    pk: "work_permit_id",
    // Antrean kerja, bukan urutan kronologis murni: yang menunggu persetujuan
    // dan yang sedang berjalan naik ke atas, sisanya menyusul dari yang
    // terbaru. Daftar izin kerja yang diurut tanggal saja menaruh draf untuk
    // pekan depan di baris pertama dan izin yang sedang berjalan hari ini di
    // halaman dua — kebalikan dari yang dicari orang saat membukanya.
    orderBy: `CASE status
                WHEN 'PENDING_HSE_APPROVAL' THEN 0
                WHEN 'PENDING_ISSUER_APPROVAL' THEN 1
                WHEN 'ACTIVE' THEN 2
                WHEN 'APPROVED' THEN 3
                WHEN 'EXTENSION_REQUESTED' THEN 4
                WHEN 'SUBMITTED' THEN 5
                WHEN 'DRAFT' THEN 6
                ELSE 7 END, planned_start_datetime DESC`,
    children: [
      { pathSuffix: "/gas-tests", table: "gas_test_results", pk: "gas_test_result_id", foreignKey: "work_permit_id", orderBy: "test_datetime ASC, gas_type ASC" },
    ],
  },
  {
    slug: "incident-reports",
    endpoint: "/incident-reports",
    table: "incident_reports",
    pk: "incident_report_id",
    orderBy: "incident_datetime DESC",
    children: [
      { pathSuffix: "/investigations", table: "incident_investigations", pk: "incident_investigation_id", foreignKey: "incident_report_id", orderBy: "started_at ASC" },
      // Akar masalah menggantung pada INVESTIGASI, bukan langsung pada
      // laporan insiden. Tanpa `through`, analisis 5-why-nya tidak akan
      // pernah muncul di halaman insiden — padahal itu bagian yang paling
      // ingin dibaca orang setelah membaca kronologinya.
      {
        pathSuffix: "/root-causes",
        table: "incident_root_causes",
        pk: "incident_root_cause_id",
        foreignKey: "incident_investigation_id",
        through: { table: "incident_investigations", pk: "incident_investigation_id", foreignKey: "incident_report_id" },
        orderBy: "sequence_no ASC",
      },
      { pathSuffix: "/corrective-actions", table: "incident_corrective_actions", pk: "incident_corrective_action_link_id", foreignKey: "incident_report_id", orderBy: "linked_at ASC" },
    ],
  },
  {
    slug: "capa-registers",
    endpoint: "/capa-registers",
    table: "capa_register",
    pk: "capa_register_id",
    orderBy: "initiated_at DESC",
    children: [
      { pathSuffix: "/root-causes", table: "capa_root_cause_analysis", pk: "root_cause_analysis_id", foreignKey: "capa_register_id", orderBy: "analyzed_at ASC" },
      { pathSuffix: "/action-plans", table: "capa_action_plans", pk: "capa_action_plan_id", foreignKey: "capa_register_id", orderBy: "due_date ASC" },
    ],
  },
  {
    slug: "inspection-records",
    endpoint: "/inspection-records",
    table: "inspection_records",
    pk: "inspection_record_id",
    // Alasan sama dengan audit: yang sudah dikerjakan lebih dulu, karena
    // itulah yang punya skor, hasil, dan temuan untuk dilihat. Yang masih
    // terjadwal menyusul di bawahnya.
    orderBy: "actual_date DESC NULLS LAST, planned_date DESC",
    children: [
      { pathSuffix: "/findings", table: "inspection_findings", pk: "inspection_finding_id", foreignKey: "inspection_record_id", orderBy: "severity DESC, identified_at ASC" },
    ],
  },
  {
    slug: "audits",
    endpoint: "/audits",
    table: "audits",
    pk: "audit_id",
    // Audit yang SUDAH dilaksanakan lebih dulu, terbaru di atas; yang baru
    // direncanakan turun ke bawah. Diurut tanggal rencana saja, baris
    // pertama selalu audit yang belum dikerjakan — yang tidak punya temuan,
    // tidak punya notulen, dan tidak punya kesimpulan. Itulah yang membuat
    // modul audit terbaca kosong pada pandangan pertama.
    orderBy: "actual_start_date DESC NULLS LAST, planned_start_date DESC",
    children: [
      { pathSuffix: "/findings", table: "audit_findings", pk: "audit_finding_id", foreignKey: "audit_id", orderBy: "finding_number ASC" },
      { pathSuffix: "/team", table: "audit_team_members", pk: "audit_team_member_id", foreignKey: "audit_id", orderBy: "role_in_team ASC" },
    ],
  },
  { slug: "ncr-records", endpoint: "/ncr-records", table: "ncr_records", pk: "ncr_id", orderBy: "detected_date DESC" },
  {
    slug: "environmental-aspect-impacts",
    endpoint: "/environmental-aspect-impacts",
    table: "environmental_aspects_impacts",
    pk: "aspect_impact_id",
    orderBy: "significance_score DESC",
  },
  {
    slug: "restricted-duty-assignments",
    endpoint: "/restricted-duty-assignments",
    table: "restricted_duty_assignments",
    pk: "restricted_duty_assignment_id",
    orderBy: "start_date DESC",
  },
  {
    slug: "emergency-response-plans",
    endpoint: "/emergency-response-plans",
    table: "emergency_response_plans",
    pk: "emergency_response_plan_id",
    orderBy: "plan_number ASC",
    children: [
      { pathSuffix: "/steps", table: "emergency_response_plan_steps", pk: "plan_step_id", foreignKey: "emergency_response_plan_id", orderBy: "sequence_no ASC" },
    ],
  },
  {
    slug: "assets",
    endpoint: "/assets",
    table: "assets",
    pk: "asset_id",
    orderBy: "asset_code ASC",
    children: [
      { pathSuffix: "/maintenance", table: "maintenance_records", pk: "maintenance_record_id", foreignKey: "asset_id", orderBy: "performed_date DESC" },
    ],
  },
  {
    slug: "calibration-items",
    endpoint: "/calibration-items",
    table: "calibration_items",
    pk: "calibration_item_id",
    orderBy: "equipment_tag_no ASC",
    children: [
      { pathSuffix: "/certificates", table: "calibration_certificates", pk: "calibration_certificate_id", foreignKey: "calibration_item_id", orderBy: "calibration_date DESC" },
    ],
  },
  {
    slug: "contractors",
    endpoint: "/contractors",
    table: "contractors",
    pk: "contractor_id",
    // Mitra yang sedang bekerja lebih dulu, lalu yang bermasalah (agar tidak
    // tenggelam), baru sisanya. Diurut tanggal pendaftaran saja, baris
    // pertama adalah kontraktor yang baru mendaftar dan karena itu belum
    // punya satu pun evaluasi kinerja.
    orderBy: `CASE status
                WHEN 'ACTIVE' THEN 0
                WHEN 'SUSPENDED' THEN 1
                WHEN 'BLACKLISTED' THEN 2
                WHEN 'PREQUALIFIED' THEN 3
                ELSE 4 END, registered_at DESC NULLS LAST`,
    children: [
      { pathSuffix: "/evaluations", table: "contractor_performance_evaluations", pk: "evaluation_id", foreignKey: "contractor_id", orderBy: "evaluation_date DESC" },
    ],
  },
];

const MODULE_BY_ENDPOINT = new Map(MODULES.map((m) => [m.endpoint, m]));

function findModuleByEndpoint(endpoint) {
  return MODULE_BY_ENDPOINT.get(endpoint) || null;
}

function findChild(moduleDef, suffix) {
  return (moduleDef.children || []).find((child) => child.pathSuffix === suffix) || null;
}

module.exports = { MODULES, findModuleByEndpoint, findChild };
