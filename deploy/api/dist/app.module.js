"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const audit_module_1 = require("./modules/domains/audit/audit.module");
const capa_module_1 = require("./modules/domains/capa/capa.module");
const dms_module_1 = require("./modules/domains/dms/dms.module");
const emergency_response_module_1 = require("./modules/domains/emergency-response/emergency-response.module");
const environmental_module_1 = require("./modules/domains/environmental/environmental.module");
const incident_module_1 = require("./modules/domains/incident/incident.module");
const inspection_module_1 = require("./modules/domains/inspection/inspection.module");
const notification_domain_module_1 = require("./modules/domains/notification/notification-domain.module");
const occupational_health_module_1 = require("./modules/domains/occupational-health/occupational-health.module");
const asset_equipment_module_1 = require("./modules/domains/asset-equipment/asset-equipment.module");
const calibration_module_1 = require("./modules/domains/calibration/calibration.module");
const contractor_module_1 = require("./modules/domains/contractor/contractor.module");
const organization_module_1 = require("./modules/domains/organization/organization.module");
const quality_module_1 = require("./modules/domains/quality/quality.module");
const regulatory_compliance_module_1 = require("./modules/domains/regulatory-compliance/regulatory-compliance.module");
const hira_jsa_hiradc_module_1 = require("./modules/domains/risk-management/hira-jsa-hiradc/hira-jsa-hiradc.module");
const risk_matrix_module_1 = require("./modules/domains/risk-management/matrix/risk-matrix.module");
const system_administration_module_1 = require("./modules/domains/system-administration/system-administration.module");
const user_role_module_1 = require("./modules/domains/user-role/user-role.module");
const work_permit_module_1 = require("./modules/domains/work-permit/work-permit.module");
const attachment_module_1 = require("./platform/attachment/attachment.module");
const audit_log_module_1 = require("./platform/audit-log/audit-log.module");
const auth_module_1 = require("./platform/auth/auth.module");
const cron_runner_module_1 = require("./platform/cron-runner/cron-runner.module");
const entitlement_module_1 = require("./platform/entitlement/entitlement.module");
const health_module_1 = require("./platform/health/health.module");
const notification_module_1 = require("./platform/notification/notification.module");
const numbering_module_1 = require("./platform/numbering/numbering.module");
const observability_module_1 = require("./platform/observability/observability.module");
const rbac_module_1 = require("./platform/rbac/rbac.module");
const tenancy_module_1 = require("./platform/tenancy/tenancy.module");
const workflow_engine_module_1 = require("./platform/workflow-engine/workflow-engine.module");
// Phase 0 (bootstrap & shared platform layer) selesai di task 0.13. Modul
// domain (src/modules/domains/<module>) mulai Phase 1 — OrganizationModule
// (task 1.1, Modul 01) adalah yang PERTAMA.
//
// AuthModule mendaftarkan JwtAuthGuard sebagai APP_GUARD PERTAMA (global,
// fail closed by default) — route yang tidak butuh Bearer token wajib
// ditandai eksplisit @Public() (lihat platform/auth/public.decorator.ts).
// EntitlementModule (task 1.5, BR-01) mendaftarkan EntitlementGuard sebagai
// APP_GUARD KEDUA — SENGAJA diimpor SEBELUM RbacModule (urutan import
// menentukan urutan eksekusi guard) supaya blokir modul (BR-01, "secara
// PENUH") jalan LEBIH DULU dari cek permission granular. RbacModule
// mendaftarkan PermissionGuard sebagai APP_GUARD KETIGA — additive, no-op
// tanpa @RequirePermission() (lihat platform/rbac/permission.guard.ts).
// Kedua guard reuse metadata @RequirePermission() yang SAMA (EntitlementGuard
// meresolusi module_code dari Permission.moduleCode, BUKAN decorator baru
// @RequireModule() — lihat banner comment entitlement.guard.ts).
//
// EventEmitterModule.forRoot() — task 0.8, in-process event emitter (TDD
// §3.2) untuk role.changed/permission.changed (RBAC) DAN
// workflow.task.escalated/workflow.instance.completed (task 0.9).
// maxListeners:50 (task 4.1) — WORKFLOW_INSTANCE_COMPLETED_EVENT SEKARANG
// py 11 consumer (AuditProgramWorkflowCompletionListener/AuditReportWorkflowCompletionListener
// jadi ke-10 & ke-11), melewati default eventemitter2 (10) — bukan
// leak sungguhan (tiap listener beda modul, kerja terbatas & permanen by
// design), TAPI eventemitter2's logPossibleMemoryLeak() SENDIRI py bug
// (process.emitWarning() dgn Error object throw TypeError, bukan cuma
// warn, di kombinasi Node/eventemitter2 versi ini) — ditemukan EMPIRIS
// (seluruh test suite domain module manapun yang boot app penuh mendadak
// gagal total begitu listener ke-11 ditambahkan). Dinaikkan ke 50 (bukan
// 11) demi headroom Phase 4-10 lanjutan yang masih akan menambah consumer
// baru ke event generik yang sama.
//
// WorkflowEngineModule — task 0.9, WorkflowEngineService (belum ada
// controller HTTP, dipakai in-process oleh modul domain mulai Phase 1) +
// job workflow-sla-scan (BullMQ repeatable, terdaftar OnApplicationBootstrap).
//
// NumberingModule — task 0.10, NumberingService.generateNext() (belum ada
// controller HTTP maupun CRUD authoring — keduanya nanti, lihat banner
// comment "Task 0.10" di schema.prisma), dipakai in-process oleh modul
// domain mulai Phase 1.
//
// NotificationModule — task 0.11, NotificationService.enqueue() (murni
// write-side, dipakai in-process oleh modul domain mulai Phase 1).
// Konsumen BullMQ `notification-queue` jalan di proses worker terpisah
// (lihat apps/worker/src/notification.worker.ts + NotificationWorkerModule)
// — TIDAK didaftarkan di AppModule ini.
//
// AttachmentModule — task 0.12, endpoint HTTP PERTAMA di platform/* (POST
// /attachments/presign, POST /attachments/confirm, GET /attachments/:id/download)
// karena browser klien memanggilnya langsung (upload sungguhan terjadi DI
// BROWSER ke object storage, bukan lewat backend). Konsumen BullMQ
// `attachment-scan` jalan di proses worker terpisah (lihat
// apps/worker/src/attachment-scan.worker.ts + AttachmentWorkerModule) —
// TIDAK didaftarkan di AppModule ini.
//
// ObservabilityModule — task 0.13 (TDD §15), mendaftarkan
// CorrelationIdMiddleware + HttpObservabilityMiddleware (forRoutes("*"),
// urutan RELATIF terhadap TenantContextMiddleware milik TenancyModule TIDAK
// masalah — dua AsyncLocalStorage independen, tidak nested satu sama lain)
// + expose GET /metrics (@Public(), scrape Prometheus). AppLoggerService
// dipasang sebagai logger global Nest lewat app.useLogger() di main.ts.
//
// AuditLogModule — task 0.13, AuditLogService.record()/recordStandalone()
// (entri semantik manual — login/export/approve, belum ada pemanggil nyata
// di modul manapun sampai Phase 1+ butuh) + job
// audit-log-partition-maintenance (BullMQ repeatable cron bulanan). Trigger
// generik audit_log_capture() (mutasi create/update/delete otomatis)
// hidup di database (migration), BUKAN kode Nest — lihat
// prisma/audit-log-trigger.template.sql utk cara tabel domain Phase 1+
// melekatkannya (companies/branches/sites/departments sudah melekatkannya
// sejak task 1.1).
//
// OrganizationModule — task 1.1 (Modul 01), modul DOMAIN pertama
// (src/modules/domains/*, beda dari platform/* Phase 0). OrganizationService
// (belum ada controller HTTP — Goal literal TASK_INSTRUCTION.md 1.1 cuma
// minta tabel+service resolusi hierarki) + job reminder-scan (BullMQ
// repeatable cron harian, KONSUMEN PERTAMA — job generik dipakai bersama
// modul Phase 2+ lain nanti, TDD §13.1). Resolusi hierarki utk RBAC scope
// filter hidup di platform/rbac/ (lihat banner comment
// prisma-scope-hierarchy.resolver.ts), BUKAN di sini.
//
// UserRoleModule — task 1.3 (Modul 02), modul DOMAIN kedua. Memperluas
// users/roles/role_permissions/user_roles (subset auth-critical 0.6/0.8)
// jadi skema penuh + sso_mappings baru. UserService/RoleService/
// SsoMappingService belum ada controller HTTP (pola sama 1.1/1.2).
// Independen dari OrganizationModule (BR-03 scope validation query Prisma
// langsung, bukan impor OrganizationService — lihat banner comment
// UserService.assertScopeBelongsToTenant()). Task 1.4 (Delegation of
// Authority) menambah submodule delegation/* di modul yang sama.
//
// SystemAdministrationModule — task 1.5/1.6 (Modul 31), modul DOMAIN
// KETIGA — MODUL DOMAIN PERTAMA yang mengimpor modul domain LAIN
// (OrganizationModule + UserRoleModule, lihat banner comment
// ProvisioningService kenapa itu beda dari larangan platform->domain).
// ProvisioningService.provisionTenant() mengorkestrasi E2E-4 (TESTING.md
// §7). Belum ada controller HTTP (pola sama 1.1-1.4) SELAIN TenantCorsResolverService
// (platform/tenancy) yang dipakai main.ts, bukan lewat modul ini.
//
// NotificationDomainModule — task 1.7 (Modul 25), modul DOMAIN KEEMPAT —
// ENDPOINT HTTP PERTAMA di src/modules/domains/* (1.1-1.6 semua belum ada
// controller, lihat komentar masing-masing di atas). Dinamai
// "NotificationDomainModule" (bukan "NotificationModule" polos) supaya
// tidak collide impor dgn NotificationModule 0.11 di atas — keduanya
// SENGAJA hidup berdampingan, tidak saling impor (query langsung ke tabel
// `notifications`/`notification_preferences` via PrismaService, pola sama
// EntitlementCheckService 1.5 querying tabel domain lain langsung).
//
// DmsModule — task 2.1 (Modul 03), modul DOMAIN KELIMA, awal Phase 2. Belum
// ada controller HTTP (pola sama 1.1-1.6, Files task 2.1 TIDAK menyebut
// apps/web). DocumentWorkflowCompletionListener — KONSUMEN SUNGGUHAN
// PERTAMA WORKFLOW_INSTANCE_COMPLETED_EVENT (ada sejak 0.9, banner comment
// aslinya menduga 0.11/1.4 yang akan dengar — keduanya TIDAK PERNAH
// implementasi listener, diverifikasi grep bersih sebelum task ini).
// 2 job cron baru (document-review-scan 01:15, read-acknowledgement-scan
// 01:30, BullMQ repeatable OnApplicationBootstrap) — konsumennya jalan di
// proses worker terpisah (lihat apps/worker/src/*.worker.ts + DmsWorkerModule)
// — TIDAK didaftarkan DI SINI, pola sama seluruh job lain.
//
// RegulatoryComplianceModule — task 2.2 (Modul 04), modul DOMAIN KEENAM.
// Belum ada controller HTTP (pola sama seluruh modul domain Phase 2 sejauh
// ini). ComplianceEvaluationWorkflowCompletionListener — KONSUMEN KEDUA
// WORKFLOW_INSTANCE_COMPLETED_EVENT (pola PERSIS DocumentWorkflowCompletionListener
// di atas). 2 job cron baru (license-expiry-scan 01:45, obligation-due-scan
// 02:00) — konsumennya jalan di proses worker terpisah (lihat
// apps/worker/src/*.worker.ts + RegulatoryComplianceWorkerModule) — TIDAK
// didaftarkan DI SINI.
//
// RiskMatrixModule — task 3.1 (Modul 05, awal Phase 3), modul DOMAIN
// KETUJUH. Cakupan DIBATASI ke risk_matrix_configs/levels/cells +
// hazard_register saja (matriks risiko konfigurabel per tenant).
//
// HiraJsaHiradcModule — task 3.2 (Modul 05 sisa), SUBMODUL SAUDARA
// RiskMatrixModule (domain risk-management/ yang sama, BUKAN modul domain
// kedelapan terpisah) — hira_assessments/jsa_records/hiradc_records/
// risk_register/risk_treatment_plans. KONSUMEN KETIGA/KEEMPAT/KELIMA
// WORKFLOW_INSTANCE_COMPLETED_EVENT (HiraWorkflowCompletionListener/
// JsaWorkflowCompletionListener/HiradcWorkflowCompletionListener) — DAN
// pertama kali JSON Logic condition genuinely dipakai pada
// workflow_transitions (percabangan kondisional HIRA risiko EXTREME,
// E2E-3). 3 job cron baru (hiradc-expiry-scan 02:15, risk-register-review-scan
// 02:30, hira-review-due-scan 02:45) — konsumennya jalan di proses worker
// terpisah (lihat apps/worker/src/*.worker.ts + HiraJsaHiradcWorkerModule)
// — TIDAK didaftarkan DI SINI.
//
// WorkPermitModule — task 3.3 (Modul 06, tipe & alur inti), modul DOMAIN
// KEDELAPAN (BEDA dari risk-management/* — modul TERPISAH, hanya
// mereferensikan related_jsa_id ke JsaRecord, TIDAK mengimpor
// HiraJsaHiradcModule sama sekali, akses cross-module lewat FK Prisma
// langsung). KONSUMEN KEENAM WORKFLOW_INSTANCE_COMPLETED_EVENT
// (WorkPermitWorkflowCompletionListener) — KEDUA kalinya JSON Logic
// condition dipakai (percabangan kondisional BR-04 risk_level=HIGH/
// requires_hse_approval, pola PERSIS HIRA).
//
// Task 3.4 (extension, closure & cross-link) MELENGKAPI Modul 06 —
// work_permit_extensions/work_permit_closures. KONSUMEN KETUJUH
// WORKFLOW_INSTANCE_COMPLETED_EVENT (WorkPermitExtensionWorkflowCompletionListener)
// — KETIGA kalinya JSON Logic condition dipakai (percabangan kondisional
// extension entity_type=work_permit_extension, condition=gasRetestRequired).
// work_permit_closures TIDAK py workflow_instance sama sekali (verifikasi
// closure tindakan langsung satu orang, pola HIRADC self-verify 3.2). 2
// job cron baru (work-permit-expiry-scan 03:00 BR-07/E2E-1, gas-retest-due-scan
// 03:15 BR-05) — konsumennya jalan di proses worker terpisah (lihat
// apps/worker/src/*.worker.ts + WorkPermitWorkerModule) — TIDAK
// didaftarkan DI SINI.
//
// IncidentModule — task 3.5 (Modul 07 Incident Management), modul DOMAIN
// KESEMBILAN — hanya mereferensikan work_permits (Modul 06) via FK Prisma
// langsung, TIDAK mengimpor WorkPermitModule. KEDELAPAN KONSUMEN
// WORKFLOW_INSTANCE_COMPLETED_EVENT (IncidentWorkflowCompletionListener) —
// KEEMPAT kalinya JSON Logic condition dipakai (percabangan kondisional
// Stage 2 Persetujuan Pelaporan Regulator, entity_type=incident_investigation,
// condition=hasRegulatoryReport — auto-created BR-03 SAAT submit, bukan
// setelah approval, lihat banner comment IncidentWorkflowBootstrapService).
// incident_corrective_actions TAUTAN/LINK saja ke Modul 10 CAPA (BELUM ADA
// di codebase ini, task 4.2) — capaRegisterId bare UUID TANPA FK. 2 job cron
// baru (incident-regulatory-report-overdue-scan 03:30 BR-09,
// incident-statistics-recalc-scan 04:00 BR-06) — konsumennya jalan di
// proses worker terpisah (lihat apps/worker/src/*.worker.ts +
// IncidentWorkerModule) — TIDAK didaftarkan DI SINI.
//
// InspectionModule — task 3.6 (Modul 08 Inspection Management), modul
// DOMAIN KESEPULUH, TIDAK mengimpor domain module manapun. SATU-SATUNYA
// domain module Phase 2+ TANPA WorkflowEngineModule sama sekali (PRD §4
// poin 9 "TIDAK WAJIB Workflow Engine", opsional/tenant-configurable TIDAK
// diimplementasikan — gap TDD §26). Findings tertaut Modul 24 Action
// Tracking (BELUM ADA, task 7.4) via event `inspection.finding_created`
// (EventEmitter2 stub, TASK_INSTRUCTION.md literal), BUKAN FK/NestJS
// import. Numbering scope_level=SITE + reset_period=MONTHLY (PERTAMA di
// codebase yang genuinely menguji reset_period=MONTHLY, didukung sejak
// task 0.10 tapi baru dipakai di sini). 3 job cron baru
// (inspection-record-generation-scan 04:15, inspection-record-overdue-scan
// 04:30 BR-06, inspection-finding-sla-scan 04:45 BR-04) — konsumennya
// jalan di proses worker terpisah (lihat apps/worker/src/*.worker.ts +
// InspectionWorkerModule) — TIDAK didaftarkan DI SINI.
//
// EmergencyResponseModule — task 3.7 (Modul 14 Emergency Response), modul
// DOMAIN KESEBELAS — mereferensikan documents (Modul 03)/incident_reports
// (Modul 07) via FK Prisma LANGSUNG, TIDAK mengimpor DmsModule/IncidentModule.
// KESEMBILAN KONSUMEN WORKFLOW_INSTANCE_COMPLETED_EVENT
// (EmergencyResponseWorkflowCompletionListener) — KELIMA kalinya JSON
// Logic condition dipakai (percabangan kondisional Stage 2 Approval Level
// Tinggi, entity_type=emergency_response_plan, condition=severityLevel!=
// "LEVEL_1_LOCAL"). Acceptance criterion literal TASK_INSTRUCTION.md 3.7 —
// aktivasi darurat (trigger_context=REAL_EMERGENCY) memicu BROADCAST
// notifikasi prioritas CRITICAL ke seluruh karyawan/kontraktor di site +
// HSE Manager + Tenant Admin (Top Management, pola sama Incident 3.5),
// via loop sequential NotificationService.enqueue() (0.11) — TIDAK ada
// infrastruktur batch-notification baru. `emergency_equipment_readiness_checklist.asset_id`
// bare UUID TANPA FK MESKI NOT NULL (Modul 15 Asset & Equipment BELUM ADA,
// task 6.1, jauh di Phase 6 — "dependency wajib" PRD §5 tidak bisa
// dipenuhi sekarang). 1 job cron baru (emergency-plan-review-overdue-scan
// 05:00 BR-01) — konsumennya jalan di proses worker terpisah (lihat
// apps/worker/src/*.worker.ts + EmergencyResponseWorkerModule) — TIDAK
// didaftarkan DI SINI.
//
// AuditModule — task 4.1 (Modul 09 Audit Management), modul DOMAIN KEDUA
// BELAS, Phase 4 dimulai — mereferensikan documents (Modul 03) via FK
// Prisma LANGSUNG, TIDAK mengimpor DmsModule. PERTAMA KALI satu modul
// domain butuh DUA workflow_definitions process sekaligus (AUDIT_PROGRAM,
// AUDIT_REPORT — lihat banner comment schema.prisma), masing-masing py
// listener WORKFLOW_INSTANCE_COMPLETED_EVENT SENDIRI (AuditProgramWorkflowCompletionListener,
// AuditReportWorkflowCompletionListener — konsumen KESEPULUH & KESEBELAS).
// Stage 1 "Review Lead Auditor" (audit_report) approverType=CONTEXT_USER
// (KEDUA KALINYA dipakai lintas modul domain, setelah DMS 2.1) —
// contextData.contextUserId diisi dari audits.lead_auditor_id, BUKAN
// approver tetap. Modul 10 (CAPA, task 4.2) DAN Modul 19 (Training) BELUM
// ADA — audit_findings.capa_register_id/auditor_competency_records.
// related_training_record_id bare UUID nullable TANPA FK; AuditFindingService.create()
// emit event stub audit.finding_capa_required (EventEmitter2, pola sama
// inspection.finding_created 3.6) BILA requires_capa=true. 2 job cron baru
// (auditor-competency-expiry-scan 05:15, audit-finding-closure-due-scan
// 05:30 BR-04) — konsumennya jalan di proses worker terpisah (lihat
// apps/worker/src/*.worker.ts + AuditWorkerModule) — TIDAK didaftarkan DI SINI.
//
// CapaModule — task 4.2 (Modul 10 CAPA Management), modul DOMAIN KETIGA
// BELAS, menutup Phase 4. PERTAMA modul domain yang mengimpor DUA modul
// domain LAIN sekaligus (AuditModule + IncidentModule, lihat banner
// comment CapaModule/CapaEffectivenessVerificationWorkflowCompletionListener
// kenapa — hub CAPA genuinely butuh orkestrasi sync-back closure PRD §4
// poin 10 ke KEDUA sumber itu). Menutup stub capaId/capa_register_id bare-UUID
// yang ditinggalkan Incident 3.5, Inspection 3.6, Emergency Response 3.7
// (equipment checklist — TIDAK relevan CAPA, capaId di situ beda konteks),
// dan Audit 4.1 — SEMUA jadi FK real via migration retroaktif 3 ADD
// CONSTRAINT (incident_corrective_actions/audit_findings/inspection_findings).
// AuditFindingCapaTriggerListener — KONSUMEN SUNGGUHAN PERTAMA audit.finding_capa_required
// (stub sejak 4.1, PRD Modul 09 §4 poin 1 "CAPA dibuat OTOMATIS"). KEDUA
// listener WORKFLOW_INSTANCE_COMPLETED_EVENT baru (CapaActionPlanWorkflowCompletionListener,
// CapaEffectivenessVerificationWorkflowCompletionListener — konsumen
// KEDUABELAS & KETIGABELAS) utk DUA workflow_definitions process CAPA
// sendiri (capa_action_plan, capa_effectiveness_verification). Inspection
// (Modul 08) TIDAK diimpor — linkage ke CAPA murni MANUAL/OPSIONAL (PRD
// §7), escalateToCapa() 3.6 sudah menerima capaRegisterId caller-supplied
// sejak awal, TIDAK butuh orkestrasi CAPA->Inspection. 2 job cron baru
// (capa-root-cause-sla-scan 05:45, capa-effectiveness-verification-due-scan
// 06:00) — konsumennya jalan di proses worker terpisah (lihat
// apps/worker/src/*.worker.ts + CapaWorkerModule) — TIDAK didaftarkan DI SINI.
//
// QualityModule — task 5.1 (Modul 11 Quality Management), modul DOMAIN
// KELIMA BELAS, awal Phase 5. PERTAMA modul domain dgn EMPAT
// workflow_definitions process sekaligus (QUALITY_NCR/QUALITY_COMPLAINT
// 3-stage, QUALITY_INSPECTION_DEVIATION/QUALITY_SUPPLIER_EVAL 1-stage).
// TIDAK mengimpor modul domain lain — CAPA-linkage (ncr_records.capa_id,
// customer_complaints.capa_id, supplier_quality_records.capa_id) SELURUHNYA
// MANUAL (caller-supplied capaRegisterId, pola sama Incident 3.5), BEDA
// dari Audit 4.1 yang auto-trigger. CapaRegisterService (4.2) sendiri yang
// diperluas (BR-05, arah dependency SEARAH) memvalidasi source_type=
// QUALITY_NCR/CUSTOMER_COMPLAINT via FK Prisma langsung ke tabel modul ini.
// SATU job cron baru (quality-complaint-response-sla-scan 06:15 BR-02) —
// konsumennya jalan di proses worker terpisah (lihat
// apps/worker/src/*.worker.ts + QualityWorkerModule) — TIDAK didaftarkan DI SINI.
//
// EnvironmentalModule — task 5.2 (Modul 12 Environmental Management),
// modul DOMAIN KETUJUH BELAS, Phase 5 lanjut. DUA workflow_definitions
// process (ENV_ASPECT_REVIEW 2-stage, ENV_PROPER_ASSESSMENT 2-stage).
// TIDAK mengimpor CapaModule maupun RegulatoryComplianceModule (validasi
// silang via query Prisma langsung, arah dependency SEARAH — CapaModule
// SENDIRI yang mengimpor modul ini utk BR-02 auto-trigger CAPA saat
// compliance_status=EXCEED, lihat banner comment CapaModule). SATU job
// cron baru (waste-storage-duration-scan 06:30 BR-03) — konsumennya jalan
// di proses worker terpisah (lihat apps/worker/src/*.worker.ts +
// EnvironmentalWorkerModule) — TIDAK didaftarkan DI SINI.
//
// OccupationalHealthModule — task 5.3 (Modul 13 Occupational Health),
// modul DOMAIN KEDELAPAN BELAS, PALING SENSITIF platform (lihat banner
// comment blok Modul 13 schema.prisma + OccupationalHealthModule).
// TIDAK mengimpor CapaModule/UserRoleModule — CAPA-linkage MANUAL,
// BR-07 (gate onboarding) TIDAK di-wire nyata ke UserService (gap README).
// DUA job cron baru (mcu-reminder-scan 06:45, occupational-health-
// reassessment-scan 07:00) — konsumennya jalan di proses worker terpisah
// (lihat apps/worker/src/*.worker.ts + OccupationalHealthWorkerModule) —
// TIDAK didaftarkan DI SINI.
//
// AssetEquipmentModule — task 6.1 (Modul 15 Asset & Equipment Management),
// modul DOMAIN KESEMBILAN BELAS, Phase 6 dimulai (lihat banner comment
// blok AssetEquipmentModule). TIDAK mengimpor modul domain lain manapun
// (fondasi data utk Modul 08/14/16 yang merujuk BALIK ke modul ini). SATU
// job cron baru (maintenance-due-scan 06:45) — konsumennya jalan di proses
// worker terpisah (lihat apps/worker/src/*.worker.ts + AssetEquipmentWorkerModule)
// — TIDAK didaftarkan DI SINI.
//
// CalibrationModule — task 6.2 (Modul 16 Calibration Management), modul
// DOMAIN KEDUA PULUH (lihat banner comment blok CalibrationModule). SATU
// job cron baru (calibration-due-scan 07:00) — konsumennya jalan di proses
// worker terpisah (lihat apps/worker/src/*.worker.ts + CalibrationWorkerModule)
// — TIDAK didaftarkan DI SINI.
//
// ContractorModule — task 6.3 (Modul 17 Contractor Management), modul
// DOMAIN KEDUA PULUH SATU (lihat banner comment blok ContractorModule).
// SATU job cron baru (contractor-due-scan 07:15) — konsumennya jalan di
// proses worker terpisah (lihat apps/worker/src/*.worker.ts +
// ContractorWorkerModule) — TIDAK didaftarkan DI SINI. WorkPermitModule
// (3.3, LEBIH TUA) mengimpor ContractorModule LANGSUNG (BR-02, arah
// dependency terbalik dari kebiasaan — lihat banner comment
// work-permit.module.ts) — ContractorModule TETAP dicantumkan di sini juga
// (deklarasi eksplisit AppModule, pola sama modul lain meski technically
// sudah ter-import transitif lewat WorkPermitModule).
//
// CronRunnerModule — adaptasi shared-hosting cPanel (REDIS_ENABLED=false,
// lihat platform/scheduling/redis-enabled.helper.ts). Mengimpor ulang
// ke-20 *WorkerModule yang sudah ada (BUKAN duplikasi wiring — provider
// sama, Nest dedupe otomatis) supaya ke-31 scan service yang tadinya CUMA
// dikonsumsi apps/worker proses terpisah lewat BullMQ, sekarang JUGA bisa
// dipicu langsung via HTTP dari proses apps/api yang sama (lihat
// cron-runner.controller.ts POST /internal/cron/run-scans, dipanggil
// cPanel Cron Job). Deployment VPS/Docker/K8s existing TIDAK terpengaruh —
// endpoint ini idle kalau tidak pernah dipanggil.
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            event_emitter_1.EventEmitterModule.forRoot({ maxListeners: 50 }),
            health_module_1.HealthModule,
            tenancy_module_1.TenancyModule,
            observability_module_1.ObservabilityModule,
            auth_module_1.AuthModule,
            cron_runner_module_1.CronRunnerModule,
            entitlement_module_1.EntitlementModule,
            rbac_module_1.RbacModule,
            workflow_engine_module_1.WorkflowEngineModule,
            numbering_module_1.NumberingModule,
            notification_module_1.NotificationModule,
            attachment_module_1.AttachmentModule,
            audit_log_module_1.AuditLogModule,
            organization_module_1.OrganizationModule,
            user_role_module_1.UserRoleModule,
            system_administration_module_1.SystemAdministrationModule,
            notification_domain_module_1.NotificationDomainModule,
            dms_module_1.DmsModule,
            regulatory_compliance_module_1.RegulatoryComplianceModule,
            risk_matrix_module_1.RiskMatrixModule,
            hira_jsa_hiradc_module_1.HiraJsaHiradcModule,
            work_permit_module_1.WorkPermitModule,
            incident_module_1.IncidentModule,
            inspection_module_1.InspectionModule,
            emergency_response_module_1.EmergencyResponseModule,
            audit_module_1.AuditModule,
            capa_module_1.CapaModule,
            quality_module_1.QualityModule,
            environmental_module_1.EnvironmentalModule,
            occupational_health_module_1.OccupationalHealthModule,
            asset_equipment_module_1.AssetEquipmentModule,
            calibration_module_1.CalibrationModule,
            contractor_module_1.ContractorModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map