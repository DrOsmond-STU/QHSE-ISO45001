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
//
// `write` adalah bagian yang membuat modul bisa DIKERJAKAN, bukan cuma
// dibaca. Isinya tiga hal yang tidak bisa disimpulkan dari skema:
//
//   penomoran — pola nomor dokumen dan dari mana segmen tengahnya diambil
//               (PTW/HOT/2026/0041: HOT adalah kode jenis izinnya).
//
//   lifecycle — daftar transisi status yang SAH. DISALIN dari berkas
//               *-lifecycle.ts milik apps/api, bukan dikarang: state machine
//               inilah yang membedakan aplikasi QHSE dari tabel berkolom
//               status. Status yang tidak ada di daftar ini tidak bisa
//               dicapai lewat jalur mana pun.
//
//   approval  — status mana yang boleh diajukan, dan status apa yang berlaku
//               ketika persetujuannya selesai disetujui atau ditolak.
//               `context` menyebut percabangan yang harus dihitung sebelum
//               instance dimulai (izin kerja berisiko HIGH wajib lewat HSE).
//
// Modul tanpa `approval` memang tidak punya alur persetujuan di apps/api —
// aset, kalibrasi, dan register peraturan diubah langsung oleh pemiliknya.
// Membuatkan alur persetujuan untuk modul itu berarti mengarang kewajiban
// yang tidak diminta standarnya.
const MODULES = [
  {
    slug: "documents",
    write: {
      numberColumn: "document_number",
      numberModuleCode: "DMS",
      numberPattern: "{PREFIX}/{SEG}/{YYYY}/{SEQ:3}",
      numberPrefix: "DOC",
      numberSeqWidth: 3,
      numberSegment: { column: "document_category_id", table: "document_categories", pk: "document_category_id", codeColumn: "code" },
      statusColumn: "status",
      // Yang punya state machine di apps/api adalah VERSI dokumennya
      // (document-version-lifecycle.ts), bukan dokumen induknya; status induk
      // mengikuti versi yang sedang berlaku. Daftar di bawah adalah
      // perjalanan yang sama, dipetakan ke enum DocumentStatus.
      lifecycle: {
        DRAFT: ["IN_REVIEW"],
        IN_REVIEW: ["APPROVED", "DRAFT"],
        APPROVED: ["PUBLISHED"],
        PUBLISHED: ["UNDER_REVISION", "OBSOLETE"],
        UNDER_REVISION: ["IN_REVIEW"],
        OBSOLETE: ["RETIRED"],
        RETIRED: [],
      },
      approval: {
        entityType: "document",
        fromStatus: "DRAFT",
        pendingStatus: "IN_REVIEW",
        approvedStatus: "APPROVED",
        rejectedStatus: "DRAFT",
        // Tahap pertamanya CONTEXT_USER "Review Document Owner" — approvernya
        // mengikuti pemilik dokumen baris itu, bukan sebuah peran.
        contextUserColumn: "owner_user_id",
      },
    },
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
    write: {
      statusColumn: "status",
      lifecycle: {
        ACTIVE: ["SUPERSEDED", "REVOKED"],
        SUPERSEDED: [],
        REVOKED: [],
      },
    },
    endpoint: "/regulatory-registers",
    table: "regulatory_register",
    pk: "regulatory_register_id",
    orderBy: "effective_date DESC NULLS LAST",
    children: [
      { pathSuffix: "/obligations", table: "compliance_obligations", pk: "obligation_id", foreignKey: "regulatory_register_id", orderBy: "created_at ASC" },
      // attachments bersifat polimorfik (entity_type + entity_id), jadi butuh
      // saringan tambahan — tanpa itu, halaman register peraturan akan
      // menampilkan lampiran milik SELURUH modul yang id induknya kebetulan
      // sama panjang.
      {
        pathSuffix: "/attachments",
        table: "attachments",
        pk: "attachment_id",
        foreignKey: "entity_id",
        where: "t.entity_type = 'regulatory_register'",
        orderBy: "uploaded_at DESC",
      },
    ],
  },
  {
    slug: "hira-assessments",
    write: {
      numberColumn: "hira_number",
      numberModuleCode: "RISK",
      numberPattern: "{PREFIX}/{YYYY}/{SEQ:3}",
      numberPrefix: "HIRA",
      numberSeqWidth: 3,
      statusColumn: "status",
      lifecycle: {
        DRAFT: ["IN_REVIEW"],
        IN_REVIEW: ["APPROVED", "REQUIRES_REVISION"],
        REQUIRES_REVISION: ["IN_REVIEW"],
        APPROVED: ["ACTIVE"],
        ACTIVE: ["ARCHIVED"],
        ARCHIVED: [],
      },
      approval: {
        entityType: "hira_assessment",
        fromStatus: "DRAFT",
        pendingStatus: "IN_REVIEW",
        approvedStatus: "APPROVED",
        // Ditolak BUKAN berarti mati: penilaian risiko yang ditolak kembali
        // ke REQUIRES_REVISION untuk diperbaiki. Bahaya yang sudah
        // teridentifikasi tidak hilang karena dokumennya ditolak.
        rejectedStatus: "REQUIRES_REVISION",
        context: "hiraExtremeHazard",
      },
    },
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
    write: {
      numberColumn: "permit_number",
      numberModuleCode: "WORK_PERMIT",
      numberPattern: "{PREFIX}/{SEG}/{YYYY}/{SEQ:4}",
      numberPrefix: "PTW",
      numberSeqWidth: 4,
      numberSegment: { column: "work_permit_type_id", table: "work_permit_types", pk: "work_permit_type_id", codeColumn: "code" },
      statusColumn: "status",
      lifecycle: {
        DRAFT: ["PENDING_ISSUER_APPROVAL", "CANCELLED"],
        SUBMITTED: [],
        PENDING_ISSUER_APPROVAL: ["PENDING_HSE_APPROVAL", "APPROVED", "REJECTED", "CANCELLED"],
        PENDING_HSE_APPROVAL: ["APPROVED", "REJECTED", "CANCELLED"],
        APPROVED: ["ACTIVE", "CANCELLED"],
        ACTIVE: ["EXTENSION_REQUESTED", "PENDING_CLOSURE", "SUSPENDED", "EXPIRED"],
        SUSPENDED: ["ACTIVE"],
        EXTENSION_REQUESTED: ["ACTIVE"],
        PENDING_CLOSURE: ["CLOSED", "ACTIVE"],
        CLOSED: [],
        REJECTED: [],
        CANCELLED: [],
        EXPIRED: [],
      },
      approval: {
        entityType: "work_permit",
        fromStatus: "DRAFT",
        pendingStatus: "PENDING_ISSUER_APPROVAL",
        // Disetujui TIDAK berarti berjalan. Aktivasi adalah langkah terpisah
        // (APPROVED -> ACTIVE) yang dilakukan di lapangan setelah pemeriksaan
        // akhir — apps/api memisahkannya dengan sengaja, dan menggabungkannya
        // di sini berarti izin dianggap berjalan padahal belum ada yang
        // memeriksa lokasinya.
        approvedStatus: "APPROVED",
        rejectedStatus: "REJECTED",
        // BR-04 — tahap HSE hanya dilalui kalau risikonya HIGH atau jenis
        // izinnya memang mewajibkannya.
        context: "workPermitHseStage",
      },
    },
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
    write: {
      numberColumn: "incident_number",
      numberModuleCode: "INCIDENT",
      numberPattern: "{PREFIX}/{YYYY}/{SEQ:4}",
      numberPrefix: "INC",
      numberSeqWidth: 4,
      statusColumn: "status",
      lifecycle: {
        REPORTED: ["UNDER_VERIFICATION"],
        UNDER_VERIFICATION: ["UNDER_INVESTIGATION", "PENDING_REGULATORY_REPORT", "CLOSED"],
        UNDER_INVESTIGATION: ["INVESTIGATION_COMPLETED"],
        INVESTIGATION_COMPLETED: ["PENDING_REGULATORY_REPORT", "CLOSED"],
        PENDING_REGULATORY_REPORT: ["CLOSED"],
        CLOSED: ["REOPENED"],
        REOPENED: ["UNDER_INVESTIGATION"],
      },
      approval: {
        entityType: "incident_report",
        fromStatus: "UNDER_INVESTIGATION",
        pendingStatus: "UNDER_INVESTIGATION",
        approvedStatus: "INVESTIGATION_COMPLETED",
        rejectedStatus: "UNDER_INVESTIGATION",
        context: "incidentRegulatoryReport",
      },
    },
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
    write: {
      numberColumn: "capa_number",
      numberModuleCode: "CAPA",
      numberPattern: "{PREFIX}/{YYYY}/{SEQ:4}",
      numberPrefix: "CAPA",
      numberSeqWidth: 4,
      statusColumn: "status",
      lifecycle: {
        DRAFT: ["ROOT_CAUSE_ANALYSIS", "CANCELLED"],
        ROOT_CAUSE_ANALYSIS: ["ACTION_PLAN_DEFINED", "CANCELLED"],
        ACTION_PLAN_DEFINED: ["PENDING_APPROVAL", "CANCELLED"],
        PENDING_APPROVAL: ["IN_PROGRESS", "ACTION_PLAN_DEFINED", "CANCELLED"],
        IN_PROGRESS: ["PENDING_EFFECTIVENESS_VERIFICATION", "CANCELLED"],
        PENDING_EFFECTIVENESS_VERIFICATION: ["EFFECTIVE_CLOSED", "NOT_EFFECTIVE_REOPENED", "CANCELLED"],
        EFFECTIVE_CLOSED: ["NOT_EFFECTIVE_REOPENED"],
        NOT_EFFECTIVE_REOPENED: ["ROOT_CAUSE_ANALYSIS"],
        CANCELLED: [],
      },
      approval: {
        entityType: "capa_register",
        fromStatus: "ACTION_PLAN_DEFINED",
        pendingStatus: "PENDING_APPROVAL",
        approvedStatus: "IN_PROGRESS",
        rejectedStatus: "ACTION_PLAN_DEFINED",
      },
    },
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
    write: {
      numberColumn: "inspection_record_number",
      numberModuleCode: "INSPECTION",
      numberPattern: "{PREFIX}/{YYYY}/{SEQ:4}",
      numberPrefix: "INS",
      numberSeqWidth: 4,
      statusColumn: "status",
      lifecycle: {
        SCHEDULED: ["IN_PROGRESS", "OVERDUE", "CANCELLED"],
        IN_PROGRESS: ["COMPLETED", "OVERDUE", "CANCELLED"],
        OVERDUE: ["IN_PROGRESS", "COMPLETED", "CANCELLED"],
        COMPLETED: ["IN_PROGRESS"],
        CANCELLED: [],
      },
    },
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
    write: {
      numberColumn: "audit_number",
      numberModuleCode: "AUDIT",
      numberPattern: "{PREFIX}/{YYYY}/{SEQ:3}",
      numberPrefix: "AUD",
      numberSeqWidth: 3,
      statusColumn: "status",
      lifecycle: {
        PLANNED: ["IN_PROGRESS", "CANCELLED"],
        IN_PROGRESS: ["REPORT_DRAFTED", "CANCELLED"],
        REPORT_DRAFTED: ["REPORT_APPROVED"],
        REPORT_APPROVED: ["PENDING_CAPA_CLOSURE", "CLOSED"],
        PENDING_CAPA_CLOSURE: ["CLOSED"],
        CLOSED: [],
        CANCELLED: [],
      },
      approval: {
        entityType: "audit",
        fromStatus: "REPORT_DRAFTED",
        pendingStatus: "REPORT_DRAFTED",
        approvedStatus: "REPORT_APPROVED",
        rejectedStatus: "IN_PROGRESS",
        contextUserColumn: "lead_auditor_id",
      },
    },
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
  {
    slug: "ncr-records",
    write: {
      numberColumn: "ncr_number",
      numberModuleCode: "QUALITY_NCR",
      numberPattern: "{PREFIX}/{YYYY}/{SEQ:4}",
      numberPrefix: "NCR",
      numberSeqWidth: 4,
      statusColumn: "status",
      lifecycle: {
        OPEN: ["CONTAINMENT", "CANCELLED"],
        CONTAINMENT: ["DISPOSITION_PENDING", "CANCELLED"],
        DISPOSITION_PENDING: ["DISPOSITIONED", "CANCELLED"],
        DISPOSITIONED: ["CAPA_LINKED", "CLOSED", "CANCELLED"],
        CAPA_LINKED: ["CLOSED", "CANCELLED"],
        CLOSED: [],
        CANCELLED: [],
      },
      approval: {
        entityType: "ncr_record",
        fromStatus: "CONTAINMENT",
        pendingStatus: "DISPOSITION_PENDING",
        approvedStatus: "DISPOSITIONED",
        rejectedStatus: "CONTAINMENT",
      },
    },
    endpoint: "/ncr-records",
    table: "ncr_records",
    pk: "ncr_id",
    orderBy: "detected_date DESC",
  },
  {
    slug: "environmental-aspect-impacts",
    write: {
      numberColumn: "register_number",
      numberModuleCode: "ENV_ASPECT",
      numberPattern: "{PREFIX}/{YYYY}/{SEQ:3}",
      numberPrefix: "EAI",
      numberSeqWidth: 3,
      statusColumn: "status",
      // Keduanya DITURUNKAN dari lima skor komponen (aspect-impact-lifecycle.ts
      // calculateSignificanceScore), jadi tidak boleh diketik tangan.
      hidden: ["significance_score", "significance_level"],
      lifecycle: {
        DRAFT: ["UNDER_REVIEW"],
        UNDER_REVIEW: ["ACTIVE", "DRAFT"],
        ACTIVE: ["UNDER_REVIEW", "ARCHIVED"],
        ARCHIVED: [],
      },
      approval: {
        entityType: "environmental_aspect_impact",
        fromStatus: "DRAFT",
        pendingStatus: "UNDER_REVIEW",
        approvedStatus: "ACTIVE",
        rejectedStatus: "DRAFT",
      },
    },
    endpoint: "/environmental-aspect-impacts",
    table: "environmental_aspects_impacts",
    pk: "aspect_impact_id",
    orderBy: "significance_score DESC",
  },
  {
    slug: "restricted-duty-assignments",
    write: {
      statusColumn: "status",
      lifecycle: {
        ACTIVE: ["COMPLETED", "ESCALATED_NON_COMPLIANT"],
        COMPLETED: [],
        ESCALATED_NON_COMPLIANT: ["ACTIVE", "COMPLETED"],
      },
    },
    endpoint: "/restricted-duty-assignments",
    table: "restricted_duty_assignments",
    pk: "restricted_duty_assignment_id",
    orderBy: "start_date DESC",
  },
  {
    slug: "emergency-response-plans",
    write: {
      numberColumn: "plan_number",
      numberModuleCode: "EMERGENCY_PLAN",
      numberPattern: "{PREFIX}/{YYYY}/{SEQ:3}",
      numberPrefix: "ERP",
      numberSeqWidth: 3,
      statusColumn: "status",
      lifecycle: {
        DRAFT: ["UNDER_REVIEW"],
        UNDER_REVIEW: ["APPROVED_ACTIVE", "DRAFT"],
        APPROVED_ACTIVE: ["UNDER_REVIEW", "SUPERSEDED", "ARCHIVED"],
        SUPERSEDED: [],
        ARCHIVED: [],
      },
      approval: {
        entityType: "emergency_response_plan",
        fromStatus: "DRAFT",
        pendingStatus: "UNDER_REVIEW",
        approvedStatus: "APPROVED_ACTIVE",
        rejectedStatus: "DRAFT",
        context: "emergencyPlanSeverity",
      },
    },
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
    write: {
      statusColumn: "lifecycle_status",
      lifecycle: {
        ACTIVE: ["UNDER_MAINTENANCE", "STANDBY", "RETIRED"],
        UNDER_MAINTENANCE: ["ACTIVE", "STANDBY", "RETIRED"],
        STANDBY: ["ACTIVE", "UNDER_MAINTENANCE", "RETIRED"],
        RETIRED: ["DISPOSED"],
        DISPOSED: [],
      },
    },
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
    write: {
      statusColumn: "calibration_status",
      lifecycle: {
        ACTIVE: ["IN_CALIBRATION", "OUT_OF_SERVICE", "RETIRED"],
        IN_CALIBRATION: ["ACTIVE", "OUT_OF_SERVICE"],
        OUT_OF_SERVICE: ["ACTIVE", "RETIRED"],
        RETIRED: [],
      },
    },
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
    write: {
      statusColumn: "status",
      lifecycle: {
        REGISTERED: ["PREQUALIFIED", "INACTIVE"],
        PREQUALIFIED: ["ACTIVE", "SUSPENDED", "BLACKLISTED", "INACTIVE"],
        ACTIVE: ["SUSPENDED", "BLACKLISTED", "INACTIVE"],
        SUSPENDED: ["ACTIVE", "BLACKLISTED", "INACTIVE"],
        BLACKLISTED: ["INACTIVE"],
        INACTIVE: ["REGISTERED"],
      },
      approval: {
        entityType: "contractor",
        fromStatus: "REGISTERED",
        pendingStatus: "REGISTERED",
        approvedStatus: "PREQUALIFIED",
        rejectedStatus: "REGISTERED",
      },
    },
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

  // --- Dua modul PENGATURAN ---------------------------------------------
  //
  // Keduanya sengaja didaftarkan sebagai MODUL BIASA, bukan diberi rute dan
  // formulir sendiri. Registri modul sudah membawa seluruh yang dibutuhkan
  // keduanya: daftar, detail, formulir yang diturunkan dari skema, validasi
  // tipe dan panjang, penomoran, penghapusan lunak, dan penyaringnya. Menulis
  // ulang semua itu untuk dua tabel berarti dua jalur tulis yang harus dijaga
  // sejalan dengan lima belas jalur lainnya — dan yang dua itu pasti yang
  // paling jarang diperiksa.
  //
  // Yang membedakan keduanya dari modul lain hanya di mana ia muncul di
  // navigasi: di bawah "Pengaturan", bukan di bawah kelompok QHSE.
  {
    slug: "quality-objectives",
    // TIDAK ada `approval` dan TIDAK ada `lifecycle` persetujuan: mengubah
    // target sebuah KPI bukan peristiwa yang menuntut tanda tangan berjenjang
    // seperti izin kerja panas. Statusnya tetap ada dan tetap dijaga state
    // machine, tapi transisinya langsung.
    write: {
      statusColumn: "status",
      lifecycle: {
        DRAFT: ["ACTIVE"],
        ACTIVE: ["ACHIEVED", "AT_RISK", "NOT_ACHIEVED", "CANCELLED"],
        AT_RISK: ["ACTIVE", "ACHIEVED", "NOT_ACHIEVED", "CANCELLED"],
        ACHIEVED: ["ACTIVE"],
        NOT_ACHIEVED: ["ACTIVE"],
        CANCELLED: [],
      },
    },
    endpoint: "/quality-objectives",
    table: "quality_objectives",
    pk: "quality_objective_id",
    orderBy: "bsc_perspective NULLS LAST, objective_code ASC",
    children: [],
  },
  {
    slug: "hse-period-statistics",
    // Tanpa statusColumn sama sekali: statistik bulanan tidak punya siklus
    // hidup — ia terisi, lalu dikoreksi kalau salah. Memberinya status berarti
    // mengarang proses yang tidak ada.
    write: {},
    endpoint: "/hse-period-statistics",
    table: "hse_period_statistics",
    pk: "hse_period_statistic_id",
    orderBy: "period_month DESC",
    children: [],
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
