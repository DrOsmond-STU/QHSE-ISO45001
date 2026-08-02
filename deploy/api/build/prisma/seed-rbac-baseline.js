"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_CODES = exports.PERMISSION_MANAGE_CODE = exports.SUPER_ADMIN_PLATFORM_ROLE_CODE = void 0;
exports.seedRbacBaseline = seedRbacBaseline;
// Baseline RBAC PENUH (task 1.3, Modul 02) — 13 role sistem (Master PRD
// §8.2) + katalog permission literal Modul 01 §3 (module_code=ORG) dan
// Modul 02 §3 (module_code=USER_MGMT), diwire ke role sesuai tabel
// role/permission LITERAL masing-masing dokumen modul. Deliverable
// konkret di balik acceptance criterion TASK_INSTRUCTION.md 1.3 "Matriks
// RBAC Modul 02 lolos".
//
// Baseline task 0.8 (SATU role/permission, bukti model 5-tabel end-to-end)
// adalah SUBSET dari file ini — SUPER_ADMIN_PLATFORM_ROLE_CODE dan
// PERMISSION_MANAGE_CODE TETAP diekspor nilai yang SAMA (dikonsumsi
// test/rbac/test-helpers.ts, test/rbac/rls-nullable-tenant-scope, dst. —
// TIDAK boleh berubah), seedRbacBaseline(prisma) TETAP idempotent & bisa
// dipanggil dari test setup, bukan cuma CLI.
//
// Permission yang HANYA punya penjelasan ".*" di tabel role PRD (mis.
// "org.company.*") diekspansi jadi CREATE/READ/UPDATE/DELETE eksplisit —
// PRD sendiri sebut kosakata action baku itu (Modul 02 §5, kolom
// permissions.action: "CREATE,READ,UPDATE,DELETE,APPROVE,EXPORT,ASSIGN").
// Role yang TIDAK muncul di tabel §3 Modul 01/02 manapun (HSE_OFFICER,
// WORKER_EMPLOYEE, CONTRACTOR_USER, VISITOR_SELF_SERVICE,
// OCCUPATIONAL_HEALTH_STAFF) TETAP dibuat sbg baris roles (bagian roster
// baseline literal Master PRD §8.2, siap ditugaskan) tapi HANYA dapat
// permission "seluruh user terautentikasi" — permission spesifik peran
// itu menyusul modul yang benar-benar mendefinisikannya (Work Permit,
// Occupational Health, dst., Phase 2+, gap TDD §26).
//
// Jalankan CLI: pnpm --filter @qhse/api seed:rbac-baseline
require("dotenv/config");
const client_1 = require("@prisma/client");
exports.SUPER_ADMIN_PLATFORM_ROLE_CODE = "SUPER_ADMIN_PLATFORM";
// Modul 02 §3 — baris Super Admin Platform: "user_mgmt.permission.manage (katalog global)".
exports.PERMISSION_MANAGE_CODE = "user_mgmt.permission.manage";
exports.ROLE_CODES = {
    SUPER_ADMIN_PLATFORM: exports.SUPER_ADMIN_PLATFORM_ROLE_CODE,
    TENANT_ADMIN: "TENANT_ADMIN",
    COMPANY_ADMIN: "COMPANY_ADMIN",
    HSE_MANAGER: "HSE_MANAGER",
    HSE_OFFICER: "HSE_OFFICER",
    DEPARTMENT_HEAD: "DEPARTMENT_HEAD",
    SUPERVISOR: "SUPERVISOR",
    AUDITOR_INTERNAL: "AUDITOR_INTERNAL",
    AUDITOR_EXTERNAL: "AUDITOR_EXTERNAL",
    WORKER_EMPLOYEE: "WORKER_EMPLOYEE",
    CONTRACTOR_USER: "CONTRACTOR_USER",
    VISITOR_SELF_SERVICE: "VISITOR_SELF_SERVICE",
    OCCUPATIONAL_HEALTH_STAFF: "OCCUPATIONAL_HEALTH_STAFF",
    // Task 2.1 (Modul 03 DMS) — BEYOND Master PRD §8.2's roster literal (13
    // role). PRD Modul 03 §3 eksplisit: "Document Controller (role baru
    // khusus modul ini)" — bukan oversight, memang role BARU yang belum ada
    // sebelum modul ini.
    DOCUMENT_CONTROLLER: "DOCUMENT_CONTROLLER",
    // Task 2.2 (Modul 04 Regulatory & Compliance) — PRD §3 tabel literal
    // MENYEBUT "Compliance Officer (role baru modul ini, dapat berupa
    // sub-fungsi HSE Manager di tenant kecil)" — BEDA dari DOCUMENT_CONTROLLER
    // (2.1, PRD Modul 03 EKSPLISIT tegas "role baru"): PRD Modul 04 §13 Open
    // Question #4 SENDIRI eksplisit belum menjawab "apakah perlu role
    // terpisah". Diputuskan TETAP tambah sbg role baseline terpisah (matching
    // baris tabel §3 literal) — tenant kecil TETAP BISA cukup grant
    // permission compliance.* ke HSE_MANAGER-nya sendiri tanpa memakai role
    // ini sama sekali (RBAC tidak memaksa satu user = satu role), jadi
    // menambah role INI tidak menghilangkan fleksibilitas opsi "sub-fungsi".
    // Resolusi Open Question #4 didokumentasikan TDD §26.
    COMPLIANCE_OFFICER: "COMPLIANCE_OFFICER",
    // Task 5.1 (Modul 11 Quality Management) — PRD §3 literal tabel RBAC
    // menyebut KEDUA "Quality Manager/QA Head" DAN "QC Inspector" sbg baris
    // TERPISAH dgn permission set BEDA (bukan cuma "dapat dipetakan ke role
    // generik" spt Modul 04/09's "sub-fungsi HSE Manager" framing) — pola
    // sama DOCUMENT_CONTROLLER 2.1 ("role baru" eksplisit), BUKAN
    // COMPLIANCE_OFFICER 2.2 (yang PRD-nya sendiri ragu). "Supplier Quality
    // Engineer" & "Customer Service/Sales" (PRD §3, permission set SANGAT
    // sempit) TIDAK dapat role baseline sendiri — dipetakan QC_INSPECTOR &
    // WORKER_EMPLOYEE (kandidat plausible terdekat), gap TDD §26.
    QUALITY_MANAGER: "QUALITY_MANAGER",
    QC_INSPECTOR: "QC_INSPECTOR",
    // Task 5.2 (Modul 12 Environmental Management) — PRD §3 literal tabel RBAC
    // menyebut "Environmental Officer" DAN "TPS LB3 Officer/Waste Handler"
    // sbg baris TERPISAH dgn permission set BEDA — pola sama QUALITY_MANAGER/
    // QC_INSPECTOR (5.1)/DOCUMENT_CONTROLLER (2.1), role baru eksplisit.
    // "Site Supervisor" (§3) dipetakan role SUPERVISOR existing (bukan role
    // baru — "site" di sini konsisten scope SUPERVISOR yang sudah ada sejak
    // 0.8). "Top Management" (§3, "Scope company") dipetakan COMPANY_ADMIN,
    // pola SAMA persis literal "Approval Top Management" Audit 4.1's
    // AUDIT_PROGRAM stage 2 (bukan TENANT_ADMIN spt Incident 3.5 — beda modul
    // beda kata "scope" eksplisit di PRD-nya).
    ENVIRONMENTAL_OFFICER: "ENVIRONMENTAL_OFFICER",
    TPS_LB3_OFFICER: "TPS_LB3_OFFICER",
};
// Master PRD §8.2 — nama tampilan literal.
const SYSTEM_ROLES = [
    { roleCode: exports.ROLE_CODES.SUPER_ADMIN_PLATFORM, name: "Super Admin Platform", description: "Lintas seluruh tenant — provisioning tenant & katalog permission global." },
    { roleCode: exports.ROLE_CODES.TENANT_ADMIN, name: "Tenant Admin", description: "Administrasi penuh dalam satu tenant." },
    { roleCode: exports.ROLE_CODES.COMPANY_ADMIN, name: "Company Admin", description: "Administrasi terbatas pada company scope-nya." },
    { roleCode: exports.ROLE_CODES.HSE_MANAGER, name: "HSE Manager", description: "Manajerial HSE, scope site/branch." },
    { roleCode: exports.ROLE_CODES.HSE_OFFICER, name: "HSE Officer", description: "Operasional HSE, scope site." },
    { roleCode: exports.ROLE_CODES.DEPARTMENT_HEAD, name: "Department Head", description: "Kepala departemen, scope timnya." },
    { roleCode: exports.ROLE_CODES.SUPERVISOR, name: "Supervisor", description: "Supervisor lini, scope timnya." },
    { roleCode: exports.ROLE_CODES.AUDITOR_INTERNAL, name: "Auditor Internal", description: "Audit internal, read-only lintas scope yang ditugaskan." },
    { roleCode: exports.ROLE_CODES.AUDITOR_EXTERNAL, name: "Auditor Eksternal (Read-only)", description: "Auditor tamu eksternal, read-only tanpa export credential sensitif." },
    { roleCode: exports.ROLE_CODES.WORKER_EMPLOYEE, name: "Worker/Employee", description: "Karyawan operasional, self-service." },
    { roleCode: exports.ROLE_CODES.CONTRACTOR_USER, name: "Contractor User", description: "Pekerja kontraktor, akses terbatas proyek/site." },
    { roleCode: exports.ROLE_CODES.VISITOR_SELF_SERVICE, name: "Visitor (Self-service)", description: "Pengunjung, self-service terbatas." },
    { roleCode: exports.ROLE_CODES.OCCUPATIONAL_HEALTH_STAFF, name: "Occupational Health Staff", description: "Akses medical record terisolasi (Master PRD §8.4)." },
    { roleCode: exports.ROLE_CODES.DOCUMENT_CONTROLLER, name: "Document Controller", description: "Kelola siklus hidup dokumen terkontrol DMS (Modul 03 §3)." },
    { roleCode: exports.ROLE_CODES.COMPLIANCE_OFFICER, name: "Compliance Officer", description: "Kelola register regulasi & izin/lisensi (Modul 04 §3)." },
    { roleCode: exports.ROLE_CODES.QUALITY_MANAGER, name: "Quality Manager/QA Head", description: "Approval tertinggi modul mutu — disposisi NCR, komplain, deviasi inspeksi, evaluasi supplier, sasaran mutu (Modul 11 §3)." },
    { roleCode: exports.ROLE_CODES.QC_INSPECTOR, name: "QC Inspector", description: "Pencatatan NCR & inspeksi mutu operasional (Modul 11 §3)." },
    { roleCode: exports.ROLE_CODES.ENVIRONMENTAL_OFFICER, name: "Environmental Officer", description: "Kelola register aspek-dampak, pemantauan lingkungan, manifest limbah, self-assessment PROPER (Modul 12 §3)." },
    { roleCode: exports.ROLE_CODES.TPS_LB3_OFFICER, name: "TPS LB3 Officer/Waste Handler", description: "Logbook neraca limbah harian & pencatatan manifest di TPS (Modul 12 §3)." },
];
const CRUD = ["CREATE", "READ", "UPDATE", "DELETE"];
function crudPermissions(moduleCode, entity, groupName, descPrefix) {
    return CRUD.map((action) => ({
        code: `${moduleCode.toLowerCase()}.${entity}.${action.toLowerCase()}`,
        moduleCode,
        entity,
        action,
        groupName,
        description: `${descPrefix} — ${action}`,
    }));
}
// ── Modul 01 §3 (module_code=ORG) ───────────────────────────────────────
const ORG_STRUCTURE_GROUP = "Organization — Struktur";
const ORG_REFERENCE_GROUP = "Organization — Referensi";
const ORG_PERMISSIONS = [
    { code: "org.tenant.create", moduleCode: "ORG", entity: "tenant", action: "CREATE", groupName: ORG_STRUCTURE_GROUP, description: "Provisioning tenant baru" },
    { code: "org.tenant.read", moduleCode: "ORG", entity: "tenant", action: "READ", groupName: ORG_STRUCTURE_GROUP, description: "Lihat data tenant" },
    { code: "org.tenant.update", moduleCode: "ORG", entity: "tenant", action: "UPDATE", groupName: ORG_STRUCTURE_GROUP, description: "Ubah data tenant" },
    { code: "org.tenant.suspend", moduleCode: "ORG", entity: "tenant", action: "SUSPEND", groupName: ORG_STRUCTURE_GROUP, description: "Suspend tenant" },
    { code: "org.industry_template.manage", moduleCode: "ORG", entity: "industry_template", action: "MANAGE", groupName: ORG_REFERENCE_GROUP, description: "Kelola katalog template industri global" },
    ...crudPermissions("ORG", "company", ORG_STRUCTURE_GROUP, "Company"),
    ...crudPermissions("ORG", "branch", ORG_STRUCTURE_GROUP, "Branch"),
    ...crudPermissions("ORG", "site", ORG_STRUCTURE_GROUP, "Site"),
    ...crudPermissions("ORG", "department", ORG_STRUCTURE_GROUP, "Department"),
    ...crudPermissions("ORG", "cost_center", ORG_REFERENCE_GROUP, "Cost center"),
    ...crudPermissions("ORG", "location", ORG_REFERENCE_GROUP, "Location"),
    ...crudPermissions("ORG", "holiday_calendar", ORG_REFERENCE_GROUP, "Holiday calendar"),
    ...crudPermissions("ORG", "org_chart", ORG_STRUCTURE_GROUP, "Organization chart"),
];
const orgCodes = (entity, ...actions) => actions.map((a) => `org.${entity}.${a.toLowerCase()}`);
const orgCrud = (entity) => orgCodes(entity, ...CRUD);
// ── Modul 02 §3 (module_code=USER_MGMT) ─────────────────────────────────
const USER_MGMT_ADMIN_GROUP = "User Management — Administrasi";
const USER_MGMT_ACCESS_GROUP = "User Management — Akses & Sesi";
const USER_MGMT_PERMISSIONS = [
    { code: exports.PERMISSION_MANAGE_CODE, moduleCode: "USER_MGMT", entity: "permission", action: "MANAGE", groupName: USER_MGMT_ADMIN_GROUP, description: "Kelola katalog permission global (Super Admin Platform)" },
    { code: "user_mgmt.user.create", moduleCode: "USER_MGMT", entity: "user", action: "CREATE", groupName: USER_MGMT_ADMIN_GROUP, description: "Undang/buat user" },
    { code: "user_mgmt.user.read", moduleCode: "USER_MGMT", entity: "user", action: "READ", groupName: USER_MGMT_ADMIN_GROUP, description: "Lihat data user lain" },
    { code: "user_mgmt.user.update", moduleCode: "USER_MGMT", entity: "user", action: "UPDATE", groupName: USER_MGMT_ADMIN_GROUP, description: "Ubah data user lain" },
    { code: "user_mgmt.user.suspend", moduleCode: "USER_MGMT", entity: "user", action: "SUSPEND", groupName: USER_MGMT_ADMIN_GROUP, description: "Suspend/deaktivasi user" },
    { code: "user_mgmt.user.impersonate", moduleCode: "USER_MGMT", entity: "user", action: "IMPERSONATE", groupName: USER_MGMT_ADMIN_GROUP, description: "Impersonate user (Super Admin Platform, wajib tercatat ketat)" },
    { code: "user_mgmt.user.read_self", moduleCode: "USER_MGMT", entity: "user", action: "READ_SELF", groupName: USER_MGMT_ACCESS_GROUP, description: "Lihat profil sendiri" },
    { code: "user_mgmt.user.update_self", moduleCode: "USER_MGMT", entity: "user", action: "UPDATE_SELF", groupName: USER_MGMT_ACCESS_GROUP, description: "Ubah profil sendiri (field terbatas)" },
    ...crudPermissions("USER_MGMT", "role", USER_MGMT_ADMIN_GROUP, "Role"),
    { code: "user_mgmt.user_role.assign", moduleCode: "USER_MGMT", entity: "user_role", action: "ASSIGN", groupName: USER_MGMT_ADMIN_GROUP, description: "Tugaskan role+scope ke user" },
    { code: "user_mgmt.user_role.revoke", moduleCode: "USER_MGMT", entity: "user_role", action: "REVOKE", groupName: USER_MGMT_ADMIN_GROUP, description: "Cabut role dari user" },
    { code: "user_mgmt.user_role.read", moduleCode: "USER_MGMT", entity: "user_role", action: "READ", groupName: USER_MGMT_ADMIN_GROUP, description: "Lihat matriks penugasan role (laporan audit)" },
    { code: "user_mgmt.password_policy.manage", moduleCode: "USER_MGMT", entity: "password_policy", action: "MANAGE", groupName: USER_MGMT_ADMIN_GROUP, description: "Kelola kebijakan password tenant" },
    { code: "user_mgmt.sso_mapping.manage", moduleCode: "USER_MGMT", entity: "sso_mapping", action: "MANAGE", groupName: USER_MGMT_ADMIN_GROUP, description: "Kelola pemetaan SSO tenant" },
    { code: "user_mgmt.delegation.approve", moduleCode: "USER_MGMT", entity: "delegation", action: "APPROVE", groupName: USER_MGMT_ACCESS_GROUP, description: "Setujui delegasi wewenang (opsional per kebijakan tenant)" },
    { code: "user_mgmt.delegation.create", moduleCode: "USER_MGMT", entity: "delegation", action: "CREATE", groupName: USER_MGMT_ACCESS_GROUP, description: "Buatkan delegasi utk diri sendiri/bawahan langsung" },
    { code: "user_mgmt.delegation.create_self", moduleCode: "USER_MGMT", entity: "delegation", action: "CREATE_SELF", groupName: USER_MGMT_ACCESS_GROUP, description: "Ajukan delegasi wewenang sendiri" },
    { code: "user_mgmt.session.view_self", moduleCode: "USER_MGMT", entity: "session", action: "VIEW_SELF", groupName: USER_MGMT_ACCESS_GROUP, description: "Lihat riwayat sesi sendiri" },
    { code: "user_mgmt.session.revoke_self", moduleCode: "USER_MGMT", entity: "session", action: "REVOKE_SELF", groupName: USER_MGMT_ACCESS_GROUP, description: "Cabut sesi sendiri (logout perangkat lain)" },
];
// ── Modul 25 §3 (module_code=NOTIFICATION) — task 1.7 ───────────────────
// PRD literal: "Seluruh User" -> notification.preference.manage (milik
// sendiri), notification.read (milik sendiri) — keduanya self-scope,
// digabung ke AUTHENTICATED_USER_PERMISSIONS di bawah, bukan
// ROLE_PERMISSIONS per-role (tidak ada role yang PRD kecualikan).
const NOTIFICATION_ACCESS_GROUP = "Notification — Akses Sendiri";
const NOTIFICATION_PERMISSIONS = [
    { code: "notification.read", moduleCode: "NOTIFICATION", entity: "notification", action: "READ", groupName: NOTIFICATION_ACCESS_GROUP, description: "Lihat & tandai baca notifikasi milik sendiri" },
    { code: "notification.preference.manage", moduleCode: "NOTIFICATION", entity: "preference", action: "MANAGE", groupName: NOTIFICATION_ACCESS_GROUP, description: "Kelola preferensi kanal notifikasi milik sendiri" },
];
// ── Modul 03 §3 (module_code=DMS) — task 2.1 ────────────────────────────
// "Document Owner" di tabel PRD BUKAN role tetap (lihat ROLE_CODES) — itu
// documents.owner_user_id per-dokumen; dms.version.approve karena itu
// diberikan ke role yang PLAUSIBLE jadi owner (Department Head/HSE
// Manager/Company Admin, persis prosa PRD "biasanya Department Head/HSE
// Manager"), otorisasi SUNGGUHAN tetap ditegakkan WorkflowEngineService
// (task.assignedTo === actingUserId, 0.9) — permission ini gerbang
// KASAR "role apa saja yang BOLEH punya task approval", bukan "user mana
// yang assigned ke task INI".
const DMS_DOCUMENT_GROUP = "DMS — Dokumen & Versi";
const DMS_DISTRIBUTION_GROUP = "DMS — Distribusi & Pengakuan";
const DMS_PERMISSIONS = [
    { code: "dms.document.create", moduleCode: "DMS", entity: "document", action: "CREATE", groupName: DMS_DOCUMENT_GROUP, description: "Buat dokumen terkontrol baru" },
    { code: "dms.document.update", moduleCode: "DMS", entity: "document", action: "UPDATE", groupName: DMS_DOCUMENT_GROUP, description: "Ubah metadata dokumen" },
    { code: "dms.document.read", moduleCode: "DMS", entity: "document", action: "READ", groupName: DMS_DOCUMENT_GROUP, description: "Lihat dokumen PUBLISHED dalam scope" },
    { code: "dms.document.retire", moduleCode: "DMS", entity: "document", action: "RETIRE", groupName: DMS_DOCUMENT_GROUP, description: "Tarik dokumen (RETIRED)" },
    { code: "dms.document.publish", moduleCode: "DMS", entity: "document", action: "PUBLISH", groupName: DMS_DOCUMENT_GROUP, description: "Publikasikan versi (stage approval final)" },
    { code: "dms.document.export", moduleCode: "DMS", entity: "document", action: "EXPORT", groupName: DMS_DOCUMENT_GROUP, description: "Ekspor bukti dokumen (evidence audit)" },
    { code: "dms.version.create", moduleCode: "DMS", entity: "version", action: "CREATE", groupName: DMS_DOCUMENT_GROUP, description: "Upload versi dokumen baru" },
    { code: "dms.version.submit_for_approval", moduleCode: "DMS", entity: "version", action: "SUBMIT_FOR_APPROVAL", groupName: DMS_DOCUMENT_GROUP, description: "Ajukan versi utk approval" },
    { code: "dms.version.approve", moduleCode: "DMS", entity: "version", action: "APPROVE", groupName: DMS_DOCUMENT_GROUP, description: "Setujui/tolak versi pada stage approval" },
    { code: "dms.version.read_history", moduleCode: "DMS", entity: "version", action: "READ_HISTORY", groupName: DMS_DOCUMENT_GROUP, description: "Lihat riwayat lengkap seluruh versi (termasuk RETIRED)" },
    { code: "dms.category.manage", moduleCode: "DMS", entity: "category", action: "MANAGE", groupName: DMS_DOCUMENT_GROUP, description: "Kelola kategori dokumen" },
    { code: "dms.distribution.manage", moduleCode: "DMS", entity: "distribution", action: "MANAGE", groupName: DMS_DISTRIBUTION_GROUP, description: "Kelola target distribusi wajib-baca" },
    { code: "dms.acknowledgement.view_report", moduleCode: "DMS", entity: "acknowledgement", action: "VIEW_REPORT", groupName: DMS_DISTRIBUTION_GROUP, description: "Lihat laporan tingkat penyelesaian acknowledgement" },
    { code: "dms.acknowledgement.acknowledge", moduleCode: "DMS", entity: "acknowledgement", action: "ACKNOWLEDGE", groupName: DMS_DISTRIBUTION_GROUP, description: "Akui telah membaca dokumen milik sendiri" },
];
// ── Modul 04 §3 (module_code=COMPLIANCE) — task 2.2 ─────────────────────
// TIDAK ada baris "Seluruh user terautentikasi" di tabel PRD §3 modul ini
// (beda dari DMS/Notification) — TIDAK ADA yang ditambahkan ke
// AUTHENTICATED_USER_PERMISSIONS, sengaja. "Top Management" (baris PRD,
// read-only) TIDAK diberi role baseline baru (beda perlakuan dari
// Compliance Officer) — PRD §3 TIDAK menandainya "(role baru)" spt
// Compliance Officer, gap didokumentasikan TDD §26: tenant yang genuinely
// butuh persona read-only terpisah dari TENANT_ADMIN bisa membuat CUSTOM
// role (RoleService, 1.3) berisi permission compliance.*.read saja.
const COMPLIANCE_REGULATION_GROUP = "Compliance — Regulasi & Kewajiban";
const COMPLIANCE_EVALUATION_GROUP = "Compliance — Evaluasi";
const COMPLIANCE_LICENSE_GROUP = "Compliance — Izin & Lisensi";
const COMPLIANCE_PERMISSIONS = [
    { code: "compliance.regulation.create", moduleCode: "COMPLIANCE", entity: "regulation", action: "CREATE", groupName: COMPLIANCE_REGULATION_GROUP, description: "Tambah entri regulatory_register" },
    { code: "compliance.regulation.read", moduleCode: "COMPLIANCE", entity: "regulation", action: "READ", groupName: COMPLIANCE_REGULATION_GROUP, description: "Lihat regulatory_register" },
    { code: "compliance.regulation.update", moduleCode: "COMPLIANCE", entity: "regulation", action: "UPDATE", groupName: COMPLIANCE_REGULATION_GROUP, description: "Ubah entri regulatory_register" },
    { code: "compliance.regulation.retire", moduleCode: "COMPLIANCE", entity: "regulation", action: "RETIRE", groupName: COMPLIANCE_REGULATION_GROUP, description: "Tandai regulatory_register SUPERSEDED/REVOKED" },
    { code: "compliance.obligation.manage", moduleCode: "COMPLIANCE", entity: "obligation", action: "MANAGE", groupName: COMPLIANCE_REGULATION_GROUP, description: "Kelola compliance_obligations" },
    { code: "compliance.obligation.read", moduleCode: "COMPLIANCE", entity: "obligation", action: "READ", groupName: COMPLIANCE_REGULATION_GROUP, description: "Lihat compliance_obligations" },
    { code: "compliance.evaluation.create", moduleCode: "COMPLIANCE", entity: "evaluation", action: "CREATE", groupName: COMPLIANCE_EVALUATION_GROUP, description: "Buat/isi compliance_evaluations" },
    { code: "compliance.evaluation.submit", moduleCode: "COMPLIANCE", entity: "evaluation", action: "SUBMIT", groupName: COMPLIANCE_EVALUATION_GROUP, description: "Ajukan evaluasi utk review" },
    { code: "compliance.evaluation.review", moduleCode: "COMPLIANCE", entity: "evaluation", action: "REVIEW", groupName: COMPLIANCE_EVALUATION_GROUP, description: "Setujui/tolak evaluasi pada stage approval" },
    { code: "compliance.evaluation.read", moduleCode: "COMPLIANCE", entity: "evaluation", action: "READ", groupName: COMPLIANCE_EVALUATION_GROUP, description: "Lihat compliance_evaluations" },
    { code: "compliance.license.create", moduleCode: "COMPLIANCE", entity: "license", action: "CREATE", groupName: COMPLIANCE_LICENSE_GROUP, description: "Tambah licenses_permits" },
    { code: "compliance.license.update", moduleCode: "COMPLIANCE", entity: "license", action: "UPDATE", groupName: COMPLIANCE_LICENSE_GROUP, description: "Ubah licenses_permits" },
    { code: "compliance.license.renew", moduleCode: "COMPLIANCE", entity: "license", action: "RENEW", groupName: COMPLIANCE_LICENSE_GROUP, description: "Proses perpanjangan izin/lisensi" },
    { code: "compliance.license.read", moduleCode: "COMPLIANCE", entity: "license", action: "READ", groupName: COMPLIANCE_LICENSE_GROUP, description: "Lihat licenses_permits" },
    { code: "compliance.license.upload_evidence", moduleCode: "COMPLIANCE", entity: "license", action: "UPLOAD_EVIDENCE", groupName: COMPLIANCE_LICENSE_GROUP, description: "Unggah bukti pengajuan perpanjangan izin" },
];
// ── Modul 05 §3 (module_code=RISK) — task 3.1 ────────────────────────────
// HANYA permission utk cakupan task 3.1 (matriks risiko + hazard register)
// — risk.hira.*/risk.jsa.*/risk.hiradc.*/risk.corporate_risk.*/risk.treatment.*
// (PRD §3 baris lain) DITUNDA ke task 3.2 saat hira_assessments/jsa_records/
// hiradc_records/risk_register/risk_treatment_plans genuinely ada tabelnya
// — pola PERSIS 2.1/2.2 (permission SELALU seiring tabel/service yang
// sudah dibangun, tidak pernah mendahului). PRD §3 TIDAK memberi permission
// "read" terpisah utk hazard_register (beda dari compliance.*.read yang
// selalu ada) — "manage" dibaca mencakup baca (pola sama dms.category.manage
// 2.1, tidak ada dms.category.read terpisah).
const RISK_MATRIX_GROUP = "Risk — Matriks & Hazard Register";
const RISK_PERMISSIONS = [
    { code: "risk.matrix_config.manage", moduleCode: "RISK", entity: "matrix_config", action: "MANAGE", groupName: RISK_MATRIX_GROUP, description: "Kelola risk_matrix_configs (versi baru, aktifkan) — Tenant Admin dapat ubah matriks tanpa deploy kode" },
    { code: "risk.hazard.propose", moduleCode: "RISK", entity: "hazard", action: "PROPOSE", groupName: RISK_MATRIX_GROUP, description: "Usulkan entri hazard_register baru" },
    { code: "risk.hazard.manage", moduleCode: "RISK", entity: "hazard", action: "MANAGE", groupName: RISK_MATRIX_GROUP, description: "Kelola hazard_register (update/retire)" },
];
// ── Modul 05 §3 sisa (module_code=RISK) — task 3.2 ───────────────────────
// Melanjutkan RISK_PERMISSIONS 3.1 (matriks+hazard di atas) — katalog PENUH
// PRD §3 utk HIRA/JSA/HIRADC/risk korporat/treatment, seiring tabel yang
// task 3.2 bangun. TIDAK ada kode `.update` terpisah utk hira/jsa/hiradc
// (beda dari dms.document.create/update 2.1) — PRD §3 literal modul ini
// CUMA sebut create/submit/approve(+verify hiradc)/read, tidak menyebut
// update granular; `.create` dibaca mencakup edit lanjutan selama masih
// DRAFT (pola sama risk.hazard.manage 3.1 yang mencakup baca+tulis).
const RISK_HIRA_GROUP = "Risk — HIRA";
const RISK_JSA_GROUP = "Risk — JSA";
const RISK_HIRADC_GROUP = "Risk — HIRADC";
const RISK_CORPORATE_GROUP = "Risk — Risiko Korporat & Treatment";
const RISK_HIRA_JSA_HIRADC_PERMISSIONS = [
    { code: "risk.hira.create", moduleCode: "RISK", entity: "hira", action: "CREATE", groupName: RISK_HIRA_GROUP, description: "Buat/isi hira_assessments" },
    { code: "risk.hira.submit", moduleCode: "RISK", entity: "hira", action: "SUBMIT", groupName: RISK_HIRA_GROUP, description: "Ajukan HIRA utk review" },
    { code: "risk.hira.approve", moduleCode: "RISK", entity: "hira", action: "APPROVE", groupName: RISK_HIRA_GROUP, description: "Setujui/tolak HIRA pada stage approval" },
    { code: "risk.hira.read", moduleCode: "RISK", entity: "hira", action: "READ", groupName: RISK_HIRA_GROUP, description: "Lihat hira_assessments" },
    { code: "risk.jsa.create", moduleCode: "RISK", entity: "jsa", action: "CREATE", groupName: RISK_JSA_GROUP, description: "Buat/isi jsa_records" },
    { code: "risk.jsa.submit", moduleCode: "RISK", entity: "jsa", action: "SUBMIT", groupName: RISK_JSA_GROUP, description: "Ajukan JSA utk review" },
    { code: "risk.jsa.approve", moduleCode: "RISK", entity: "jsa", action: "APPROVE", groupName: RISK_JSA_GROUP, description: "Setujui/tolak JSA pada stage approval" },
    { code: "risk.jsa.read", moduleCode: "RISK", entity: "jsa", action: "READ", groupName: RISK_JSA_GROUP, description: "Lihat jsa_records" },
    { code: "risk.jsa.acknowledge", moduleCode: "RISK", entity: "jsa", action: "ACKNOWLEDGE", groupName: RISK_JSA_GROUP, description: "Sign-off jsa_crew_acknowledgements sebelum bekerja" },
    { code: "risk.hiradc.create", moduleCode: "RISK", entity: "hiradc", action: "CREATE", groupName: RISK_HIRADC_GROUP, description: "Buat/isi hiradc_records" },
    { code: "risk.hiradc.verify", moduleCode: "RISK", entity: "hiradc", action: "VERIFY", groupName: RISK_HIRADC_GROUP, description: "Verifikasi HIRADC (self-verify atau via approval ringan)" },
    { code: "risk.hiradc.approve", moduleCode: "RISK", entity: "hiradc", action: "APPROVE", groupName: RISK_HIRADC_GROUP, description: "Setujui HIRADC pada stage approval (kalau dikonfigurasi)" },
    { code: "risk.hiradc.read", moduleCode: "RISK", entity: "hiradc", action: "READ", groupName: RISK_HIRADC_GROUP, description: "Lihat hiradc_records" },
    { code: "risk.corporate_risk.create", moduleCode: "RISK", entity: "corporate_risk", action: "CREATE", groupName: RISK_CORPORATE_GROUP, description: "Buat risk_register (risiko korporat)" },
    { code: "risk.corporate_risk.update", moduleCode: "RISK", entity: "corporate_risk", action: "UPDATE", groupName: RISK_CORPORATE_GROUP, description: "Ubah risk_register" },
    { code: "risk.corporate_risk.approve", moduleCode: "RISK", entity: "corporate_risk", action: "APPROVE", groupName: RISK_CORPORATE_GROUP, description: "Approval eksplisit BR-06 (accept risiko EXTREME)" },
    { code: "risk.corporate_risk.read", moduleCode: "RISK", entity: "corporate_risk", action: "READ", groupName: RISK_CORPORATE_GROUP, description: "Lihat risk_register" },
    { code: "risk.treatment.manage", moduleCode: "RISK", entity: "treatment", action: "MANAGE", groupName: RISK_CORPORATE_GROUP, description: "Kelola risk_treatment_plans" },
];
// Task 3.3 (Modul 06 Work Permit Management, tipe & alur inti) —
// moduleCode="WORK_PERMIT" (BUKAN "RISK" — modul TERPISAH dari Modul 05,
// hanya mereferensikan related_jsa_id, TIDAK berbagi module_code
// EntitlementGuard). Task 3.4 (extension, closure & cross-link) melanjutkan
// katalog PENUH PRD §3 — work_permit.extension.*/work_permit.closure.*
// (SENGAJA ditunda 3.3, sekarang tabel work_permit_extensions/
// work_permit_closures genuinely ada) — pola PERSIS risk.hira.*/dst yang
// menunggu task 3.2 (bukan diseed lebih dulu task 3.1).
const WORK_PERMIT_TYPE_GROUP = "Work Permit — Konfigurasi Tipe";
const WORK_PERMIT_GROUP = "Work Permit — Permit";
const WORK_PERMIT_SAFETY_GROUP = "Work Permit — Verifikasi Keselamatan";
const WORK_PERMIT_EXTENSION_CLOSURE_GROUP = "Work Permit — Extension & Closure";
const WORK_PERMIT_PERMISSIONS = [
    { code: "work_permit.type.manage", moduleCode: "WORK_PERMIT", entity: "type", action: "MANAGE", groupName: WORK_PERMIT_TYPE_GROUP, description: "Konfigurasi work_permit_types & checklist per tenant" },
    { code: "work_permit.permit.create", moduleCode: "WORK_PERMIT", entity: "permit", action: "CREATE", groupName: WORK_PERMIT_GROUP, description: "Buat work_permits (DRAFT) & isi checklist bahaya" },
    { code: "work_permit.permit.update", moduleCode: "WORK_PERMIT", entity: "permit", action: "UPDATE", groupName: WORK_PERMIT_GROUP, description: "Ubah work_permits saat DRAFT" },
    { code: "work_permit.permit.submit", moduleCode: "WORK_PERMIT", entity: "permit", action: "SUBMIT", groupName: WORK_PERMIT_GROUP, description: "Ajukan permit utk approval" },
    { code: "work_permit.permit.approve_issuer", moduleCode: "WORK_PERMIT", entity: "permit", action: "APPROVE_ISSUER", groupName: WORK_PERMIT_GROUP, description: "Approval Stage 1 (Issuer/Area Authority)" },
    { code: "work_permit.permit.approve_hse", moduleCode: "WORK_PERMIT", entity: "permit", action: "APPROVE_HSE", groupName: WORK_PERMIT_GROUP, description: "Approval Stage 2 kondisional (HSE)" },
    { code: "work_permit.permit.cancel", moduleCode: "WORK_PERMIT", entity: "permit", action: "CANCEL", groupName: WORK_PERMIT_GROUP, description: "Batalkan permit" },
    { code: "work_permit.permit.read", moduleCode: "WORK_PERMIT", entity: "permit", action: "READ", groupName: WORK_PERMIT_GROUP, description: "Lihat work_permits" },
    { code: "work_permit.permit.export", moduleCode: "WORK_PERMIT", entity: "permit", action: "EXPORT", groupName: WORK_PERMIT_GROUP, description: "Ekspor bukti permit (evidence audit)" },
    { code: "work_permit.gas_test.record", moduleCode: "WORK_PERMIT", entity: "gas_test", action: "RECORD", groupName: WORK_PERMIT_SAFETY_GROUP, description: "Catat gas_test_results" },
    { code: "work_permit.loto.record", moduleCode: "WORK_PERMIT", entity: "loto", action: "RECORD", groupName: WORK_PERMIT_SAFETY_GROUP, description: "Catat isolation_loto_records (apply/verify/remove)" },
    { code: "work_permit.extension.request", moduleCode: "WORK_PERMIT", entity: "extension", action: "REQUEST", groupName: WORK_PERMIT_EXTENSION_CLOSURE_GROUP, description: "Ajukan work_permit_extensions (permit miliknya, status ACTIVE)" },
    { code: "work_permit.extension.approve", moduleCode: "WORK_PERMIT", entity: "extension", action: "APPROVE", groupName: WORK_PERMIT_EXTENSION_CLOSURE_GROUP, description: "Setujui/tolak work_permit_extensions (stage HSE, kondisional gas_retest_required)" },
    { code: "work_permit.closure.request", moduleCode: "WORK_PERMIT", entity: "closure", action: "REQUEST", groupName: WORK_PERMIT_EXTENSION_CLOSURE_GROUP, description: "Ajukan work_permit_closures (signoff Requester, permit miliknya status ACTIVE)" },
    { code: "work_permit.closure.verify", moduleCode: "WORK_PERMIT", entity: "closure", action: "VERIFY", groupName: WORK_PERMIT_EXTENSION_CLOSURE_GROUP, description: "Verifikasi/kembalikan work_permit_closures (Issuer/Area Authority)" },
];
// Task 3.5 (Modul 07 Incident Management) — 9th domain module. PRD §3 tidak
// menyebut role "Top Management" sbg "role baru khusus modul ini" (BEDA dari
// DOCUMENT_CONTROLLER/COMPLIANCE_OFFICER yang eksplisit demikian) — dipetakan
// ke TENANT_ADMIN (yang sudah dapat seluruh permission modul lain) alih-alih
// menambah role baseline baru, gap didokumentasikan TDD §26.
const INCIDENT_REPORT_GROUP = "Incident — Pelaporan";
const INCIDENT_INVESTIGATION_GROUP = "Incident — Investigasi";
const INCIDENT_FOLLOWUP_GROUP = "Incident — Tindak Lanjut & Pelaporan Regulator";
const INCIDENT_STATISTICS_GROUP = "Incident — Statistik";
const INCIDENT_PERMISSIONS = [
    { code: "incident.report.create", moduleCode: "INCIDENT", entity: "report", action: "CREATE", groupName: INCIDENT_REPORT_GROUP, description: "Buat incident_reports (pelaporan awal, siapa pun)" },
    { code: "incident.report.read", moduleCode: "INCIDENT", entity: "report", action: "READ", groupName: INCIDENT_REPORT_GROUP, description: "Lihat incident_reports" },
    { code: "incident.report.update", moduleCode: "INCIDENT", entity: "report", action: "UPDATE", groupName: INCIDENT_REPORT_GROUP, description: "Ubah incident_reports (verifikasi awal Supervisor / field medis terbatas Occupational Health Staff)" },
    { code: "incident.report.classify", moduleCode: "INCIDENT", entity: "report", action: "CLASSIFY", groupName: INCIDENT_REPORT_GROUP, description: "Finalisasi classification (BR-02, beda dari initial_classification)" },
    { code: "incident.report.close", moduleCode: "INCIDENT", entity: "report", action: "CLOSE", groupName: INCIDENT_REPORT_GROUP, description: "Tutup incident_reports (BR-01/BR-09 gate)" },
    { code: "incident.report.export", moduleCode: "INCIDENT", entity: "report", action: "EXPORT", groupName: INCIDENT_REPORT_GROUP, description: "Ekspor bukti laporan (evidence audit)" },
    { code: "incident.investigation.create", moduleCode: "INCIDENT", entity: "investigation", action: "CREATE", groupName: INCIDENT_INVESTIGATION_GROUP, description: "Buat incident_investigations (pilih metode 5-Why/Fishbone/Bowtie)" },
    { code: "incident.investigation.assign_team", moduleCode: "INCIDENT", entity: "investigation", action: "ASSIGN_TEAM", groupName: INCIDENT_INVESTIGATION_GROUP, description: "Tugaskan incident_investigation_team" },
    { code: "incident.investigation.approve", moduleCode: "INCIDENT", entity: "investigation", action: "APPROVE", groupName: INCIDENT_INVESTIGATION_GROUP, description: "Setujui/kembalikan laporan investigasi via Workflow Engine" },
    { code: "incident.root_cause.record", moduleCode: "INCIDENT", entity: "root_cause", action: "RECORD", groupName: INCIDENT_INVESTIGATION_GROUP, description: "Catat incident_root_causes" },
    { code: "incident.witness.record", moduleCode: "INCIDENT", entity: "witness", action: "RECORD", groupName: INCIDENT_INVESTIGATION_GROUP, description: "Catat incident_witness_statements" },
    { code: "incident.corrective_action.link", moduleCode: "INCIDENT", entity: "corrective_action", action: "LINK", groupName: INCIDENT_FOLLOWUP_GROUP, description: "Tautkan incident_corrective_actions ke CAPA (link/cache saja, BR-08)" },
    { code: "incident.regulatory_report.submit", moduleCode: "INCIDENT", entity: "regulatory_report", action: "SUBMIT", groupName: INCIDENT_FOLLOWUP_GROUP, description: "Catat status kirim incident_regulatory_reports" },
    { code: "incident.statistics.view", moduleCode: "INCIDENT", entity: "statistics", action: "VIEW", groupName: INCIDENT_STATISTICS_GROUP, description: "Lihat incident_statistics_cache (LTIFR/TRIR/Severity Rate)" },
];
// Task 3.6 (Modul 08 Inspection Management) — 10th domain module.
const INSPECTION_CONFIG_GROUP = "Inspection — Konfigurasi Tipe & Template";
const INSPECTION_SCHEDULE_GROUP = "Inspection — Penjadwalan";
const INSPECTION_RECORD_GROUP = "Inspection — Pelaksanaan & Hasil";
const INSPECTION_FINDING_GROUP = "Inspection — Temuan";
const INSPECTION_PERMISSIONS = [
    { code: "inspection.type.manage", moduleCode: "INSPECTION", entity: "type", action: "MANAGE", groupName: INSPECTION_CONFIG_GROUP, description: "Konfigurasi inspection_types per tenant" },
    { code: "inspection.template.manage", moduleCode: "INSPECTION", entity: "template", action: "MANAGE", groupName: INSPECTION_CONFIG_GROUP, description: "Kelola inspection_checklist_templates + item (versi baru per perubahan, BR-07)" },
    { code: "inspection.schedule.create", moduleCode: "INSPECTION", entity: "schedule", action: "CREATE", groupName: INSPECTION_SCHEDULE_GROUP, description: "Buat inspection_schedules" },
    { code: "inspection.schedule.assign", moduleCode: "INSPECTION", entity: "schedule", action: "ASSIGN", groupName: INSPECTION_SCHEDULE_GROUP, description: "Tetapkan default_assigned_inspector_id" },
    { code: "inspection.record.create", moduleCode: "INSPECTION", entity: "record", action: "CREATE", groupName: INSPECTION_RECORD_GROUP, description: "Laksanakan+catat inspection_records (inspeksi yang ditugaskan)" },
    { code: "inspection.record.read", moduleCode: "INSPECTION", entity: "record", action: "READ", groupName: INSPECTION_RECORD_GROUP, description: "Lihat inspection_records" },
    { code: "inspection.score.view", moduleCode: "INSPECTION", entity: "score", action: "VIEW", groupName: INSPECTION_RECORD_GROUP, description: "Lihat inspection_scores (breakdown kategori)" },
    { code: "inspection.record.export", moduleCode: "INSPECTION", entity: "record", action: "EXPORT", groupName: INSPECTION_RECORD_GROUP, description: "Ekspor bukti inspeksi (evidence audit)" },
    { code: "inspection.finding.create", moduleCode: "INSPECTION", entity: "finding", action: "CREATE", groupName: INSPECTION_FINDING_GROUP, description: "Catat inspection_findings" },
    { code: "inspection.finding.read", moduleCode: "INSPECTION", entity: "finding", action: "READ", groupName: INSPECTION_FINDING_GROUP, description: "Lihat inspection_findings" },
];
// Task 3.7 (Modul 14 Emergency Response) — 11th domain module. PRD §3
// literal HANYA 14 kode; Auditor Internal/Eksternal ditulis prosa sbg
// wildcard "emergency_response.*.view" — TIDAK bisa direpresentasikan
// permission_code literal (RBAC Engine 0.8 cocok EXACT string, tanpa
// wildcard matching) — diresolusi jadi 5 kode `.read` KONKRET beyond
// literal PRD (pola sama precedent modul lain melengkapi CRUD read yang
// tersirat tapi tidak dieja PRD, mis. inspection.record.read 3.6), sekaligus
// dipakai HSE_MANAGER/HSE_OFFICER utk kebutuhan baca operasional sehari-hari
// yang PRD sendiri tidak eja eksplisit (tabel §3 hanya berisi kata kerja
// aksi, bukan daftar CRUD lengkap).
const EMERGENCY_CONFIG_GROUP = "Emergency Response — Konfigurasi & Dashboard";
const EMERGENCY_PLAN_GROUP = "Emergency Response — Rencana Tanggap Darurat";
const EMERGENCY_TEAM_GROUP = "Emergency Response — Tim (ERT)";
const EMERGENCY_DRILL_GROUP = "Emergency Response — Drill/Simulasi";
const EMERGENCY_ACTIVATION_GROUP = "Emergency Response — Aktivasi & Muster Check-in";
const EMERGENCY_EQUIPMENT_GROUP = "Emergency Response — Kesiapan Peralatan";
const EMERGENCY_RESPONSE_PERMISSIONS = [
    { code: "emergency_response.contact.configure", moduleCode: "EMERGENCY_RESPONSE", entity: "contact", action: "CONFIGURE", groupName: EMERGENCY_CONFIG_GROUP, description: "Kelola emergency_contacts (direktori internal/eksternal)" },
    { code: "emergency_response.numbering.configure", moduleCode: "EMERGENCY_RESPONSE", entity: "numbering", action: "CONFIGURE", groupName: EMERGENCY_CONFIG_GROUP, description: "Konfigurasi numbering_configs EMERGENCY_PLAN/EMERGENCY_DRILL tenant-wide" },
    { code: "emergency_response.dashboard.view", moduleCode: "EMERGENCY_RESPONSE", entity: "dashboard", action: "VIEW", groupName: EMERGENCY_CONFIG_GROUP, description: "Lihat dashboard kesiapan tanggap darurat (read-only, scope company)" },
    { code: "emergency_response.plan.create", moduleCode: "EMERGENCY_RESPONSE", entity: "plan", action: "CREATE", groupName: EMERGENCY_PLAN_GROUP, description: "Susun emergency_response_plans + plan_steps (draft)" },
    { code: "emergency_response.plan.approve", moduleCode: "EMERGENCY_RESPONSE", entity: "plan", action: "APPROVE", groupName: EMERGENCY_PLAN_GROUP, description: "Review/approve emergency_response_plans (Workflow Engine EMERGENCY_PLAN)" },
    { code: "emergency_response.plan.read", moduleCode: "EMERGENCY_RESPONSE", entity: "plan", action: "READ", groupName: EMERGENCY_PLAN_GROUP, description: "Lihat emergency_response_plans" },
    { code: "emergency_response.team.manage", moduleCode: "EMERGENCY_RESPONSE", entity: "team", action: "MANAGE", groupName: EMERGENCY_TEAM_GROUP, description: "Bentuk emergency_response_teams + tugaskan anggota (BR-03)" },
    { code: "emergency_response.team.view_own", moduleCode: "EMERGENCY_RESPONSE", entity: "team", action: "VIEW_OWN", groupName: EMERGENCY_TEAM_GROUP, description: "Lihat keanggotaan tim sendiri (anggota ERT)" },
    { code: "emergency_response.team.read", moduleCode: "EMERGENCY_RESPONSE", entity: "team", action: "READ", groupName: EMERGENCY_TEAM_GROUP, description: "Lihat seluruh emergency_response_teams (audit)" },
    { code: "emergency_response.drill.schedule", moduleCode: "EMERGENCY_RESPONSE", entity: "drill", action: "SCHEDULE", groupName: EMERGENCY_DRILL_GROUP, description: "Jadwalkan emergency_drills" },
    { code: "emergency_response.drill.conduct", moduleCode: "EMERGENCY_RESPONSE", entity: "drill", action: "CONDUCT", groupName: EMERGENCY_DRILL_GROUP, description: "Laksanakan+catat hasil drill (participation_logs, gaps)" },
    { code: "emergency_response.drill.approve_completion", moduleCode: "EMERGENCY_RESPONSE", entity: "drill", action: "APPROVE_COMPLETION", groupName: EMERGENCY_DRILL_GROUP, description: "Setujui status emergency_drills=COMPLETED (BR-08 gate)" },
    { code: "emergency_response.drill.view_own_participation", moduleCode: "EMERGENCY_RESPONSE", entity: "drill", action: "VIEW_OWN_PARTICIPATION", groupName: EMERGENCY_DRILL_GROUP, description: "Lihat partisipasi drill sendiri" },
    { code: "emergency_response.drill.read", moduleCode: "EMERGENCY_RESPONSE", entity: "drill", action: "READ", groupName: EMERGENCY_DRILL_GROUP, description: "Lihat seluruh emergency_drills (audit)" },
    { code: "emergency_response.activation.declare", moduleCode: "EMERGENCY_RESPONSE", entity: "activation", action: "DECLARE", groupName: EMERGENCY_ACTIVATION_GROUP, description: "Deklarasikan emergency_activations (PRD: khusus Incident Commander — TIDAK ditegakkan RBAC maupun service layer, granularitas per-ert_role, gap TDD §26)" },
    { code: "emergency_response.activation.read", moduleCode: "EMERGENCY_RESPONSE", entity: "activation", action: "READ", groupName: EMERGENCY_ACTIVATION_GROUP, description: "Lihat emergency_activations + progress muster check-in" },
    { code: "emergency_response.muster_checkin.self_submit", moduleCode: "EMERGENCY_RESPONSE", entity: "muster_checkin", action: "SELF_SUBMIT", groupName: EMERGENCY_ACTIVATION_GROUP, description: "Self check-in muster_point_checkins (drill maupun kejadian nyata)" },
    { code: "emergency_response.readiness_checklist.manage", moduleCode: "EMERGENCY_RESPONSE", entity: "readiness_checklist", action: "MANAGE", groupName: EMERGENCY_EQUIPMENT_GROUP, description: "Catat emergency_equipment_readiness_checklist (BR-06)" },
    { code: "emergency_response.readiness_checklist.read", moduleCode: "EMERGENCY_RESPONSE", entity: "readiness_checklist", action: "READ", groupName: EMERGENCY_EQUIPMENT_GROUP, description: "Lihat emergency_equipment_readiness_checklist (audit)" },
];
// Task 4.1 (Modul 09 Audit Management) — 12 dari 15 kode PRD §3 literal;
// prosa baris "Auditee (Department Head) | membaca temuan miliknya, memberi
// auditee_response" TIDAK punya kode literal — diresolusi jadi
// audit.finding.read + audit.finding.auditee_response (pola sama
// `.read`-invented Emergency Response 3.7). +6 kode `.read` lain BEYOND
// literal (program/checklist/finding/auditor_competency/report) demi
// kebutuhan baca operasional yang PRD sendiri tidak eja eksplisit (pola
// sama seluruh modul sebelumnya).
//
// CATATAN PENTING (resolusi tabrakan nama) — PRD §3 modul ini menyebut
// aktor "Auditor Internal" & "Lead Auditor" utk permission OPERASIONAL
// (audit.audit.conduct, audit.finding.create/classify, audit.report.generate)
// — TAPI role platform ROLE_CODES.AUDITOR_INTERNAL/AUDITOR_EXTERNAL SUDAH
// established SELALU read-only lintas 6 modul sebelumnya (lihat blok
// ROLE_PERMISSIONS keduanya: HANYA kode .read/.export, tanpa kecuali sejak
// Modul 05). Role platform itu merepresentasikan persona GOVERNANCE-STYLE
// internal-control audit (mengaudit/mereview KEPATUHAN lintas SELURUH
// modul lain, read-only) — BEDA dari "Auditor Internal"/"Lead Auditor"
// Modul 09 yang PRAKTISI QHSE MENJALANKAN audit ISO itu sendiri (operasional).
// Demi konsistensi platform, AUDITOR_INTERNAL/AUDITOR_EXTERNAL TETAP
// read-only DI SINI JUGA (audit.audit.read+export saja, baris §3 "Auditor
// Eksternal (Guest)"/"Auditor Internal/Eksternal" yang MEMANG literal
// read-only) — permission OPERASIONAL dipetakan ke HSE_MANAGER+HSE_OFFICER
// (kandidat plausible Lead Auditor/Auditor-Internal-QHSE-sungguhan, pola
// sama "kandidat plausible" Emergency Response 3.7 §3 "Anggota ERT").
const AUDIT_PROGRAM_GROUP = "Audit Management — Program Audit Tahunan";
const AUDIT_CONFIG_GROUP = "Audit Management — Konfigurasi (Tipe & Checklist)";
const AUDIT_EXECUTION_GROUP = "Audit Management — Pelaksanaan Audit";
const AUDIT_FINDING_GROUP = "Audit Management — Temuan (Findings)";
const AUDIT_COMPETENCY_GROUP = "Audit Management — Kompetensi Auditor";
const AUDIT_REPORT_GROUP = "Audit Management — Laporan Audit";
const AUDIT_PERMISSIONS = [
    { code: "audit.program.create", moduleCode: "AUDIT", entity: "program", action: "CREATE", groupName: AUDIT_PROGRAM_GROUP, description: "Susun audit_programs + plan_items (draft)" },
    { code: "audit.program.approve", moduleCode: "AUDIT", entity: "program", action: "APPROVE", groupName: AUDIT_PROGRAM_GROUP, description: "Review/approve audit_programs (Workflow Engine audit_program)" },
    { code: "audit.program.read", moduleCode: "AUDIT", entity: "program", action: "READ", groupName: AUDIT_PROGRAM_GROUP, description: "Lihat audit_programs + plan_items" },
    { code: "audit.type.manage", moduleCode: "AUDIT", entity: "type", action: "MANAGE", groupName: AUDIT_CONFIG_GROUP, description: "Konfigurasi audit_types per tenant" },
    { code: "audit.checklist.manage", moduleCode: "AUDIT", entity: "checklist", action: "MANAGE", groupName: AUDIT_CONFIG_GROUP, description: "Kelola audit_checklists + item" },
    { code: "audit.checklist.read", moduleCode: "AUDIT", entity: "checklist", action: "READ", groupName: AUDIT_CONFIG_GROUP, description: "Lihat audit_checklists + item" },
    { code: "audit.audit.schedule", moduleCode: "AUDIT", entity: "audit", action: "SCHEDULE", groupName: AUDIT_EXECUTION_GROUP, description: "Buat instance audits dari plan_item / ad-hoc" },
    { code: "audit.audit.assign_team", moduleCode: "AUDIT", entity: "audit", action: "ASSIGN_TEAM", groupName: AUDIT_EXECUTION_GROUP, description: "Tetapkan audit_team_members + audit_auditee_scopes" },
    { code: "audit.audit.conduct", moduleCode: "AUDIT", entity: "audit", action: "CONDUCT", groupName: AUDIT_EXECUTION_GROUP, description: "Laksanakan audit (opening/closing meeting, checklist)" },
    { code: "audit.audit.read", moduleCode: "AUDIT", entity: "audit", action: "READ", groupName: AUDIT_EXECUTION_GROUP, description: "Lihat audits" },
    { code: "audit.audit.export", moduleCode: "AUDIT", entity: "audit", action: "EXPORT", groupName: AUDIT_EXECUTION_GROUP, description: "Ekspor bukti audit (evidence)" },
    { code: "audit.audit.close", moduleCode: "AUDIT", entity: "audit", action: "CLOSE", groupName: AUDIT_EXECUTION_GROUP, description: "Tutup audits (BR-02/03 gate)" },
    { code: "audit.finding.create", moduleCode: "AUDIT", entity: "finding", action: "CREATE", groupName: AUDIT_FINDING_GROUP, description: "Catat audit_findings" },
    { code: "audit.finding.classify", moduleCode: "AUDIT", entity: "finding", action: "CLASSIFY", groupName: AUDIT_FINDING_GROUP, description: "Klasifikasikan/ubah classification audit_findings (BR-05)" },
    { code: "audit.finding.read", moduleCode: "AUDIT", entity: "finding", action: "READ", groupName: AUDIT_FINDING_GROUP, description: "Lihat audit_findings" },
    { code: "audit.finding.auditee_response", moduleCode: "AUDIT", entity: "finding", action: "RESPOND", groupName: AUDIT_FINDING_GROUP, description: "Isi auditee_response pada audit_findings miliknya (scope 'miliknya' service-level)" },
    { code: "audit.auditor_competency.manage", moduleCode: "AUDIT", entity: "auditor_competency", action: "MANAGE", groupName: AUDIT_COMPETENCY_GROUP, description: "Kelola auditor_competency_records" },
    { code: "audit.auditor_competency.read", moduleCode: "AUDIT", entity: "auditor_competency", action: "READ", groupName: AUDIT_COMPETENCY_GROUP, description: "Lihat auditor_competency_records (matriks kompetensi)" },
    { code: "audit.report.generate", moduleCode: "AUDIT", entity: "report", action: "GENERATE", groupName: AUDIT_REPORT_GROUP, description: "Susun audit_reports" },
    { code: "audit.report.approve", moduleCode: "AUDIT", entity: "report", action: "APPROVE", groupName: AUDIT_REPORT_GROUP, description: "Review/approve audit_reports (Workflow Engine audit_report)" },
    { code: "audit.report.read", moduleCode: "AUDIT", entity: "report", action: "READ", groupName: AUDIT_REPORT_GROUP, description: "Lihat audit_reports" },
];
// Task 4.2 (Modul 10 CAPA Management) — 11 kode PRD §3 literal, TANPA kode
// beyond-literal (semua kebutuhan baca operasional SUDAH tercakup
// capa.register.read literal). "CAPA Owner/PIC" TIDAK py role tetap
// (ditugaskan PER-CAPA via capa_action_plans.pic_user_id) — §1 sendiri
// bilang "biasanya HSE Officer/Department Head unit terdampak", dipetakan
// ke HSE_MANAGER+HSE_OFFICER+DEPARTMENT_HEAD (kandidat plausible, pola
// sama "Lead Auditor" Audit 4.1). "Effectiveness Verifier (berbeda dari
// PIC)" JUGA tanpa role tetap — dipetakan ke HSE_MANAGER+DEPARTMENT_HEAD
// (kandidat plausible verifier BEDA dari kandidat PIC HSE_OFFICER,
// pemisahan aktual ditegakkan BR-03 service-level, BUKAN RBAC granularity).
const CAPA_REGISTER_GROUP = "CAPA Management — Register (Hub Polymorphic)";
const CAPA_ROOT_CAUSE_GROUP = "CAPA Management — Root Cause Analysis";
const CAPA_ACTION_PLAN_GROUP = "CAPA Management — Action Plan";
const CAPA_APPROVAL_GROUP = "CAPA Management — Approval & Effectiveness Verification";
const CAPA_PERMISSIONS = [
    { code: "capa.register.create", moduleCode: "CAPA", entity: "register", action: "CREATE", groupName: CAPA_REGISTER_GROUP, description: "Buat capa_register (trigger otomatis modul sumber atau inisiatif manual)" },
    { code: "capa.register.read", moduleCode: "CAPA", entity: "register", action: "READ", groupName: CAPA_REGISTER_GROUP, description: "Lihat capa_register" },
    { code: "capa.register.update", moduleCode: "CAPA", entity: "register", action: "UPDATE", groupName: CAPA_REGISTER_GROUP, description: "Ubah capa_register yang jadi tanggung jawabnya (PIC)" },
    { code: "capa.register.close", moduleCode: "CAPA", entity: "register", action: "CLOSE", groupName: CAPA_REGISTER_GROUP, description: "Tutup capa_register (BR-01, wajib EFFECTIVE)" },
    { code: "capa.register.reopen", moduleCode: "CAPA", entity: "register", action: "REOPEN", groupName: CAPA_REGISTER_GROUP, description: "Buka ulang capa_register (BR-04, NOT_EFFECTIVE_REOPENED)" },
    { code: "capa.register.export", moduleCode: "CAPA", entity: "register", action: "EXPORT", groupName: CAPA_REGISTER_GROUP, description: "Ekspor capa_register" },
    { code: "capa.root_cause.record", moduleCode: "CAPA", entity: "root_cause", action: "RECORD", groupName: CAPA_ROOT_CAUSE_GROUP, description: "Catat capa_root_cause_analysis (5-Why/Fishbone/Fault Tree)" },
    { code: "capa.action_plan.define", moduleCode: "CAPA", entity: "action_plan", action: "DEFINE", groupName: CAPA_ACTION_PLAN_GROUP, description: "Definisikan capa_action_plans (what/why/who/when)" },
    { code: "capa.action_plan.link_action_tracking", moduleCode: "CAPA", entity: "action_plan", action: "LINK_ACTION_TRACKING", groupName: CAPA_ACTION_PLAN_GROUP, description: "Tautkan action_tracking_id ke registri Modul 24 (BR-08)" },
    { code: "capa.approval.approve", moduleCode: "CAPA", entity: "approval", action: "APPROVE", groupName: CAPA_APPROVAL_GROUP, description: "Setujui capa_action_plans (Workflow Engine capa_action_plan)" },
    { code: "capa.effectiveness.verify", moduleCode: "CAPA", entity: "effectiveness", action: "VERIFY", groupName: CAPA_APPROVAL_GROUP, description: "Verifikasi efektivitas CAPA (BR-03, wajib beda dari PIC)" },
];
// Task 5.1 (Modul 11 Quality Management) — PRD §3 tabel RBAC pakai style
// WILDCARD utk 2 baris ("quality.*.export" HSE Manager, "quality.*.view"
// Auditor) — DIEKSPANSI jadi kode konkret per-entity (pola sama seluruh
// modul lain, katalog permission TIDAK PERNAH literal wildcard di
// permissions table). "view_all"/"view_department" HANYA literal utk
// ncr & inspection (2 baris PRD) — diperluas KONSISTEN ke complaint/
// supplier_evaluation/objective demi katalog seragam (gap TDD §26).
const QUALITY_NCR_GROUP = "Quality Management — NCR";
const QUALITY_COMPLAINT_GROUP = "Quality Management — Customer Complaint";
const QUALITY_INSPECTION_GROUP = "Quality Management — Inspection";
const QUALITY_SUPPLIER_GROUP = "Quality Management — Supplier Evaluation";
const QUALITY_OBJECTIVE_GROUP = "Quality Management — Objective";
const QUALITY_PERMISSIONS = [
    { code: "quality.ncr.create", moduleCode: "QUALITY", entity: "ncr", action: "CREATE", groupName: QUALITY_NCR_GROUP, description: "Catat ncr_records baru (deteksi NC produk/proses)" },
    { code: "quality.ncr.view_department", moduleCode: "QUALITY", entity: "ncr", action: "VIEW_DEPARTMENT", groupName: QUALITY_NCR_GROUP, description: "Lihat ncr_records scope departemennya" },
    { code: "quality.ncr.view_all", moduleCode: "QUALITY", entity: "ncr", action: "VIEW_ALL", groupName: QUALITY_NCR_GROUP, description: "Lihat seluruh ncr_records tenant/scope oversight" },
    { code: "quality.ncr.approve_disposition", moduleCode: "QUALITY", entity: "ncr", action: "APPROVE_DISPOSITION", groupName: QUALITY_NCR_GROUP, description: "Setujui disposisi NCR (Use As Is/Rework/Repair/Scrap/dst)" },
    { code: "quality.ncr.export", moduleCode: "QUALITY", entity: "ncr", action: "EXPORT", groupName: QUALITY_NCR_GROUP, description: "Ekspor ncr_records" },
    { code: "quality.complaint.create", moduleCode: "QUALITY", entity: "complaint", action: "CREATE", groupName: QUALITY_COMPLAINT_GROUP, description: "Catat customer_complaints baru" },
    { code: "quality.complaint.manage", moduleCode: "QUALITY", entity: "complaint", action: "MANAGE", groupName: QUALITY_COMPLAINT_GROUP, description: "Investigasi/update/resolusi customer_complaints" },
    { code: "quality.complaint.view_all", moduleCode: "QUALITY", entity: "complaint", action: "VIEW_ALL", groupName: QUALITY_COMPLAINT_GROUP, description: "Lihat seluruh customer_complaints tenant/scope oversight" },
    { code: "quality.complaint.export", moduleCode: "QUALITY", entity: "complaint", action: "EXPORT", groupName: QUALITY_COMPLAINT_GROUP, description: "Ekspor customer_complaints" },
    { code: "quality.inspection.create", moduleCode: "QUALITY", entity: "inspection", action: "CREATE", groupName: QUALITY_INSPECTION_GROUP, description: "Buat quality_inspections + parameter" },
    { code: "quality.inspection.submit", moduleCode: "QUALITY", entity: "inspection", action: "SUBMIT", groupName: QUALITY_INSPECTION_GROUP, description: "Submit hasil quality_inspections" },
    { code: "quality.inspection.view_department", moduleCode: "QUALITY", entity: "inspection", action: "VIEW_DEPARTMENT", groupName: QUALITY_INSPECTION_GROUP, description: "Lihat quality_inspections scope departemennya" },
    { code: "quality.inspection.view_all", moduleCode: "QUALITY", entity: "inspection", action: "VIEW_ALL", groupName: QUALITY_INSPECTION_GROUP, description: "Lihat seluruh quality_inspections tenant/scope oversight" },
    { code: "quality.inspection.approve_deviation", moduleCode: "QUALITY", entity: "inspection", action: "APPROVE_DEVIATION", groupName: QUALITY_INSPECTION_GROUP, description: "Setujui deviasi USE_AS_IS_DEVIATION (workflow QUALITY_INSPECTION_DEVIATION)" },
    { code: "quality.inspection.export", moduleCode: "QUALITY", entity: "inspection", action: "EXPORT", groupName: QUALITY_INSPECTION_GROUP, description: "Ekspor quality_inspections" },
    { code: "quality.supplier_evaluation.create", moduleCode: "QUALITY", entity: "supplier_evaluation", action: "CREATE", groupName: QUALITY_SUPPLIER_GROUP, description: "Susun supplier_quality_records draft" },
    { code: "quality.supplier_evaluation.submit", moduleCode: "QUALITY", entity: "supplier_evaluation", action: "SUBMIT", groupName: QUALITY_SUPPLIER_GROUP, description: "Submit supplier_quality_records utk approval" },
    { code: "quality.supplier_evaluation.approve", moduleCode: "QUALITY", entity: "supplier_evaluation", action: "APPROVE", groupName: QUALITY_SUPPLIER_GROUP, description: "Setujui & publish rating supplier_quality_records" },
    { code: "quality.supplier_evaluation.view_all", moduleCode: "QUALITY", entity: "supplier_evaluation", action: "VIEW_ALL", groupName: QUALITY_SUPPLIER_GROUP, description: "Lihat seluruh supplier_quality_records" },
    { code: "quality.supplier_evaluation.export", moduleCode: "QUALITY", entity: "supplier_evaluation", action: "EXPORT", groupName: QUALITY_SUPPLIER_GROUP, description: "Ekspor supplier_quality_records" },
    { code: "quality.objective.manage", moduleCode: "QUALITY", entity: "objective", action: "MANAGE", groupName: QUALITY_OBJECTIVE_GROUP, description: "Tetapkan/update quality_objectives + catat progress log" },
    { code: "quality.objective.view_all", moduleCode: "QUALITY", entity: "objective", action: "VIEW_ALL", groupName: QUALITY_OBJECTIVE_GROUP, description: "Lihat seluruh quality_objectives tenant" },
    { code: "quality.objective.configure", moduleCode: "QUALITY", entity: "objective", action: "CONFIGURE", groupName: QUALITY_OBJECTIVE_GROUP, description: "Konfigurasi tenant-wide quality_objectives (mis. at_risk_threshold_percentage default)" },
    { code: "quality.numbering.configure", moduleCode: "QUALITY", entity: "numbering", action: "CONFIGURE", groupName: QUALITY_OBJECTIVE_GROUP, description: "Konfigurasi numbering_configs modul mutu (NCR/CC/QI)" },
];
// Task 5.2 (Modul 12 Environmental Management) — PRD §3 tabel RBAC pakai
// style WILDCARD utk 2 baris ("environmental.*.export" HSE Manager,
// "environmental.*.view" Auditor) — DIEKSPANSI jadi kode konkret per-entity
// (pola sama Quality 5.1). "view_all" HANYA literal utk monitoring (1
// baris PRD) — diperluas KONSISTEN ke aspect_impact/waste_manifest/
// waste_generation_log demi katalog seragam (pola sama gap Quality 5.1).
// `environmental.permit.manage` TIDAK ADA baris §3 literal SAMA SEKALI utk
// `environmental_permits` (tabel ekstensi 1:1 licenses_permits) — diinvent
// dipetakan HSE_MANAGER (operasional plausible), gap TDD §26.
const ENV_ASPECT_GROUP = "Environmental Management — Aspect & Impact";
const ENV_MONITORING_GROUP = "Environmental Management — Monitoring";
const ENV_WASTE_GROUP = "Environmental Management — Waste Manifest & Generation Log";
const ENV_PROPER_GROUP = "Environmental Management — PROPER Self-Assessment";
const ENV_CONFIG_GROUP = "Environmental Management — Configuration & Permit";
const ENVIRONMENTAL_PERMISSIONS = [
    { code: "environmental.aspect_impact.create", moduleCode: "ENVIRONMENTAL", entity: "aspect_impact", action: "CREATE", groupName: ENV_ASPECT_GROUP, description: "Catat environmental_aspects_impacts baru + significance scoring" },
    { code: "environmental.aspect_impact.view_department", moduleCode: "ENVIRONMENTAL", entity: "aspect_impact", action: "VIEW_DEPARTMENT", groupName: ENV_ASPECT_GROUP, description: "Lihat environmental_aspects_impacts scope departemennya" },
    { code: "environmental.aspect_impact.view_all", moduleCode: "ENVIRONMENTAL", entity: "aspect_impact", action: "VIEW_ALL", groupName: ENV_ASPECT_GROUP, description: "Lihat seluruh environmental_aspects_impacts tenant/scope oversight" },
    { code: "environmental.aspect_impact.approve", moduleCode: "ENVIRONMENTAL", entity: "aspect_impact", action: "APPROVE", groupName: ENV_ASPECT_GROUP, description: "Setujui environmental_aspects_impacts (workflow ENV_ASPECT_REVIEW)" },
    { code: "environmental.aspect_impact.export", moduleCode: "ENVIRONMENTAL", entity: "aspect_impact", action: "EXPORT", groupName: ENV_ASPECT_GROUP, description: "Ekspor environmental_aspects_impacts" },
    { code: "environmental.monitoring.create", moduleCode: "ENVIRONMENTAL", entity: "monitoring", action: "CREATE", groupName: ENV_MONITORING_GROUP, description: "Catat environmental_monitoring_records + hitung compliance_status" },
    { code: "environmental.monitoring.view_all", moduleCode: "ENVIRONMENTAL", entity: "monitoring", action: "VIEW_ALL", groupName: ENV_MONITORING_GROUP, description: "Lihat seluruh environmental_monitoring_records tenant/scope oversight" },
    { code: "environmental.monitoring.export", moduleCode: "ENVIRONMENTAL", entity: "monitoring", action: "EXPORT", groupName: ENV_MONITORING_GROUP, description: "Ekspor environmental_monitoring_records" },
    { code: "environmental.waste_manifest.manage", moduleCode: "ENVIRONMENTAL", entity: "waste_manifest", action: "MANAGE", groupName: ENV_WASTE_GROUP, description: "Kelola penuh waste_manifest_records (draft s.d. completed)" },
    { code: "environmental.waste_manifest.create", moduleCode: "ENVIRONMENTAL", entity: "waste_manifest", action: "CREATE", groupName: ENV_WASTE_GROUP, description: "Catat waste_manifest_records baru (scope TPS)" },
    { code: "environmental.waste_manifest.view_all", moduleCode: "ENVIRONMENTAL", entity: "waste_manifest", action: "VIEW_ALL", groupName: ENV_WASTE_GROUP, description: "Lihat seluruh waste_manifest_records tenant/scope oversight" },
    { code: "environmental.waste_manifest.export", moduleCode: "ENVIRONMENTAL", entity: "waste_manifest", action: "EXPORT", groupName: ENV_WASTE_GROUP, description: "Ekspor waste_manifest_records" },
    { code: "environmental.waste_generation_log.create", moduleCode: "ENVIRONMENTAL", entity: "waste_generation_log", action: "CREATE", groupName: ENV_WASTE_GROUP, description: "Catat waste_generation_log harian per titik TPS" },
    { code: "environmental.waste_generation_log.view_all", moduleCode: "ENVIRONMENTAL", entity: "waste_generation_log", action: "VIEW_ALL", groupName: ENV_WASTE_GROUP, description: "Lihat seluruh waste_generation_log tenant/scope oversight" },
    { code: "environmental.proper_assessment.create", moduleCode: "ENVIRONMENTAL", entity: "proper_assessment", action: "CREATE", groupName: ENV_PROPER_GROUP, description: "Susun proper_self_assessment + criteria_scores draft" },
    { code: "environmental.proper_assessment.approve", moduleCode: "ENVIRONMENTAL", entity: "proper_assessment", action: "APPROVE", groupName: ENV_PROPER_GROUP, description: "Setujui proper_self_assessment (workflow ENV_PROPER_ASSESSMENT)" },
    { code: "environmental.proper_assessment.view", moduleCode: "ENVIRONMENTAL", entity: "proper_assessment", action: "VIEW", groupName: ENV_PROPER_GROUP, description: "Lihat proper_self_assessment (oversight Top Management)" },
    { code: "environmental.proper_assessment.export", moduleCode: "ENVIRONMENTAL", entity: "proper_assessment", action: "EXPORT", groupName: ENV_PROPER_GROUP, description: "Ekspor proper_self_assessment" },
    { code: "environmental.baku_mutu.configure", moduleCode: "ENVIRONMENTAL", entity: "baku_mutu", action: "CONFIGURE", groupName: ENV_CONFIG_GROUP, description: "Konfigurasi baku mutu default per parameter (tenant-wide)" },
    { code: "environmental.numbering.configure", moduleCode: "ENVIRONMENTAL", entity: "numbering", action: "CONFIGURE", groupName: ENV_CONFIG_GROUP, description: "Konfigurasi numbering_configs modul lingkungan (EA/EM/WM)" },
    { code: "environmental.permit.manage", moduleCode: "ENVIRONMENTAL", entity: "permit", action: "MANAGE", groupName: ENV_CONFIG_GROUP, description: "Kelola environmental_permits (ekstensi 1:1 licenses_permits, BR-05)" },
    { code: "environmental.dashboard.view", moduleCode: "ENVIRONMENTAL", entity: "dashboard", action: "VIEW", groupName: ENV_CONFIG_GROUP, description: "Lihat dashboard KPI lingkungan (compliance rate, neraca limbah, prediksi PROPER)" },
];
// Task 5.3 (Modul 13 Occupational Health) — PRD §3.2 tabel LITERAL (BEDA
// dari kebanyakan modul lain sesi ini: TIDAK ada wildcard ".*" yang perlu
// diekspansi, kolom "Permission" PRD sudah menulis kode konkret satu-satu).
// `occupational_health.medical_record.export` (BR-09) SENGAJA TIDAK
// dipetakan ke role MANAPUN di bawah — PRD eksplisit "defaultnya tidak
// diberikan ke role manapun kecuali dikonfigurasi eksplisit oleh Tenant
// Admin dengan justifikasi" (beda dari pola biasa "role tanpa baris §3 =
// gap", ini MEMANG kosong dgn sengaja, BUKAN oversight).
// "DPO/Compliance Officer" (PRD §3.2) dipetakan ke role COMPLIANCE_OFFICER
// YANG SUDAH ADA (task 2.2, Modul 04) — bukan role baru — PRD sendiri
// menulis label gabungan "DPO/Compliance Officer" persis spt "HSE
// Manager/QHSE Head"/"Auditor Internal/Eksternal" di modul lain (SATU
// slot role, dua kemungkinan gelar), bukan indikasi butuh role terpisah.
const OH_PHI_GROUP = "Occupational Health — Rekam Medis (PHI)";
const OH_CLINICAL_GROUP = "Occupational Health — MCU, Fit-to-Work, PAK, Klinik & Surveilans";
const OH_SUMMARY_GROUP = "Occupational Health — Ringkasan Non-Klinis & Agregat";
const OH_COMPLIANCE_GROUP = "Occupational Health — Kepatuhan UU PDP & Otorisasi";
const OCCUPATIONAL_HEALTH_PERMISSIONS = [
    { code: "occupational_health.medical_record.read_phi", moduleCode: "OCCUPATIONAL_HEALTH", entity: "medical_record", action: "READ_PHI", groupName: OH_PHI_GROUP, description: "Baca medical_records/mcu_results/dll mentah — WAJIB lolos dual-gate BR-02 (permission INI + whitelist occupational_health_authorized_users AKTIF)" },
    { code: "occupational_health.medical_record.write", moduleCode: "OCCUPATIONAL_HEALTH", entity: "medical_record", action: "WRITE", groupName: OH_PHI_GROUP, description: "Tulis/update medical_records — dual-gate BR-02 sama" },
    { code: "occupational_health.medical_record.export", moduleCode: "OCCUPATIONAL_HEALTH", entity: "medical_record", action: "EXPORT", groupName: OH_PHI_GROUP, description: "BR-09 — ekspor PDF/Excel data occupational health, DEFAULT TIDAK diberikan ke role manapun" },
    { code: "occupational_health.mcu.schedule", moduleCode: "OCCUPATIONAL_HEALTH", entity: "mcu", action: "SCHEDULE", groupName: OH_CLINICAL_GROUP, description: "Buat/kelola mcu_schedules" },
    { code: "occupational_health.mcu.enter_result", moduleCode: "OCCUPATIONAL_HEALTH", entity: "mcu", action: "ENTER_RESULT", groupName: OH_CLINICAL_GROUP, description: "Isi mcu_results (kolom klinis [ENCRYPTED])" },
    { code: "occupational_health.fit_to_work.assess", moduleCode: "OCCUPATIONAL_HEALTH", entity: "fit_to_work", action: "ASSESS", groupName: OH_CLINICAL_GROUP, description: "Tetapkan fit_to_work_assessments.fit_status (otoritas tunggal dokter/paramedis, §4.2)" },
    { code: "occupational_health.pak_case.manage", moduleCode: "OCCUPATIONAL_HEALTH", entity: "pak_case", action: "MANAGE", groupName: OH_CLINICAL_GROUP, description: "Kelola occupational_disease_cases (workflow OH_PAK_CASE)" },
    { code: "occupational_health.clinic_visit.manage", moduleCode: "OCCUPATIONAL_HEALTH", entity: "clinic_visit", action: "MANAGE", groupName: OH_CLINICAL_GROUP, description: "Kelola clinic_visit_logs" },
    { code: "occupational_health.surveillance_program.manage", moduleCode: "OCCUPATIONAL_HEALTH", entity: "surveillance_program", action: "MANAGE", groupName: OH_CLINICAL_GROUP, description: "Kelola health_surveillance_programs + enrollments" },
    { code: "occupational_health.aggregate_report.view", moduleCode: "OCCUPATIONAL_HEALTH", entity: "aggregate_report", action: "VIEW", groupName: OH_SUMMARY_GROUP, description: "BR-03 — lihat HANYA view/materialized view agregat non-identifiable (TIDAK PERNAH employee_user_id/nama individu)" },
    { code: "occupational_health.fit_to_work.view_summary", moduleCode: "OCCUPATIONAL_HEALTH", entity: "fit_to_work", action: "VIEW_SUMMARY", groupName: OH_SUMMARY_GROUP, description: "BR-04 — lihat HANYA restriction_summary_for_supervisor (boundary field, bukan restriction_details)" },
    { code: "occupational_health.restricted_duty.view", moduleCode: "OCCUPATIONAL_HEALTH", entity: "restricted_duty", action: "VIEW", groupName: OH_SUMMARY_GROUP, description: "Lihat restricted_duty_assignments (alternative_task_description, non-klinis)" },
    { code: "occupational_health.own_record.view", moduleCode: "OCCUPATIONAL_HEALTH", entity: "own_record", action: "VIEW", groupName: OH_SUMMARY_GROUP, description: "Self-service — lihat data milik sendiri saja" },
    { code: "occupational_health.subject_request.submit", moduleCode: "OCCUPATIONAL_HEALTH", entity: "subject_request", action: "SUBMIT", groupName: OH_COMPLIANCE_GROUP, description: "Ajukan health_data_subject_requests (akses/koreksi/hapus, UU PDP)" },
    { code: "occupational_health.subject_request.handle", moduleCode: "OCCUPATIONAL_HEALTH", entity: "subject_request", action: "HANDLE", groupName: OH_COMPLIANCE_GROUP, description: "Proses health_data_subject_requests (BR-06 anonymization, dsb.)" },
    { code: "occupational_health.authorized_user.manage", moduleCode: "OCCUPATIONAL_HEALTH", entity: "authorized_user", action: "MANAGE", groupName: OH_COMPLIANCE_GROUP, description: "Kelola whitelist occupational_health_authorized_users (BR-02 dual-gate bagian b)" },
    { code: "occupational_health.consent.configure", moduleCode: "OCCUPATIONAL_HEALTH", entity: "consent", action: "CONFIGURE", groupName: OH_COMPLIANCE_GROUP, description: "Konfigurasi health_data_consents" },
    { code: "occupational_health.access_log.view", moduleCode: "OCCUPATIONAL_HEALTH", entity: "access_log", action: "VIEW", groupName: OH_COMPLIANCE_GROUP, description: "Lihat medical_record_access_logs (read-only, pengawasan kepatuhan) — akses ini sendiri tercatat sbg entri log" },
];
// Modul 15 (task 6.1, Phase 6 dimulai) — TIDAK ada kepekaan PHI/data pribadi
// spesifik spt Modul 13, jadi TIDAK ada pola dual-gate/split-enforcement di
// sini — katalog standar biasa spt modul Phase 1-5 sebelum Occupational Health.
const ASSET_CATEGORY_GROUP = "Asset & Equipment — Kategori & Konfigurasi";
const ASSET_CORE_GROUP = "Asset & Equipment — Register Aset";
const ASSET_MAINTENANCE_GROUP = "Asset & Equipment — Pemeliharaan";
const ASSET_REPORTING_GROUP = "Asset & Equipment — Pelaporan & Kerusakan";
const ASSET_EQUIPMENT_PERMISSIONS = [
    { code: "asset.category.manage", moduleCode: "ASSET_EQUIPMENT", entity: "category", action: "MANAGE", groupName: ASSET_CATEGORY_GROUP, description: "Kelola asset_categories (hierarki, default_is_safety_critical, requires_disposal_approval)" },
    { code: "asset.asset.manage", moduleCode: "ASSET_EQUIPMENT", entity: "asset", action: "MANAGE", groupName: ASSET_CORE_GROUP, description: "Kelola assets penuh (semua aksi) — PRD §3 literal Tenant Admin" },
    { code: "asset.asset.create", moduleCode: "ASSET_EQUIPMENT", entity: "asset", action: "CREATE", groupName: ASSET_CORE_GROUP, description: "Daftarkan aset baru (BR-02 — is_safety_critical=true memicu notifikasi review HSE Manager)" },
    { code: "asset.asset.update", moduleCode: "ASSET_EQUIPMENT", entity: "asset", action: "UPDATE", groupName: ASSET_CORE_GROUP, description: "Ubah data aset termasuk transfer/disposal (BR-03 gate Workflow Engine terpisah utk disposal berkategori requires_disposal_approval)" },
    { code: "asset.asset.read", moduleCode: "ASSET_EQUIPMENT", entity: "asset", action: "READ", groupName: ASSET_CORE_GROUP, description: "Lihat register aset" },
    { code: "asset.safety_critical.flag", moduleCode: "ASSET_EQUIPMENT", entity: "safety_critical", action: "FLAG", groupName: ASSET_CORE_GROUP, description: "Review is_safety_critical (BR-02 — penerima notifikasi review saat false->true)" },
    { code: "asset.maintenance.record", moduleCode: "ASSET_EQUIPMENT", entity: "maintenance", action: "RECORD", groupName: ASSET_MAINTENANCE_GROUP, description: "Input maintenance_records + kelola maintenance_schedules (BR-01/BR-04)" },
    { code: "asset.maintenance.read", moduleCode: "ASSET_EQUIPMENT", entity: "maintenance", action: "READ", groupName: ASSET_MAINTENANCE_GROUP, description: "Lihat riwayat/jadwal maintenance (read-only)" },
    { code: "asset.issue.report", moduleCode: "ASSET_EQUIPMENT", entity: "issue", action: "REPORT", groupName: ASSET_REPORTING_GROUP, description: "Lapor kerusakan aset — PRD §4 memicu Action Tracking (Modul 24, BELUM ADA task-nya — permission disediakan, wiring ditunda, gap TDD §26)" },
    { code: "asset.report.export", moduleCode: "ASSET_EQUIPMENT", entity: "report", action: "EXPORT", groupName: ASSET_REPORTING_GROUP, description: "Ekspor laporan aset (kepatuhan maintenance on-time, distribusi per kategori/site, dsb.)" },
];
// Modul 16 (task 6.2) — katalog 12 kode literal PRD §3 DIPERLUAS 3 kode
// BEYOND (provider.manage, certificate.read, oot.read) krn baris §3 "Tenant
// Admin | calibration.* (semua)" & "Auditor Internal/Eksternal |
// calibration.*.read" SENDIRI berupa WILDCARD pattern (bukan daftar
// eksplisit spt baris role lain) — interpretasi wildcard yang KONSISTEN
// butuh katalog genuinely lengkap per-entity (item/provider/schedule/
// certificate/oot), pola sama modul lain yang selalu punya kode `.read`
// per entity signifikan. TIDAK ADA role §3 literal yang eksplisit dikasih
// CRUD calibration_providers (hanya TERSIRAT lewat wildcard Tenant Admin) —
// provider.manage HANYA digrant TENANT_ADMIN, gap TDD §26.
const CALIBRATION_ITEM_GROUP = "Calibration — Item & Parameter Pengukuran";
const CALIBRATION_PROVIDER_GROUP = "Calibration — Provider/Lab";
const CALIBRATION_SCHEDULE_GROUP = "Calibration — Jadwal";
const CALIBRATION_CERTIFICATE_GROUP = "Calibration — Sertifikat & Review";
const CALIBRATION_OOT_GROUP = "Calibration — Out-of-Tolerance";
const CALIBRATION_REPORTING_GROUP = "Calibration — Pelaporan";
const CALIBRATION_PERMISSIONS = [
    { code: "calibration.item.create", moduleCode: "CALIBRATION", entity: "item", action: "CREATE", groupName: CALIBRATION_ITEM_GROUP, description: "Tandai aset Modul 15 sbg calibration_items + parameter pengukuran" },
    { code: "calibration.item.update", moduleCode: "CALIBRATION", entity: "item", action: "UPDATE", groupName: CALIBRATION_ITEM_GROUP, description: "Ubah parameter/interval/status calibration_items" },
    { code: "calibration.item.read", moduleCode: "CALIBRATION", entity: "item", action: "READ", groupName: CALIBRATION_ITEM_GROUP, description: "Lihat status kalibrasi item" },
    { code: "calibration.provider.manage", moduleCode: "CALIBRATION", entity: "provider", action: "MANAGE", groupName: CALIBRATION_PROVIDER_GROUP, description: "Kelola calibration_providers (internal/eksternal, akreditasi) — TIDAK ADA baris §3 literal eksplisit, gap TDD §26" },
    { code: "calibration.schedule.manage", moduleCode: "CALIBRATION", entity: "schedule", action: "MANAGE", groupName: CALIBRATION_SCHEDULE_GROUP, description: "Kelola calibration_schedules (jadwal, provider assignment)" },
    { code: "calibration.schedule.read", moduleCode: "CALIBRATION", entity: "schedule", action: "READ", groupName: CALIBRATION_SCHEDULE_GROUP, description: "Lihat jadwal kalibrasi" },
    { code: "calibration.certificate.create", moduleCode: "CALIBRATION", entity: "certificate", action: "CREATE", groupName: CALIBRATION_CERTIFICATE_GROUP, description: "Catat hasil kalibrasi (BR-03 next_due_date server-computed, BR-04 auto-OOT saat FAIL)" },
    { code: "calibration.certificate.upload", moduleCode: "CALIBRATION", entity: "certificate", action: "UPLOAD", groupName: CALIBRATION_CERTIFICATE_GROUP, description: "Unggah dokumen sertifikat (attachments entity_type=calibration_certificate)" },
    { code: "calibration.certificate.review", moduleCode: "CALIBRATION", entity: "certificate", action: "REVIEW", groupName: CALIBRATION_CERTIFICATE_GROUP, description: "Review sertifikat (Workflow Engine 1-stage §4.1 poin 6, BR-05 gate akreditasi)" },
    { code: "calibration.certificate.approve", moduleCode: "CALIBRATION", entity: "certificate", action: "APPROVE", groupName: CALIBRATION_CERTIFICATE_GROUP, description: "Approval review sertifikat" },
    { code: "calibration.certificate.read", moduleCode: "CALIBRATION", entity: "certificate", action: "READ", groupName: CALIBRATION_CERTIFICATE_GROUP, description: "Lihat sertifikat kalibrasi (BEYOND literal §3, lihat banner comment blok ini)" },
    { code: "calibration.oot.manage", moduleCode: "CALIBRATION", entity: "oot", action: "MANAGE", groupName: CALIBRATION_OOT_GROUP, description: "Kelola out_of_tolerance_records (penilaian dampak, BR-06/BR-07 gate)" },
    { code: "calibration.oot.approve", moduleCode: "CALIBRATION", entity: "oot", action: "APPROVE", groupName: CALIBRATION_OOT_GROUP, description: "Approval penutupan out_of_tolerance_records (§4.2 poin 4)" },
    { code: "calibration.oot.read", moduleCode: "CALIBRATION", entity: "oot", action: "READ", groupName: CALIBRATION_OOT_GROUP, description: "Lihat out_of_tolerance_records (BEYOND literal §3, lihat banner comment blok ini)" },
    { code: "calibration.report.export", moduleCode: "CALIBRATION", entity: "report", action: "EXPORT", groupName: CALIBRATION_REPORTING_GROUP, description: "Ekspor laporan kepatuhan kalibrasi (% on-time, tren OOT, dsb.)" },
];
// Modul 17 (task 6.3) — katalog 16 kode literal PRD §3 DIPERLUAS 4 kode
// BEYOND (contractor.read, prequalification.read, document.read,
// evaluation.read) krn baris §3 "Tenant Admin | contractor.* (semua)" &
// "Auditor Internal/Eksternal | contractor.*.read" SENDIRI berupa WILDCARD
// pattern — pola PERSIS Calibration 6.2/Environmental 5.2. TANPA kode-kode
// ini, wildcard Auditor HANYA resolve ke assignment.read+worker.read (2
// baris §3 literal yang genuinely `.read`), gap TDD §26.
// contractor_document_compliance TIDAK PUNYA baris §3 RBAC literal
// terpisah dari contractor_prequalification_documents — KEDUANYA dipetakan
// entity "document" yang sama (§3 tidak memisahkan dokumen prakualifikasi
// vs dokumen kepatuhan berkelanjutan jadi RBAC entity berbeda), gap TDD §26.
const CONTRACTOR_CONTRACTOR_GROUP = "Contractor — Master Data";
const CONTRACTOR_PREQUALIFICATION_GROUP = "Contractor — Prakualifikasi";
const CONTRACTOR_DOCUMENT_GROUP = "Contractor — Dokumen (Prakualifikasi & Kepatuhan)";
const CONTRACTOR_WORKER_GROUP = "Contractor — Roster Pekerja";
const CONTRACTOR_ASSIGNMENT_GROUP = "Contractor — Penugasan Proyek";
const CONTRACTOR_EVALUATION_GROUP = "Contractor — Evaluasi Kinerja K3";
const CONTRACTOR_STATUS_GROUP = "Contractor — Status Kontraktor";
const CONTRACTOR_REPORTING_GROUP = "Contractor — Pelaporan";
const CONTRACTOR_PERMISSIONS = [
    { code: "contractor.contractor.create", moduleCode: "CONTRACTOR", entity: "contractor", action: "CREATE", groupName: CONTRACTOR_CONTRACTOR_GROUP, description: "Registrasi perusahaan kontraktor baru (§4.1 poin 1)" },
    { code: "contractor.contractor.update", moduleCode: "CONTRACTOR", entity: "contractor", action: "UPDATE", groupName: CONTRACTOR_CONTRACTOR_GROUP, description: "Ubah data master kontraktor" },
    { code: "contractor.contractor.read", moduleCode: "CONTRACTOR", entity: "contractor", action: "READ", groupName: CONTRACTOR_CONTRACTOR_GROUP, description: "Lihat data kontraktor (BEYOND literal §3, lihat banner comment blok ini)" },
    { code: "contractor.prequalification.submit", moduleCode: "CONTRACTOR", entity: "prequalification", action: "SUBMIT", groupName: CONTRACTOR_PREQUALIFICATION_GROUP, description: "Ajukan prakualifikasi (self-service Contractor User, §4.1 poin 2)" },
    { code: "contractor.prequalification.review", moduleCode: "CONTRACTOR", entity: "prequalification", action: "REVIEW", groupName: CONTRACTOR_PREQUALIFICATION_GROUP, description: "Review prakualifikasi (Workflow Engine stage 1, §4.1 poin 4)" },
    { code: "contractor.prequalification.approve", moduleCode: "CONTRACTOR", entity: "prequalification", action: "APPROVE", groupName: CONTRACTOR_PREQUALIFICATION_GROUP, description: "Approval prakualifikasi (Workflow Engine stage 2)" },
    { code: "contractor.prequalification.read", moduleCode: "CONTRACTOR", entity: "prequalification", action: "READ", groupName: CONTRACTOR_PREQUALIFICATION_GROUP, description: "Lihat riwayat prakualifikasi (BEYOND literal §3, lihat banner comment blok ini)" },
    { code: "contractor.document.upload", moduleCode: "CONTRACTOR", entity: "document", action: "UPLOAD", groupName: CONTRACTOR_DOCUMENT_GROUP, description: "Unggah dokumen milik kontraktornya sendiri (prakualifikasi & kepatuhan berkelanjutan)" },
    { code: "contractor.document.verify", moduleCode: "CONTRACTOR", entity: "document", action: "VERIFY", groupName: CONTRACTOR_DOCUMENT_GROUP, description: "Verifikasi dokumen wajib (§4.1 poin 3, §4.2 poin 1)" },
    { code: "contractor.document.read", moduleCode: "CONTRACTOR", entity: "document", action: "READ", groupName: CONTRACTOR_DOCUMENT_GROUP, description: "Lihat status dokumen (BEYOND literal §3, lihat banner comment blok ini)" },
    { code: "contractor.worker.submit", moduleCode: "CONTRACTOR", entity: "worker", action: "SUBMIT", groupName: CONTRACTOR_WORKER_GROUP, description: "Daftarkan pekerja kontraktor (self-service Contractor User)" },
    { code: "contractor.worker.manage", moduleCode: "CONTRACTOR", entity: "worker", action: "MANAGE", groupName: CONTRACTOR_WORKER_GROUP, description: "Kelola roster pekerja + BR-03 site induction gate" },
    { code: "contractor.worker.read", moduleCode: "CONTRACTOR", entity: "worker", action: "READ", groupName: CONTRACTOR_WORKER_GROUP, description: "Lihat roster pekerja (PIC internal proyek — terbatas proyek yang ditugaskan, ditegakkan service layer)" },
    { code: "contractor.assignment.manage", moduleCode: "CONTRACTOR", entity: "assignment", action: "MANAGE", groupName: CONTRACTOR_ASSIGNMENT_GROUP, description: "Kelola contractor_project_assignments (BR-01/BR-04 gate)" },
    { code: "contractor.assignment.read", moduleCode: "CONTRACTOR", entity: "assignment", action: "READ", groupName: CONTRACTOR_ASSIGNMENT_GROUP, description: "Lihat penugasan proyek" },
    { code: "contractor.evaluation.create", moduleCode: "CONTRACTOR", entity: "evaluation", action: "CREATE", groupName: CONTRACTOR_EVALUATION_GROUP, description: "Input evaluasi kinerja K3 lapangan (§4.4 poin 1)" },
    { code: "contractor.evaluation.approve", moduleCode: "CONTRACTOR", entity: "evaluation", action: "APPROVE", groupName: CONTRACTOR_EVALUATION_GROUP, description: "Approval evaluasi kinerja (Workflow Engine 1-stage, §4.4 poin 2)" },
    { code: "contractor.evaluation.read", moduleCode: "CONTRACTOR", entity: "evaluation", action: "READ", groupName: CONTRACTOR_EVALUATION_GROUP, description: "Lihat riwayat evaluasi kinerja (BEYOND literal §3, lihat banner comment blok ini)" },
    { code: "contractor.status.blacklist_approve", moduleCode: "CONTRACTOR", entity: "status", action: "BLACKLIST_APPROVE", groupName: CONTRACTOR_STATUS_GROUP, description: "Approval perubahan status ke BLACKLISTED (BR-06, wajib alasan tercatat system_audit_logs)" },
    { code: "contractor.report.export", moduleCode: "CONTRACTOR", entity: "report", action: "EXPORT", groupName: CONTRACTOR_REPORTING_GROUP, description: "Ekspor laporan kepatuhan kontraktor" },
];
const ALL_PERMISSIONS = [
    ...ORG_PERMISSIONS,
    ...USER_MGMT_PERMISSIONS,
    ...NOTIFICATION_PERMISSIONS,
    ...DMS_PERMISSIONS,
    ...COMPLIANCE_PERMISSIONS,
    ...RISK_PERMISSIONS,
    ...RISK_HIRA_JSA_HIRADC_PERMISSIONS,
    ...WORK_PERMIT_PERMISSIONS,
    ...INCIDENT_PERMISSIONS,
    ...INSPECTION_PERMISSIONS,
    ...EMERGENCY_RESPONSE_PERMISSIONS,
    ...AUDIT_PERMISSIONS,
    ...CAPA_PERMISSIONS,
    ...QUALITY_PERMISSIONS,
    ...ENVIRONMENTAL_PERMISSIONS,
    ...OCCUPATIONAL_HEALTH_PERMISSIONS,
    ...ASSET_EQUIPMENT_PERMISSIONS,
    ...CALIBRATION_PERMISSIONS,
    ...CONTRACTOR_PERMISSIONS,
];
// "Seluruh user terautentikasi" (Modul 01 §3 + Modul 02 §3 + Modul 25 §3) —
// literal PRD, diberikan ke SEMUA 13 role baseline tanpa kecuali.
const AUTHENTICATED_USER_PERMISSIONS = [
    "org.location.read",
    "org.holiday_calendar.read",
    "user_mgmt.user.read_self",
    "user_mgmt.user.update_self",
    "user_mgmt.session.view_self",
    "user_mgmt.session.revoke_self",
    "user_mgmt.delegation.create_self",
    "notification.read",
    "notification.preference.manage",
    "dms.document.read",
    "dms.acknowledgement.acknowledge",
];
// Modul 01 §3 + Modul 02 §3 literal, per role — role yang TIDAK disebutkan
// eksplisit di kedua tabel itu (lihat banner comment atas) hanya dapat
// AUTHENTICATED_USER_PERMISSIONS (digabung otomatis di bawah, tidak perlu
// diulang di sini).
const ROLE_PERMISSIONS = {
    [exports.ROLE_CODES.SUPER_ADMIN_PLATFORM]: [
        ...orgCodes("tenant", "CREATE", "READ", "UPDATE", "SUSPEND"),
        "org.industry_template.manage",
        exports.PERMISSION_MANAGE_CODE,
        "user_mgmt.user.create",
        "user_mgmt.user.impersonate",
    ],
    [exports.ROLE_CODES.TENANT_ADMIN]: [
        ...orgCrud("company"),
        ...orgCrud("branch"),
        ...orgCrud("site"),
        ...orgCrud("department"),
        ...orgCrud("cost_center"),
        ...orgCrud("location"),
        ...orgCrud("holiday_calendar"),
        ...orgCrud("org_chart"),
        ...orgCodes("tenant", "READ", "UPDATE"),
        // user_mgmt.user.* (PRD literal) — "user" TIDAK punya action DELETE
        // sama sekali di katalog (users tidak pernah hard-delete, hanya
        // DEACTIVATED — BR-02), jadi TIDAK pakai crudCodes() generik di sini
        // (akan mereferensikan user_mgmt.user.delete yang tidak ada).
        "user_mgmt.user.create",
        "user_mgmt.user.read",
        "user_mgmt.user.update",
        "user_mgmt.user.suspend",
        ...crudCodes("user_mgmt", "role"),
        "user_mgmt.user_role.assign",
        "user_mgmt.user_role.revoke",
        "user_mgmt.password_policy.manage",
        "user_mgmt.sso_mapping.manage",
        "user_mgmt.delegation.approve",
        // Modul 03 §3 "Tenant Admin | dms.category.manage, dms.document.*
        // (override penuh)" — RBAC engine (0.8) cek exact-match permission_code,
        // TIDAK ada wildcard prefix runtime, jadi "override penuh" diberikan
        // sbg daftar eksplisit SELURUH 14 kode dms.* (bukan mekanisme baru).
        "dms.document.create",
        "dms.document.update",
        "dms.document.retire",
        "dms.document.publish",
        "dms.document.export",
        "dms.version.create",
        "dms.version.submit_for_approval",
        "dms.version.approve",
        "dms.version.read_history",
        "dms.category.manage",
        "dms.distribution.manage",
        "dms.acknowledgement.view_report",
        // Modul 04 §3 "Tenant Admin / HSE Manager | compliance.regulation.*,
        // compliance.obligation.manage, compliance.evaluation.review,
        // compliance.license.create/update/renew" — Tenant Admin dapat SET
        // PENUH (termasuk read-only evaluation.read/license.read yang TIDAK
        // eksplisit disebut baris ini tapi implisit dibutuhkan utk "review"
        // genuinely melihat isinya) sekaligus menutupi kebutuhan baca "Top
        // Management" (gap #TDD26, tidak py role baseline terpisah).
        "compliance.regulation.create",
        "compliance.regulation.read",
        "compliance.regulation.update",
        "compliance.regulation.retire",
        "compliance.obligation.manage",
        "compliance.obligation.read",
        "compliance.evaluation.review",
        "compliance.evaluation.read",
        "compliance.license.create",
        "compliance.license.update",
        "compliance.license.renew",
        "compliance.license.read",
        // Modul 05 §3 "Tenant Admin / HSE Manager (korporat) | risk.matrix_config.manage"
        // — Tenant Admin dapat SET PENUH termasuk hazard.manage (Dept Head/HSE
        // Manager row) utk override yang sama alasannya dgn compliance.* di atas.
        "risk.matrix_config.manage",
        "risk.hazard.manage",
        // Modul 05 §3 sisa (task 3.2) — Tenant Admin override penuh HIRA/JSA/
        // HIRADC/risk korporat/treatment, pola PERSIS dms.*/compliance.* di atas.
        "risk.hira.create",
        "risk.hira.submit",
        "risk.hira.approve",
        "risk.hira.read",
        "risk.jsa.create",
        "risk.jsa.submit",
        "risk.jsa.approve",
        "risk.jsa.read",
        "risk.hiradc.create",
        "risk.hiradc.verify",
        "risk.hiradc.approve",
        "risk.hiradc.read",
        "risk.corporate_risk.create",
        "risk.corporate_risk.update",
        "risk.corporate_risk.approve",
        "risk.corporate_risk.read",
        "risk.treatment.manage",
        // Modul 06 §3 sisa (task 3.3) — Tenant Admin override penuh Work
        // Permit, pola PERSIS risk.*/compliance.* di atas.
        "work_permit.type.manage",
        "work_permit.permit.create",
        "work_permit.permit.update",
        "work_permit.permit.submit",
        "work_permit.permit.approve_issuer",
        "work_permit.permit.approve_hse",
        "work_permit.permit.cancel",
        "work_permit.permit.read",
        "work_permit.permit.export",
        "work_permit.gas_test.record",
        "work_permit.loto.record",
        "work_permit.extension.request",
        "work_permit.extension.approve",
        "work_permit.closure.request",
        "work_permit.closure.verify",
        // Modul 07 §3 (task 3.5) — Tenant Admin dapat seluruh permission
        // incident.* (konvensi sama seluruh modul lain); "Top Management" PRD
        // tidak eksplisit "role baru" jadi dipetakan ke sini (lihat banner
        // comment INCIDENT_PERMISSIONS).
        "incident.report.create",
        "incident.report.read",
        "incident.report.update",
        "incident.report.classify",
        "incident.report.close",
        "incident.report.export",
        "incident.investigation.create",
        "incident.investigation.assign_team",
        "incident.investigation.approve",
        "incident.root_cause.record",
        "incident.witness.record",
        "incident.corrective_action.link",
        "incident.regulatory_report.submit",
        "incident.statistics.view",
        // Modul 08 §3 (task 3.6) — Tenant Admin dapat seluruh permission inspection.*.
        "inspection.type.manage",
        "inspection.template.manage",
        "inspection.schedule.create",
        "inspection.schedule.assign",
        "inspection.record.create",
        "inspection.record.read",
        "inspection.score.view",
        "inspection.record.export",
        "inspection.finding.create",
        "inspection.finding.read",
        // Modul 14 §3 (task 3.7) — Tenant Admin dapat seluruh permission
        // emergency_response.* (konvensi sama seluruh modul lain) — MESKI §3
        // PRD sendiri hanya eja contact.configure/numbering.configure literal
        // utk baris "Tenant Admin" (pola sama seluruh modul sebelumnya yang
        // §3-nya juga tidak pernah literal "seluruh permission").
        "emergency_response.contact.configure",
        "emergency_response.numbering.configure",
        "emergency_response.dashboard.view",
        "emergency_response.plan.create",
        "emergency_response.plan.approve",
        "emergency_response.plan.read",
        "emergency_response.team.manage",
        "emergency_response.team.view_own",
        "emergency_response.team.read",
        "emergency_response.drill.schedule",
        "emergency_response.drill.conduct",
        "emergency_response.drill.approve_completion",
        "emergency_response.drill.view_own_participation",
        "emergency_response.drill.read",
        "emergency_response.activation.declare",
        "emergency_response.activation.read",
        "emergency_response.muster_checkin.self_submit",
        "emergency_response.readiness_checklist.manage",
        "emergency_response.readiness_checklist.read",
        // Modul 09 §3 (task 4.1) — Tenant Admin dapat seluruh permission
        // audit.* (konvensi sama seluruh modul lain).
        "audit.program.create",
        "audit.program.approve",
        "audit.program.read",
        "audit.type.manage",
        "audit.checklist.manage",
        "audit.checklist.read",
        "audit.audit.schedule",
        "audit.audit.assign_team",
        "audit.audit.conduct",
        "audit.audit.read",
        "audit.audit.export",
        "audit.audit.close",
        "audit.finding.create",
        "audit.finding.classify",
        "audit.finding.read",
        "audit.finding.auditee_response",
        "audit.auditor_competency.manage",
        "audit.auditor_competency.read",
        "audit.report.generate",
        "audit.report.approve",
        "audit.report.read",
        // Modul 10 §3 (task 4.2) — Tenant Admin dapat seluruh permission capa.*
        // (konvensi sama seluruh modul lain).
        "capa.register.create",
        "capa.register.read",
        "capa.register.update",
        "capa.register.close",
        "capa.register.reopen",
        "capa.register.export",
        "capa.root_cause.record",
        "capa.action_plan.define",
        "capa.action_plan.link_action_tracking",
        "capa.approval.approve",
        "capa.effectiveness.verify",
        // Modul 11 §3 (task 5.1) — Tenant Admin dapat seluruh permission
        // quality.* (konvensi sama seluruh modul lain).
        "quality.ncr.create",
        "quality.ncr.view_department",
        "quality.ncr.view_all",
        "quality.ncr.approve_disposition",
        "quality.ncr.export",
        "quality.complaint.create",
        "quality.complaint.manage",
        "quality.complaint.view_all",
        "quality.complaint.export",
        "quality.inspection.create",
        "quality.inspection.submit",
        "quality.inspection.view_department",
        "quality.inspection.view_all",
        "quality.inspection.approve_deviation",
        "quality.inspection.export",
        "quality.supplier_evaluation.create",
        "quality.supplier_evaluation.submit",
        "quality.supplier_evaluation.approve",
        "quality.supplier_evaluation.view_all",
        "quality.supplier_evaluation.export",
        "quality.objective.manage",
        "quality.objective.view_all",
        "quality.objective.configure",
        "quality.numbering.configure",
        // Modul 12 §3 (task 5.2) — Tenant Admin dapat seluruh permission
        // environmental.* (konvensi sama seluruh modul lain).
        "environmental.aspect_impact.create",
        "environmental.aspect_impact.view_department",
        "environmental.aspect_impact.view_all",
        "environmental.aspect_impact.approve",
        "environmental.aspect_impact.export",
        "environmental.monitoring.create",
        "environmental.monitoring.view_all",
        "environmental.monitoring.export",
        "environmental.waste_manifest.manage",
        "environmental.waste_manifest.create",
        "environmental.waste_manifest.view_all",
        "environmental.waste_manifest.export",
        "environmental.waste_generation_log.create",
        "environmental.waste_generation_log.view_all",
        "environmental.proper_assessment.create",
        "environmental.proper_assessment.approve",
        "environmental.proper_assessment.view",
        "environmental.proper_assessment.export",
        "environmental.baku_mutu.configure",
        "environmental.numbering.configure",
        "environmental.permit.manage",
        "environmental.dashboard.view",
        // Modul 13 §3.2 "Tenant Admin | occupational_health.authorized_user.manage,
        // occupational_health.consent.configure | Administrasi, TANPA read_phi
        // default" (task 5.3) — read_phi SENGAJA TIDAK ditambahkan di sini,
        // lihat banner comment blok OCCUPATIONAL_HEALTH_PERMISSIONS.
        "occupational_health.authorized_user.manage",
        "occupational_health.consent.configure",
        // Modul 15 §3 "Tenant Admin | asset.category.manage, asset.asset.manage
        // (semua aksi) | Lintas tenant" (task 6.1) — "semua aksi" diterjemahkan
        // daftar eksplisit SELURUH 10 kode asset.*, pola sama "override penuh"
        // dms.document.* (komentar di atas blok ini) — TIDAK ADA kepekaan PHI
        // di modul ini (beda Occupational Health), jadi TIDAK ada pengecualian.
        "asset.category.manage",
        "asset.asset.manage",
        "asset.asset.create",
        "asset.asset.update",
        "asset.asset.read",
        "asset.safety_critical.flag",
        "asset.maintenance.record",
        "asset.maintenance.read",
        "asset.issue.report",
        "asset.report.export",
        // Modul 16 §3 "Tenant Admin | calibration.* (semua)" (task 6.2) —
        // wildcard diterjemahkan daftar eksplisit SELURUH 15 kode calibration.*,
        // pola sama asset.* di atas.
        "calibration.item.create",
        "calibration.item.update",
        "calibration.item.read",
        "calibration.provider.manage",
        "calibration.schedule.manage",
        "calibration.schedule.read",
        "calibration.certificate.create",
        "calibration.certificate.upload",
        "calibration.certificate.review",
        "calibration.certificate.approve",
        "calibration.certificate.read",
        "calibration.oot.manage",
        "calibration.oot.approve",
        "calibration.oot.read",
        "calibration.report.export",
        // Modul 17 §3 "Tenant Admin | contractor.* (semua)" (task 6.3) —
        // wildcard diterjemahkan daftar eksplisit SELURUH 20 kode contractor.*,
        // pola sama calibration.* di atas.
        "contractor.contractor.create",
        "contractor.contractor.update",
        "contractor.contractor.read",
        "contractor.prequalification.submit",
        "contractor.prequalification.review",
        "contractor.prequalification.approve",
        "contractor.prequalification.read",
        "contractor.document.upload",
        "contractor.document.verify",
        "contractor.document.read",
        "contractor.worker.submit",
        "contractor.worker.manage",
        "contractor.worker.read",
        "contractor.assignment.manage",
        "contractor.assignment.read",
        "contractor.evaluation.create",
        "contractor.evaluation.approve",
        "contractor.evaluation.read",
        "contractor.status.blacklist_approve",
        "contractor.report.export",
    ],
    [exports.ROLE_CODES.COMPANY_ADMIN]: [
        ...orgCodes("branch", "CREATE", "READ", "UPDATE"),
        ...orgCodes("site", "CREATE", "READ", "UPDATE"),
        ...orgCrud("department"),
        "org.cost_center.read",
        ...orgCrud("org_chart"),
        "user_mgmt.user.create",
        "user_mgmt.user.read",
        "user_mgmt.user.update",
        "user_mgmt.user.suspend",
        "user_mgmt.user_role.assign",
        "user_mgmt.role.read",
        // Modul 03 §3 "HSE Manager / Company Admin" — approval final + publish + laporan ack.
        "dms.version.approve",
        "dms.document.publish",
        "dms.acknowledgement.view_report",
        // CATATAN (perbaikan pasca-3.6): blok incident.*/inspection.* SEMPAT
        // salah tempat DI SINI (COMPANY_ADMIN) padahal komentarnya sendiri
        // menyebut "Tenant Admin" — sudah dipindah ke TENANT_ADMIN di atas.
        // Modul 07 §3 & Modul 08 §3 TIDAK menyebut Company Admin sama sekali.
        // Modul 14 §3 (task 3.7) — "Top Management | emergency_response.dashboard.view
        // (read-only)" dipetakan ke sini (pola sama Incident 3.5: PRD tidak
        // eksplisit "role baru", jadi TIDAK dibuat role TOP_MANAGEMENT baru) —
        // BEDA dari Incident yang memberi Top Management set lebih luas,
        // di sini §3 modul ini SENDIRI membatasi Top Management HANYA dashboard
        // read-only, jadi HANYA satu kode ini yang digrant, bukan seluruh
        // emergency_response.*.
        "emergency_response.dashboard.view",
        // Modul 09 §3 "Top Management | audit.program.approve" (task 4.1) —
        // PRD tidak eksplisit "role baru" jadi dipetakan ke sini (pola sama
        // Incident 3.5/Emergency Response 3.7). program.read BEYOND literal —
        // Top Management butuh genuinely MELIHAT program sebelum approve
        // (pola sama compliance.evaluation.read utk "review" TENANT_ADMIN).
        "audit.program.approve",
        "audit.program.read",
        // Modul 10 §3 "Top Management | capa.register.read (agregat),
        // capa.register.export" (task 4.2) — match literal, pola sama
        // pemetaan Top Management modul lain.
        "capa.register.read",
        "capa.register.export",
        // Modul 12 §3 "Top Management | environmental.proper_assessment.view,
        // environmental.dashboard.view | Scope company, read-only" (task 5.2) —
        // match literal, pola sama pemetaan Top Management modul lain.
        "environmental.proper_assessment.view",
        "environmental.dashboard.view",
    ],
    [exports.ROLE_CODES.HSE_MANAGER]: [
        "org.site.read",
        "org.department.read",
        "org.org_chart.read",
        // Modul 03 §3 "HSE Manager / Company Admin" (baris sama Company Admin di atas).
        "dms.version.approve",
        "dms.document.publish",
        "dms.acknowledgement.view_report",
        // Modul 04 §3 "Tenant Admin / HSE Manager" (baris sama Tenant Admin di atas).
        "compliance.regulation.create",
        "compliance.regulation.read",
        "compliance.regulation.update",
        "compliance.regulation.retire",
        "compliance.obligation.manage",
        "compliance.obligation.read",
        "compliance.evaluation.review",
        "compliance.evaluation.read",
        "compliance.license.create",
        "compliance.license.update",
        "compliance.license.renew",
        "compliance.license.read",
        // Modul 05 §3 baris sama Tenant Admin (Tenant Admin / HSE Manager korporat).
        "risk.matrix_config.manage",
        // Modul 05 §3 "Department Head / HSE Manager | risk.hazard.manage" (baris kedua).
        "risk.hazard.manage",
        // Modul 05 §3 "Department Head / HSE Manager | risk.hira.approve,
        // risk.jsa.approve, risk.hiradc.approve, risk.treatment.manage" (task
        // 3.2) — TIDAK termasuk risk.corporate_risk.* (baris PRD TERPISAH utk
        // "Top Management / Direksi", HSE_MANAGER tidak disebut di situ).
        "risk.hira.approve",
        "risk.jsa.approve",
        "risk.hiradc.approve",
        "risk.treatment.manage",
        // Modul 06 §3 "HSE Manager | work_permit.permit.approve_hse,
        // work_permit.extension.approve, work_permit.permit.cancel" + baris
        // kedua "work_permit.permit.read, work_permit.permit.export" (task
        // 3.3+3.4 digabung — extension.approve ditambahkan task 3.4 begitu
        // work_permit_extensions genuinely ada).
        "work_permit.permit.approve_hse",
        "work_permit.permit.cancel",
        "work_permit.permit.read",
        "work_permit.permit.export",
        "work_permit.extension.approve",
        // Modul 07 §3 "HSE Manager | incident.investigation.approve,
        // incident.regulatory_report.submit, incident.report.close,
        // incident.statistics.view" (task 3.5).
        "incident.investigation.approve",
        "incident.regulatory_report.submit",
        "incident.report.close",
        "incident.statistics.view",
        // Modul 08 §3 "HSE Manager | inspection.schedule.create, inspection.schedule.assign"
        // + baris kedua "inspection.record.read, inspection.score.view,
        // inspection.record.export" (task 3.6).
        "inspection.schedule.create",
        "inspection.schedule.assign",
        "inspection.record.read",
        "inspection.score.view",
        "inspection.record.export",
        // Modul 14 §3 "HSE Manager/QHSE Head | emergency_response.plan.approve,
        // emergency_response.team.manage, emergency_response.drill.approve_completion"
        // (task 3.7) — plan.read/team.read/drill.read/activation.declare+read/
        // readiness_checklist.read BEYOND literal (kebutuhan baca operasional
        // implisit dari peran approve/manage-nya, pola sama modul lain). BR-09
        // (workflow) — stage 2 kondisional ("Top Management/Site Manager")
        // TIDAK punya permission code terpisah di §3, jadi direalisasikan
        // sbg role HSE_MANAGER yang SAMA (pola sama Incident 3.5 "kedua stage
        // sama-sama HSE_MANAGER"), TDD §26.
        "emergency_response.plan.approve",
        "emergency_response.plan.read",
        "emergency_response.team.manage",
        "emergency_response.drill.approve_completion",
        "emergency_response.drill.read",
        "emergency_response.activation.declare",
        "emergency_response.activation.read",
        "emergency_response.readiness_checklist.read",
        // Modul 09 §3 (task 4.1) — "Audit Program Owner/MR" dipetakan ke sini
        // (MR/Management Representative lazimnya HSE Manager di tenant QHSE,
        // pola sama Emergency Response 3.7 "Audit Program Owner/MR" utk modul
        // itu) + "HSE/QMS Manager | audit.report.approve, audit.audit.close"
        // (baris §3 literal terpisah, role SAMA) + permission OPERASIONAL
        // "Lead Auditor"/"Auditor Internal" (lihat banner comment
        // AUDIT_PERMISSIONS soal resolusi tabrakan nama dgn ROLE_CODES.
        // AUDITOR_INTERNAL platform yang TETAP read-only).
        "audit.program.create",
        "audit.type.manage",
        "audit.checklist.manage",
        "audit.checklist.read",
        "audit.audit.schedule",
        "audit.audit.assign_team",
        "audit.audit.conduct",
        "audit.audit.read",
        "audit.audit.close",
        "audit.finding.create",
        "audit.finding.classify",
        "audit.finding.read",
        "audit.report.generate",
        "audit.report.approve",
        "audit.report.read",
        "audit.program.read",
        "audit.auditor_competency.read",
        // Modul 10 §3 (task 4.2) — "CAPA Owner/PIC" (kandidat plausible,
        // §1 "biasanya HSE Officer/Department Head") + "HSE Manager/QMS
        // Manager | capa.approval.approve" + "Effectiveness Verifier
        // (kandidat plausible, BEDA dari kandidat PIC HSE_OFFICER)" + "HSE
        // Manager | capa.register.close/reopen" — SEMUA baris §3 yang
        // menyebut HSE Manager digabung di sini.
        "capa.register.create",
        "capa.register.read",
        "capa.register.update",
        "capa.register.close",
        "capa.register.reopen",
        "capa.root_cause.record",
        "capa.action_plan.define",
        "capa.action_plan.link_action_tracking",
        "capa.approval.approve",
        "capa.effectiveness.verify",
        // Modul 11 §3 "HSE Manager/QHSE Head | quality.ncr.view_all,
        // quality.objective.view_all, quality.*.export" (task 5.1) — PLUS PRD
        // literal "oversight, dapat approve JIKA tenant tidak punya Quality
        // Manager terpisah" — diwujudkan dgn grant SAMA luasnya dgn
        // QUALITY_MANAGER (fallback role, pola sama COMPLIANCE_OFFICER
        // "sub-fungsi HSE Manager" 2.2), bukan hanya baris literal view_all/export.
        "quality.ncr.view_all",
        "quality.ncr.approve_disposition",
        "quality.ncr.export",
        "quality.complaint.manage",
        "quality.complaint.view_all",
        "quality.complaint.export",
        "quality.inspection.view_all",
        "quality.inspection.approve_deviation",
        "quality.inspection.export",
        "quality.supplier_evaluation.approve",
        "quality.supplier_evaluation.view_all",
        "quality.supplier_evaluation.export",
        "quality.objective.manage",
        "quality.objective.view_all",
        // Modul 12 §3 "HSE Manager/QHSE Head | environmental.aspect_impact.approve,
        // environmental.monitoring.view_all, environmental.proper_assessment.approve,
        // environmental.*.export" (task 5.2) — wildcard export diekspansi ke 4
        // entity inti + view_all diperluas konsisten ke aspect_impact/waste_manifest
        // (pola sama Quality 5.1). `environmental.permit.manage` diinvent
        // dipetakan ke sini (operasional plausible, tidak ada baris §3 literal),
        // gap TDD §26.
        "environmental.aspect_impact.approve",
        "environmental.aspect_impact.view_all",
        "environmental.aspect_impact.export",
        "environmental.monitoring.view_all",
        "environmental.monitoring.export",
        "environmental.waste_manifest.view_all",
        "environmental.waste_manifest.export",
        "environmental.proper_assessment.approve",
        "environmental.proper_assessment.export",
        "environmental.permit.manage",
        // Modul 13 §3.2 "HSE Manager/QHSE Head | occupational_health.aggregate_report.view,
        // occupational_health.fit_to_work.view_summary | Scope company/branch,
        // TANPA akses PHI individual" (task 5.3) — BR-03 TIDAK PERNAH melihat
        // medical_records/mcu_results/diagnosis individu, hanya view agregat.
        "occupational_health.aggregate_report.view",
        "occupational_health.fit_to_work.view_summary",
        // Modul 15 §3 "HSE Manager | asset.asset.read, asset.safety_critical.flag,
        // asset.report.export | Scope Company/Branch" (task 6.1).
        "asset.asset.read",
        "asset.safety_critical.flag",
        "asset.report.export",
        // Modul 16 §3 "HSE Manager/QHSE Head | calibration.certificate.approve,
        // calibration.oot.approve, calibration.report.export | Scope Company/
        // Branch" (task 6.2).
        "calibration.certificate.approve",
        "calibration.oot.approve",
        "calibration.report.export",
        // Modul 17 §3 "HSE Manager | contractor.prequalification.approve,
        // contractor.evaluation.approve, contractor.status.blacklist_approve |
        // Scope Company/Branch — approval keputusan kritis" (task 6.3).
        "contractor.prequalification.approve",
        "contractor.evaluation.approve",
        "contractor.status.blacklist_approve",
    ],
    [exports.ROLE_CODES.DEPARTMENT_HEAD]: [
        "org.site.read",
        "org.department.read",
        "org.org_chart.read",
        "user_mgmt.user.read",
        "user_mgmt.delegation.create",
        // Modul 03 §3 "Document Owner (biasanya Department Head/HSE Manager)" —
        // Document Owner BUKAN role tetap (lihat DMS_PERMISSIONS banner
        // comment), diberikan ke role yang PLAUSIBLE jadi owner.
        "dms.version.approve",
        // Modul 05 §3 "Department Head / HSE Manager | risk.hazard.manage".
        "risk.hazard.manage",
        // Modul 05 §3 sisa (task 3.2), baris sama HSE Manager di atas.
        "risk.hira.approve",
        "risk.jsa.approve",
        "risk.hiradc.approve",
        "risk.treatment.manage",
        // Modul 08 §3 "Department Head | inspection.finding.read" (task 3.6).
        "inspection.finding.read",
        // Modul 09 §3 "Auditee (Department Head) | membaca temuan miliknya,
        // memberi auditee_response" (task 4.1) — role platform match LANGSUNG
        // literal (BEDA dari kebanyakan mapping modul lain yang butuh
        // interpretasi). Scope "miliknya" ditegakkan service-level
        // (AuditFindingService), pola sama work_permit.permit.* "miliknya sendiri".
        "audit.finding.read",
        "audit.finding.auditee_response",
        // Modul 10 §3 (task 4.2) — "CAPA Owner/PIC" (kandidat plausible §1
        // "biasanya HSE Officer/Department Head") + "Effectiveness Verifier"
        // (kandidat plausible, BEDA dari kandidat PIC HSE_OFFICER — pemisahan
        // aktual ditegakkan BR-03 service-level).
        "capa.register.read",
        "capa.register.update",
        "capa.root_cause.record",
        "capa.action_plan.define",
        "capa.action_plan.link_action_tracking",
        "capa.effectiveness.verify",
        // Modul 11 §3 "Department Head/Supervisor | quality.ncr.view_department,
        // quality.inspection.view_department" (task 5.1) — baris SAMA dipakai
        // DEPARTMENT_HEAD & SUPERVISOR (PRD literal menggabung KEDUA role dalam
        // satu baris tabel).
        "quality.ncr.view_department",
        "quality.inspection.view_department",
        // Modul 13 §3.2 "Department Head/Supervisor | occupational_health.fit_to_work.view_summary,
        // occupational_health.restricted_duty.view | Scope department, hanya
        // field boundary non-klinis" (task 5.3) — pola SAMA quality.ncr.view_department
        // di atas (baris PRD gabung KEDUA role, diberikan ke DEPARTMENT_HEAD & SUPERVISOR).
        "occupational_health.fit_to_work.view_summary",
        "occupational_health.restricted_duty.view",
        // Modul 17 §3 "Department Head/Site Supervisor | contractor.assignment.read,
        // contractor.evaluation.create (input evaluasi lapangan) | Scope
        // Site/Department" (task 6.3) — baris SAMA dipakai DEPARTMENT_HEAD &
        // SUPERVISOR, pola PERSIS quality.ncr.view_department di atas.
        "contractor.assignment.read",
        "contractor.evaluation.create",
    ],
    // Modul 05 §3 "HSE Officer / Supervisor Lapangan | risk.hazard.propose"
    // (SUPERVISOR role code = "Supervisor Lapangan" literal PRD, sudah ada
    // di roster baseline sejak 0.8, belum pernah dapat entri risk.* sebelumnya).
    [exports.ROLE_CODES.SUPERVISOR]: [
        "user_mgmt.user.read",
        "user_mgmt.delegation.create",
        "risk.hazard.propose",
        // Modul 05 §3 sisa (task 3.2) "HSE Officer / Supervisor Lapangan |
        // risk.hira.create/submit, risk.jsa.create/submit, risk.hiradc.create/verify".
        "risk.hira.create",
        "risk.hira.submit",
        "risk.jsa.create",
        "risk.jsa.submit",
        "risk.hiradc.create",
        "risk.hiradc.verify",
        // Modul 06 §3 "Issuer/Area Authority (Supervisor) |
        // work_permit.permit.approve_issuer, work_permit.closure.verify" (task
        // 3.3+3.4 digabung — closure.verify ditambahkan task 3.4 begitu
        // work_permit_closures genuinely ada).
        "work_permit.permit.approve_issuer",
        "work_permit.closure.verify",
        // Modul 07 §3 "Supervisor | incident.report.read, incident.report.update
        // (verifikasi awal)" (task 3.5).
        "incident.report.read",
        "incident.report.update",
        // Modul 08 §3 "Inspector (HSE Officer/Supervisor/Worker ditugaskan) |
        // inspection.record.create, inspection.finding.create" (task 3.6).
        "inspection.record.create",
        "inspection.finding.create",
        // Modul 14 §3 "Site Security/Facility (Asset Custodian) |
        // emergency_response.readiness_checklist.manage" (task 3.7) — TIDAK ADA
        // role "Site Security"/"Facility" di roster 15-role baseline (PRD tidak
        // eksplisit minta "role baru"), dipetakan ke SUPERVISOR (persona
        // "boots-on-the-ground" site-level, pola sama hazard.propose 3.1).
        // + "Anggota ERT | emergency_response.activation.declare (khusus
        // Incident Commander), emergency_response.team.view_own" — permission
        // digrant ke KANDIDAT anggota ERT plausible (SUPERVISOR/HSE_OFFICER/
        // WORKER_EMPLOYEE, pola sama "Inspector" 3.6); pembatasan "KHUSUS
        // Incident Commander" TIDAK bisa ditegakkan RBAC Engine (granularitas
        // per-baris ert_role, bukan per-role) — ditegakkan EmergencyActivationService.
        "emergency_response.readiness_checklist.manage",
        "emergency_response.activation.declare",
        "emergency_response.team.view_own",
        // Modul 11 §3 "Department Head/Supervisor" (task 5.1) — lihat komentar
        // DEPARTMENT_HEAD di atas soal baris tabel yang sama.
        "quality.ncr.view_department",
        "quality.inspection.view_department",
        // Modul 12 §3 "Site Supervisor | environmental.aspect_impact.view_department
        // | Scope department" (task 5.2) — "Site Supervisor" dipetakan role
        // SUPERVISOR existing (lihat banner comment ROLE_CODES di atas).
        "environmental.aspect_impact.view_department",
        // Modul 13 §3.2 "Department Head/Supervisor" (task 5.3) — lihat komentar
        // DEPARTMENT_HEAD di atas soal baris tabel yang sama.
        "occupational_health.fit_to_work.view_summary",
        "occupational_health.restricted_duty.view",
        // Modul 15 §3 "Supervisor/Facility Officer | asset.asset.create,
        // asset.asset.update, asset.maintenance.record | Scope Site/Department
        // miliknya" (task 6.1) — "Facility Officer" TIDAK ADA role terpisah di
        // roster baseline, dipetakan SUPERVISOR, pola PERSIS "Site Security/
        // Facility (Asset Custodian)" Modul 14 di atas.
        "asset.asset.create",
        "asset.asset.update",
        "asset.maintenance.record",
        // Modul 16 §3 "Asset Custodian (dari Modul 15) | calibration.item.read,
        // calibration.schedule.read | Read-only status kalibrasi aset yang jadi
        // tanggung jawabnya" (task 6.2) — "Asset Custodian" TIDAK ADA role
        // terpisah di roster baseline, dipetakan SUPERVISOR, pola PERSIS "Site
        // Security/Facility (Asset Custodian)" Modul 14 & "Facility Officer"
        // Modul 15 di atas.
        "calibration.item.read",
        "calibration.schedule.read",
        // Modul 17 §3 "Department Head/Site Supervisor" (task 6.3) — lihat
        // komentar DEPARTMENT_HEAD di atas soal baris tabel yang sama.
        "contractor.assignment.read",
        "contractor.evaluation.create",
    ],
    // Modul 04 §3 "HSE Officer | compliance.evaluation.create/submit,
    // compliance.license.upload_evidence, compliance.obligation.read" — role
    // ini SUDAH ada di roster baseline sejak Master PRD §8.2 (0.8) tapi belum
    // pernah dapat entri ROLE_PERMISSIONS eksplisit sampai task ini (hanya
    // AUTHENTICATED_USER_PERMISSIONS selama ini).
    [exports.ROLE_CODES.HSE_OFFICER]: [
        "compliance.evaluation.create",
        "compliance.evaluation.submit",
        "compliance.license.upload_evidence",
        "compliance.obligation.read",
        // Modul 05 §3 "HSE Officer / Supervisor Lapangan | risk.hazard.propose".
        "risk.hazard.propose",
        // Modul 05 §3 sisa (task 3.2), baris sama SUPERVISOR di atas.
        "risk.hira.create",
        "risk.hira.submit",
        "risk.jsa.create",
        "risk.jsa.submit",
        "risk.hiradc.create",
        "risk.hiradc.verify",
        // Modul 06 §3 "HSE Officer | work_permit.gas_test.record,
        // work_permit.loto.record, work_permit.permit.read" (task 3.3).
        "work_permit.gas_test.record",
        "work_permit.loto.record",
        "work_permit.permit.read",
        // Modul 07 §3 "HSE Officer | incident.report.classify,
        // incident.investigation.create, incident.investigation.assign_team,
        // incident.root_cause.record, incident.witness.record,
        // incident.corrective_action.link" (task 3.5).
        "incident.report.classify",
        "incident.investigation.create",
        "incident.investigation.assign_team",
        "incident.root_cause.record",
        "incident.witness.record",
        "incident.corrective_action.link",
        // Modul 08 §3 sisa (task 3.6), baris sama Supervisor di atas (Inspector
        // mencakup HSE Officer/Supervisor/Worker ditugaskan).
        "inspection.record.create",
        "inspection.finding.create",
        // Modul 14 §3 "HSE Officer | emergency_response.plan.create,
        // emergency_response.drill.schedule, emergency_response.drill.conduct"
        // (task 3.7) + readiness_checklist.manage (HSE Officer JUGA plausible
        // pemeriksa peralatan, baris sama Supervisor) + activation.declare/
        // team.view_own (kandidat anggota ERT, baris sama Supervisor).
        "emergency_response.plan.create",
        "emergency_response.drill.schedule",
        "emergency_response.drill.conduct",
        "emergency_response.readiness_checklist.manage",
        "emergency_response.activation.declare",
        "emergency_response.team.view_own",
        // Modul 09 §3 (task 4.1) — HSE Officer JUGA kandidat plausible "Lead
        // Auditor"/"Auditor Internal" QHSE-praktisi (baris sama HSE_MANAGER,
        // subset lebih sempit — TANPA program.create/type.manage/checklist.manage/
        // report.approve/audit.close, tier "manajerial", lihat banner comment
        // AUDIT_PERMISSIONS).
        "audit.audit.conduct",
        "audit.audit.read",
        "audit.checklist.read",
        "audit.finding.create",
        "audit.finding.classify",
        "audit.finding.read",
        "audit.report.generate",
        "audit.auditor_competency.read",
        // Modul 10 §3 (task 4.2) — "CAPA Owner/PIC" (kandidat plausible §1
        // "biasanya HSE Officer/Department Head") — tier PIC saja, TANPA
        // approve/close/reopen/verify (manajerial, baris sama HSE_MANAGER).
        "capa.register.create",
        "capa.register.read",
        "capa.register.update",
        "capa.root_cause.record",
        "capa.action_plan.define",
        "capa.action_plan.link_action_tracking",
        // Modul 16 §3 "Quality Officer / HSE Officer | calibration.certificate.review,
        // calibration.certificate.approve, calibration.oot.manage | Scope Site"
        // (task 6.2) — "Quality Officer" DILIPAT ke HSE_OFFICER existing (PRD
        // §3 literal sendiri menulis baris gabungan "Quality Officer / HSE
        // Officer", bukan dua baris terpisah).
        "calibration.certificate.review",
        "calibration.certificate.approve",
        "calibration.oot.manage",
        // Modul 17 §3 "Contractor Coordinator / HSE Officer |
        // contractor.contractor.create/update, contractor.prequalification.review,
        // contractor.document.verify, contractor.worker.manage,
        // contractor.assignment.manage | Scope Company/Site" (task 6.3) —
        // "Contractor Coordinator" DILIPAT ke HSE_OFFICER existing (PRD §3
        // literal sendiri menulis baris gabungan, pola PERSIS "Quality Officer
        // / HSE Officer" Modul 16 di atas).
        "contractor.contractor.create",
        "contractor.contractor.update",
        "contractor.prequalification.review",
        "contractor.document.verify",
        "contractor.worker.manage",
        "contractor.assignment.manage",
    ],
    [exports.ROLE_CODES.AUDITOR_INTERNAL]: [
        "user_mgmt.user_role.read",
        "dms.version.read_history",
        "dms.document.export",
        "compliance.regulation.read",
        "compliance.evaluation.read",
        "compliance.license.read",
        // Modul 05 §3 "Auditor Internal/Eksternal | risk.hira.read, risk.jsa.read,
        // risk.hiradc.read, risk.corporate_risk.read" (task 3.2).
        "risk.hira.read",
        "risk.jsa.read",
        "risk.hiradc.read",
        "risk.corporate_risk.read",
        // Modul 06 §3 "Auditor Internal/Eksternal | work_permit.permit.read,
        // work_permit.permit.export" (task 3.3).
        "work_permit.permit.read",
        "work_permit.permit.export",
        // Modul 07 §3 "Auditor Internal/Eksternal | incident.report.read,
        // incident.report.export" (task 3.5).
        "incident.report.read",
        "incident.report.export",
        // Modul 08 §3 "Auditor Internal/Eksternal | inspection.record.read,
        // inspection.record.export" (task 3.6).
        "inspection.record.read",
        "inspection.record.export",
        // Modul 14 §3 "Auditor Internal/Eksternal | emergency_response.*.view
        // (read-only)" (task 3.7) — wildcard prosa diresolusi jadi 5 kode
        // `.read` KONKRET (lihat banner comment EMERGENCY_RESPONSE_PERMISSIONS).
        "emergency_response.plan.read",
        "emergency_response.team.read",
        "emergency_response.drill.read",
        "emergency_response.activation.read",
        "emergency_response.readiness_checklist.read",
        // Modul 09 §3 "Auditor Internal/Eksternal | audit.audit.export" (task
        // 4.1) + audit.audit.read BEYOND literal (butuh baca sebelum ekspor,
        // pola sama seluruh *.export lain) — TETAP read-only konsisten platform,
        // lihat banner comment AUDIT_PERMISSIONS soal resolusi tabrakan nama.
        "audit.audit.read",
        "audit.audit.export",
        // Modul 10 §3 "Auditor Internal/Eksternal | capa.register.read,
        // capa.register.export" (task 4.2) — match literal.
        "capa.register.read",
        "capa.register.export",
        // Modul 11 §3 "Auditor Internal/Eksternal | quality.*.view (read-only)"
        // (task 5.1) — diekspansi jadi view_all per-entity, pola sama seluruh
        // baris *.export di atas.
        "quality.ncr.view_all",
        "quality.complaint.view_all",
        "quality.inspection.view_all",
        "quality.supplier_evaluation.view_all",
        "quality.objective.view_all",
        // Modul 12 §3 "Auditor Internal/Eksternal | environmental.*.view
        // (read-only)" (task 5.2) — diekspansi jadi view_all/view per-entity,
        // pola sama Quality 5.1.
        "environmental.aspect_impact.view_all",
        "environmental.monitoring.view_all",
        "environmental.waste_manifest.view_all",
        "environmental.waste_generation_log.view_all",
        "environmental.proper_assessment.view",
        // Modul 13 §3.2 "Auditor Internal/Eksternal (akses khusus) |
        // occupational_health.aggregate_report.view; read_phi HANYA jika
        // di-whitelist temporer" (task 5.3) — read_phi SENGAJA TIDAK
        // ditambahkan di baseline, pola SAMA Tenant Admin (harus diberikan
        // eksplisit per-kasus, BUKAN baseline role) — hanya bagian agregat.
        "occupational_health.aggregate_report.view",
        // Modul 15 §3 "Auditor Internal/Eksternal | asset.asset.read,
        // asset.maintenance.read (read-only) | Sesuai scope audit" (task 6.1).
        "asset.asset.read",
        "asset.maintenance.read",
        // Modul 16 §3 "Auditor Internal/Eksternal | calibration.*.read,
        // calibration.report.export | Read-only, lintas site sesuai scope audit"
        // (task 6.2) — wildcard `.read` diekspansi ke SELURUH kode `.read`
        // konkret di katalog (item/schedule/certificate/oot), pola sama
        // EMERGENCY_RESPONSE_PERMISSIONS wildcard-resolution (Modul 14 3.7).
        "calibration.item.read",
        "calibration.schedule.read",
        "calibration.certificate.read",
        "calibration.oot.read",
        "calibration.report.export",
        // Modul 17 §3 "Auditor Internal/Eksternal | contractor.*.read,
        // contractor.report.export | Read-only, termasuk auditor SKK Migas
        // (guest access temporer)" (task 6.3) — wildcard `.read` diekspansi ke
        // SELURUH kode `.read` konkret di katalog, pola sama Calibration di atas.
        "contractor.contractor.read",
        "contractor.prequalification.read",
        "contractor.document.read",
        "contractor.worker.read",
        "contractor.assignment.read",
        "contractor.evaluation.read",
        "contractor.report.export",
    ],
    [exports.ROLE_CODES.AUDITOR_EXTERNAL]: [
        "org.company.read",
        "org.site.read",
        "user_mgmt.user_role.read",
        "dms.version.read_history",
        "dms.document.export",
        "compliance.regulation.read",
        "compliance.evaluation.read",
        "compliance.license.read",
        // Modul 05 §3 sisa (task 3.2), baris sama Auditor Internal di atas.
        "risk.hira.read",
        "risk.jsa.read",
        "risk.hiradc.read",
        "risk.corporate_risk.read",
        // Modul 06 §3 sisa (task 3.3), baris sama Auditor Internal di atas.
        "work_permit.permit.read",
        "work_permit.permit.export",
        // Modul 07 §3 sisa (task 3.5), baris sama Auditor Internal di atas.
        "incident.report.read",
        "incident.report.export",
        // Modul 08 §3 sisa (task 3.6), baris sama Auditor Internal di atas.
        "inspection.record.read",
        "inspection.record.export",
        // Modul 14 §3 sisa (task 3.7), baris sama Auditor Internal di atas.
        "emergency_response.plan.read",
        "emergency_response.team.read",
        "emergency_response.drill.read",
        "emergency_response.activation.read",
        "emergency_response.readiness_checklist.read",
        // Modul 09 §3 sisa (task 4.1), baris sama Auditor Internal di atas —
        // "Auditor Eksternal (Guest) | audit.audit.read" juga LITERAL match
        // langsung utk role ini.
        "audit.audit.read",
        "audit.audit.export",
        // Modul 10 §3 sisa (task 4.2), baris sama Auditor Internal di atas.
        "capa.register.read",
        "capa.register.export",
        // Modul 11 §3 sisa (task 5.1), baris sama Auditor Internal di atas.
        "quality.ncr.view_all",
        "quality.complaint.view_all",
        "quality.inspection.view_all",
        "quality.supplier_evaluation.view_all",
        "quality.objective.view_all",
        // Modul 12 §3 sisa (task 5.2), baris sama Auditor Internal di atas.
        "environmental.aspect_impact.view_all",
        "environmental.monitoring.view_all",
        "environmental.waste_manifest.view_all",
        "environmental.waste_generation_log.view_all",
        "environmental.proper_assessment.view",
        // Modul 13 §3.2 sisa (task 5.3), baris sama Auditor Internal di atas.
        "occupational_health.aggregate_report.view",
        // Modul 15 §3 sisa (task 6.1), baris sama Auditor Internal di atas.
        "asset.asset.read",
        "asset.maintenance.read",
        // Modul 16 §3 sisa (task 6.2), baris sama Auditor Internal di atas.
        "calibration.item.read",
        "calibration.schedule.read",
        "calibration.certificate.read",
        "calibration.oot.read",
        "calibration.report.export",
        // Modul 17 §3 sisa (task 6.3), baris sama Auditor Internal di atas.
        "contractor.contractor.read",
        "contractor.prequalification.read",
        "contractor.document.read",
        "contractor.worker.read",
        "contractor.assignment.read",
        "contractor.evaluation.read",
        "contractor.report.export",
    ],
    // Modul 05 §3 "Karyawan / Worker | risk.jsa.acknowledge (sign-off sebelum
    // bekerja, hanya JSA terkait tugas)" (task 3.2) — role SUDAH ada di
    // roster baseline sejak 0.8, belum PERNAH dapat entri ROLE_PERMISSIONS
    // eksplisit sampai task ini (hanya AUTHENTICATED_USER_PERMISSIONS).
    // Modul 06 §3 "Requester (Worker/Contractor User) | work_permit.permit.create,
    // work_permit.permit.update (saat DRAFT), work_permit.permit.submit"
    // (task 3.3) — scope "hanya permit miliknya sendiri" ditegakkan
    // service-level (WorkPermitService), bukan lewat kode permission terpisah.
    [exports.ROLE_CODES.WORKER_EMPLOYEE]: [
        "risk.jsa.acknowledge",
        "work_permit.permit.create",
        "work_permit.permit.update",
        "work_permit.permit.submit",
        // Modul 06 §3 "Requester (Worker/Contractor User) | work_permit.extension.request,
        // work_permit.closure.request" (task 3.4).
        "work_permit.extension.request",
        "work_permit.closure.request",
        // Modul 07 §3 "Worker/Employee/Contractor User | incident.report.create"
        // + "Worker/Employee | incident.report.read (hanya laporan miliknya
        // sendiri — scope 'miliknya' ditegakkan service-level, bukan lewat kode
        // permission terpisah, pola sama work_permit.permit.* di atas)" (task 3.5).
        "incident.report.create",
        "incident.report.read",
        // Modul 08 §3 sisa (task 3.6), baris sama Supervisor/HSE Officer di atas
        // (Inspector mencakup Worker ditugaskan).
        "inspection.record.create",
        "inspection.finding.create",
        // Modul 14 §3 "Karyawan/Kontraktor/Visitor | emergency_response.muster_checkin.self_submit,
        // emergency_response.drill.view_own_participation" (task 3.7) +
        // activation.declare/team.view_own (kandidat anggota ERT, baris sama
        // Supervisor/HSE Officer — "Anggota ERT" §3 tidak membatasi ke role
        // tertentu).
        "emergency_response.muster_checkin.self_submit",
        "emergency_response.drill.view_own_participation",
        "emergency_response.activation.declare",
        "emergency_response.team.view_own",
        // Modul 11 §3 "Worker/Employee | quality.ncr.create (near-miss mutu di
        // lini)" (task 5.1) — PLUS "Customer Service/Sales | quality.complaint.create"
        // DILIPAT ke sini (TIDAK ada role baseline "Customer Service/Sales"
        // terpisah — permission set-nya sangat sempit/non-privileged, kandidat
        // plausible terdekat "any authenticated employee", gap TDD §26).
        "quality.ncr.create",
        "quality.complaint.create",
        // Modul 13 §3.2 "Karyawan/Worker | occupational_health.own_record.view,
        // occupational_health.subject_request.submit | Hanya data milik sendiri"
        // (task 5.3) — scope "milik sendiri" ditegakkan service-level, pola sama
        // work_permit.permit.* "miliknya sendiri" di atas.
        "occupational_health.own_record.view",
        "occupational_health.subject_request.submit",
        // Modul 15 §3 "Worker/Employee | asset.asset.read (terbatas aset di
        // areanya), asset.issue.report | Scope Site miliknya" (task 6.1) —
        // pembatasan "terbatas aset di areanya" ditegakkan service-level (pola
        // sama "miliknya sendiri" di atas), bukan lewat kode permission terpisah.
        "asset.asset.read",
        "asset.issue.report",
        // Modul 16 §3 "Worker/Employee (pengguna alat) | calibration.item.read
        // (status alat yang dipegang) | Terbatas pada aset yang ditugaskan
        // padanya" (task 6.2) — pembatasan "ditugaskan padanya" ditegakkan
        // service-level, pola sama "miliknya sendiri" di atas.
        "calibration.item.read",
        // Modul 17 §3 "Worker/Employee (PIC internal proyek) |
        // contractor.assignment.read, contractor.worker.read | Terbatas pada
        // proyek yang ditugaskan sebagai PIC" (task 6.3) — pembatasan "sebagai
        // PIC" ditegakkan service-level, pola sama "miliknya sendiri" di atas.
        "contractor.assignment.read",
        "contractor.worker.read",
    ],
    // Modul 05 §3 "Kontraktor (Contractor User) | risk.hiradc.create (utk
    // pekerjaan kontrak), risk.jsa.acknowledge" (task 3.2) — role SUDAH ada
    // di roster sejak 0.8, sama seperti WORKER_EMPLOYEE belum pernah dapat
    // grant eksplisit.
    // Modul 06 §3 sisa (task 3.3), baris sama WORKER_EMPLOYEE di atas
    // (Requester mencakup Worker MAUPUN Contractor User).
    [exports.ROLE_CODES.CONTRACTOR_USER]: [
        "risk.hiradc.create",
        "risk.jsa.acknowledge",
        "work_permit.permit.create",
        "work_permit.permit.update",
        "work_permit.permit.submit",
        // Modul 06 §3 sisa (task 3.4), baris sama WORKER_EMPLOYEE di atas.
        "work_permit.extension.request",
        "work_permit.closure.request",
        // Modul 07 §3 sisa (task 3.5), baris sama WORKER_EMPLOYEE di atas.
        "incident.report.create",
        "incident.report.read",
        // Modul 14 §3 sisa (task 3.7) — HANYA bucket "Karyawan/Kontraktor/Visitor"
        // literal (self_submit+view_own_participation), BEDA dari WORKER_EMPLOYEE
        // yang JUGA dapat activation.declare/team.view_own — kontraktor sbg
        // Incident Commander/anggota ERT tetap dan dianggap kurang plausible
        // organisasional, TIDAK diberikan di sini (interpretasi, bukan literal
        // PRD exclusion).
        "emergency_response.muster_checkin.self_submit",
        "emergency_response.drill.view_own_participation",
        // Modul 17 §3 "Contractor User | contractor.document.upload (dokumen
        // milik kontraktornya sendiri), contractor.worker.submit,
        // contractor.prequalification.submit | Terbatas ketat pada
        // contractor_id miliknya (data-scoping khusus, BUKAN hierarki
        // organisasi internal)" (task 6.3) — role INI SENDIRI yang PRD modul
        // ini deskripsikan detail (bukan cuma folded dari role lain), scope
        // contractor_id ditegakkan service-level (pola sama "miliknya sendiri"
        // di atas, TAPI berbasis contractor_id bukan tenant hierarchy/site).
        "contractor.document.upload",
        "contractor.worker.submit",
        "contractor.prequalification.submit",
    ],
    // Modul 14 §3 "Karyawan/Kontraktor/Visitor | emergency_response.muster_checkin.self_submit,
    // emergency_response.drill.view_own_participation" (task 3.7) — role
    // SUDAH ada di roster baseline sejak 0.8 (Master PRD §8, self-service
    // visitor), belum PERNAH dapat entri ROLE_PERMISSIONS eksplisit sampai
    // task ini (hanya AUTHENTICATED_USER_PERMISSIONS selama ini) — pola sama
    // OCCUPATIONAL_HEALTH_STAFF (3.5)/HSE_OFFICER pertama kali dapat grant.
    [exports.ROLE_CODES.VISITOR_SELF_SERVICE]: [
        "emergency_response.muster_checkin.self_submit",
        "emergency_response.drill.view_own_participation",
    ],
    [exports.ROLE_CODES.DOCUMENT_CONTROLLER]: [
        "dms.document.create",
        "dms.document.update",
        "dms.document.retire",
        "dms.version.create",
        "dms.version.submit_for_approval",
        "dms.category.manage",
        "dms.distribution.manage",
    ],
    // Modul 07 §3 "Occupational Health Staff | incident.report.update (field
    // klasifikasi medis terbatas)" (task 3.5) — role SUDAH ada di roster
    // baseline sejak 0.8 (Master PRD §8.4), belum PERNAH dapat entri
    // ROLE_PERMISSIONS eksplisit sampai task ini. Batasan "field non-detail
    // medis" TIDAK dapat ditegakkan RBAC (permission_code granularity-nya
    // per-entity, bukan per-field) — gap didokumentasikan TDD §26, pola sama
    // batasan field-level lain di codebase ini.
    // Task 5.3 (Modul 13 §3.2) — "Occupational Health Staff (whitelisted) |
    // read_phi, write, mcu.schedule, mcu.enter_result, fit_to_work.assess,
    // pak_case.manage, clinic_visit.manage, surveillance_program.manage |
    // Scope site/klinik ditugaskan, HANYA JIKA AKTIF di occupational_health_
    // authorized_users" — role INI SENDIRI (permission baseline) TIDAK CUKUP
    // membuka akses PHI, lihat banner comment blok OCCUPATIONAL_HEALTH_
    // PERMISSIONS + OccupationalHealthAccessControlService (task 256, BR-02
    // dual-gate bagian b, ditegakkan service-level terpisah dari RBAC ini).
    [exports.ROLE_CODES.OCCUPATIONAL_HEALTH_STAFF]: [
        "incident.report.update",
        "occupational_health.medical_record.read_phi",
        "occupational_health.medical_record.write",
        "occupational_health.mcu.schedule",
        "occupational_health.mcu.enter_result",
        "occupational_health.fit_to_work.assess",
        "occupational_health.pak_case.manage",
        "occupational_health.clinic_visit.manage",
        "occupational_health.surveillance_program.manage",
    ],
    [exports.ROLE_CODES.COMPLIANCE_OFFICER]: [
        "compliance.regulation.read",
        "compliance.regulation.update",
        "compliance.obligation.manage",
        "compliance.license.create",
        "compliance.license.update",
        "compliance.license.renew",
        "compliance.license.read",
        // Modul 13 §3.2 "DPO/Compliance Officer (jika ada di tenant) |
        // occupational_health.access_log.view, occupational_health.subject_
        // request.handle | Scope tenant, pengawasan kepatuhan UU PDP" (task
        // 5.3) — dipetakan role COMPLIANCE_OFFICER existing (task 2.2), lihat
        // banner comment blok OCCUPATIONAL_HEALTH_PERMISSIONS soal alasan
        // BUKAN role baru.
        "occupational_health.access_log.view",
        "occupational_health.subject_request.handle",
    ],
    // Modul 11 §3 "Quality Manager/QA Head | quality.ncr.approve_disposition,
    // quality.complaint.manage, quality.inspection.approve_deviation,
    // quality.supplier_evaluation.approve, quality.objective.manage" (task
    // 5.1, scope company/branch — "approval tertinggi modul mutu") — PLUS
    // view_all/export per entity yang genuinely dibutuhkan utk menjalankan
    // approval itu (baris literal PRD sendiri tidak lengkap tanpa "bisa
    // melihat apa yang mau di-approve").
    [exports.ROLE_CODES.QUALITY_MANAGER]: [
        "quality.ncr.view_all",
        "quality.ncr.approve_disposition",
        "quality.ncr.export",
        "quality.complaint.manage",
        "quality.complaint.view_all",
        "quality.complaint.export",
        "quality.inspection.view_all",
        "quality.inspection.approve_deviation",
        "quality.inspection.export",
        "quality.supplier_evaluation.approve",
        "quality.supplier_evaluation.view_all",
        "quality.supplier_evaluation.export",
        "quality.objective.manage",
        "quality.objective.view_all",
    ],
    // Modul 11 §3 "QC Inspector | quality.ncr.create, quality.inspection.create,
    // quality.inspection.submit" (task 5.1) — PLUS "Supplier Quality Engineer |
    // quality.supplier_evaluation.create, quality.supplier_evaluation.submit"
    // DILIPAT ke sini (TIDAK ada role baseline "Supplier Quality Engineer"
    // terpisah — kandidat plausible terdekat, sama-sama peran operasional QC,
    // gap TDD §26).
    [exports.ROLE_CODES.QC_INSPECTOR]: [
        "quality.ncr.create",
        "quality.inspection.create",
        "quality.inspection.submit",
        "quality.supplier_evaluation.create",
        "quality.supplier_evaluation.submit",
        // Modul 16 §3 "Calibration Coordinator | calibration.item.create,
        // calibration.item.update, calibration.schedule.manage,
        // calibration.certificate.create, calibration.certificate.upload |
        // Scope Company/Site" (task 6.2) — "Calibration Coordinator" TIDAK ADA
        // role terpisah di roster baseline, dipetakan QC_INSPECTOR existing
        // (persona eksekusi QA teknis hands-on di site, bentuk kerja paling
        // dekat, pola sama role-folding modul lain). "Calibration Provider
        // (Internal Lab User) | calibration.certificate.create" JUGA DILIPAT ke
        // sini — grant-nya subset dari Coordinator, TIDAK butuh role sempit
        // terpisah (PRD §3 sendiri sebut ini kondisional "jika lab internal
        // punya user sistem").
        "calibration.item.create",
        "calibration.item.update",
        "calibration.schedule.manage",
        "calibration.certificate.create",
        "calibration.certificate.upload",
    ],
    // Modul 12 §3 "Environmental Officer | environmental.aspect_impact.create,
    // environmental.monitoring.create, environmental.waste_manifest.manage,
    // environmental.proper_assessment.create | Scope site" (task 5.2) — match
    // literal.
    [exports.ROLE_CODES.ENVIRONMENTAL_OFFICER]: [
        "environmental.aspect_impact.create",
        "environmental.monitoring.create",
        "environmental.waste_manifest.manage",
        "environmental.proper_assessment.create",
    ],
    // Modul 12 §3 "TPS LB3 Officer/Waste Handler | environmental.waste_generation_log.create,
    // environmental.waste_manifest.create | Scope site, area TPS" (task 5.2) —
    // match literal.
    [exports.ROLE_CODES.TPS_LB3_OFFICER]: [
        "environmental.waste_generation_log.create",
        "environmental.waste_manifest.create",
    ],
};
function crudCodes(moduleCode, entity) {
    return CRUD.map((a) => `${moduleCode}.${entity}.${a.toLowerCase()}`);
}
async function upsertPermissionGroups(prisma) {
    const groupNames = [...new Set(ALL_PERMISSIONS.map((p) => p.groupName))];
    const groupIdByName = new Map();
    for (const name of groupNames) {
        const moduleCode = ALL_PERMISSIONS.find((p) => p.groupName === name).moduleCode;
        let group = await prisma.permissionGroup.findFirst({ where: { moduleCode, name } });
        if (!group) {
            group = await prisma.permissionGroup.create({ data: { moduleCode, name } });
        }
        groupIdByName.set(name, group.id);
    }
    return groupIdByName;
}
async function seedRbacBaseline(prisma) {
    const groupIdByName = await upsertPermissionGroups(prisma);
    const permissionIdByCode = new Map();
    for (const seed of ALL_PERMISSIONS) {
        // Task 3.3 — update: {} (create-if-missing) diganti REAL upsert setelah
        // ditemukan empiris: dua kode "work_permit.permit.approve"/
        // "work_permit.permit.read" SUDAH ADA di DB dev (dibuat 2026-07-23 oleh
        // fixture test RoleService/role.integration-spec — permission_code
        // generik dipakai sbg contoh, moduleCode-nya lowercase "work_permit"
        // & description NULL, TIDAK terkait modul Work Permit sungguhan yang
        // baru dibangun task 3.3 hari ini). update:{} lama akan diam-diam
        // MEMPERTAHANKAN moduleCode lowercase itu selamanya — EntitlementGuard
        // (cocokkan Permission.moduleCode ke tenant_subscriptions.includedModuleCodes)
        // akan salah gate kode "work_permit.permit.read" krn "work_permit"!=="WORK_PERMIT".
        // Real upsert (sinkron SELURUH field dari ALL_PERMISSIONS, satu-satunya
        // sumber kebenaran katalog ini) aman utk 120 permission lain yang
        // SUDAH benar (no-op, nilai sama) DAN memperbaiki tabrakan ini — pola
        // PERSIS fix seedSubscriptionPlans() (task 1.7, gap TDD §26 #63).
        const permission = await prisma.permission.upsert({
            where: { permissionCode: seed.code },
            update: {
                moduleCode: seed.moduleCode,
                entity: seed.entity,
                action: seed.action,
                permissionGroupId: groupIdByName.get(seed.groupName),
                description: seed.description,
            },
            create: {
                permissionCode: seed.code,
                moduleCode: seed.moduleCode,
                entity: seed.entity,
                action: seed.action,
                permissionGroupId: groupIdByName.get(seed.groupName),
                description: seed.description,
            },
        });
        permissionIdByCode.set(seed.code, permission.id);
    }
    const roleIdByCode = new Map();
    for (const seed of SYSTEM_ROLES) {
        let role = await prisma.role.findFirst({ where: { tenantId: null, roleCode: seed.roleCode } });
        if (!role) {
            role = await prisma.role.create({
                data: { tenantId: null, roleCode: seed.roleCode, name: seed.name, description: seed.description, isSystemRole: true },
            });
        }
        roleIdByCode.set(seed.roleCode, role.id);
    }
    for (const seed of SYSTEM_ROLES) {
        const roleId = roleIdByCode.get(seed.roleCode);
        const codes = [...(ROLE_PERMISSIONS[seed.roleCode] ?? []), ...AUTHENTICATED_USER_PERMISSIONS];
        for (const code of new Set(codes)) {
            const permissionId = permissionIdByCode.get(code);
            if (!permissionId) {
                throw new Error(`seed-rbac-baseline: role "${seed.roleCode}" mereferensikan permission_code "${code}" yang tidak ada di ALL_PERMISSIONS.`);
            }
            const existingLink = await prisma.rolePermission.findFirst({ where: { roleId, permissionId } });
            if (!existingLink) {
                await prisma.rolePermission.create({ data: { tenantId: null, roleId, permissionId } });
            }
        }
    }
}
async function main() {
    const prisma = new client_1.PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
    await seedRbacBaseline(prisma);
    // eslint-disable-next-line no-console
    console.log(`RBAC baseline siap: ${SYSTEM_ROLES.length} role, ${ALL_PERMISSIONS.length} permission.`);
    await prisma.$disconnect();
}
if (require.main === module) {
    main().catch((err) => {
        // eslint-disable-next-line no-console
        console.error(err);
        process.exit(1);
    });
}
