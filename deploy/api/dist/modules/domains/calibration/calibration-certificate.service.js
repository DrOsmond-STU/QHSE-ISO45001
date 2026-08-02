"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalibrationCertificateService = exports.CERTIFICATE_WORKFLOW_ENTITY_TYPE = void 0;
const common_1 = require("@nestjs/common");
const audit_log_service_1 = require("../../../platform/audit-log/audit-log.service");
const notification_service_1 = require("../../../platform/notification/notification.service");
const numbering_service_1 = require("../../../platform/numbering/numbering.service");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const workflow_engine_service_1 = require("../../../platform/workflow-engine/workflow-engine.service");
const calibration_schedule_service_1 = require("./calibration-schedule.service");
const calibration_context_1 = require("./calibration-context");
const calibration_lifecycle_1 = require("./calibration-lifecycle");
const out_of_tolerance_record_service_1 = require("./out-of-tolerance-record.service");
const CALIBRATION_CERT_NUMBERING_MODULE_CODE = "CALIBRATION_CERT";
const CALIBRATION_CERT_NUMBERING_PATTERN = "CAL-CERT/{SITE_CODE}/{YYYY}/{SEQ:4}";
// §4.1 poin 7 — jadwal berikutnya reuse module_code numbering MILIK
// CalibrationScheduleService ("CALIBRATION_WO") — string literal HARUS
// identik dgn konstanta privat di sana (tidak diekspor, duplikasi kecil
// SENGAJA, pola sama asset-equipment-context.ts, gap TDD §26 poin 29).
const CALIBRATION_SCHEDULE_NUMBERING_MODULE_CODE = "CALIBRATION_WO";
// §4.1 poin 6 — "direkomendasikan memakai Workflow Engine generik,
// entity_type='calibration_certificate', 1 stage (Review Quality/HSE
// Officer), SLA disarankan 3x24 jam." TIDAK ada baris §4 workflow_definitions
// konfigurasi terpisah (mis. approver role persis) — "Quality/HSE Officer"
// dipetakan HSE_OFFICER existing (lihat banner comment seed-rbac-baseline.ts),
// pola sama AssetTransferService.ensureDisposalWorkflowDefinition() (6.1):
// bootstrap privat di sini, BUKAN service/file terpisah (satu-satunya
// workflow modul ini, beda dari modul dgn banyak workflow_definitions).
const CERTIFICATE_WORKFLOW_MODULE_CODE = "CALIBRATION_CERTIFICATE_REVIEW";
const CERTIFICATE_WORKFLOW_NAME = "Calibration Certificate Review — 1 Stage (Quality/HSE Officer)";
const CERTIFICATE_STAGE_SLA_HOURS = 72; // "3x24 jam" literal PRD
exports.CERTIFICATE_WORKFLOW_ENTITY_TYPE = "calibration_certificate";
let CalibrationCertificateService = class CalibrationCertificateService {
    prisma;
    numbering;
    workflowEngine;
    notificationService;
    auditLogService;
    ootService;
    scheduleService;
    constructor(prisma, numbering, workflowEngine, notificationService, auditLogService, ootService, scheduleService) {
        this.prisma = prisma;
        this.numbering = numbering;
        this.workflowEngine = workflowEngine;
        this.notificationService = notificationService;
        this.auditLogService = auditLogService;
        this.ootService = ootService;
        this.scheduleService = scheduleService;
    }
    async ensureNumberingConfig(siteId) {
        const tenantId = (0, calibration_context_1.requireTenantId)();
        return this.prisma.withRls(async (tx) => {
            const existing = await tx.numberingConfig.findFirst({ where: { tenantId, moduleCode: CALIBRATION_CERT_NUMBERING_MODULE_CODE, scopeId: siteId } });
            if (existing)
                return existing;
            return tx.numberingConfig.create({
                data: {
                    tenantId,
                    moduleCode: CALIBRATION_CERT_NUMBERING_MODULE_CODE,
                    pattern: CALIBRATION_CERT_NUMBERING_PATTERN,
                    prefix: "CAL-CERT",
                    resetPeriod: "YEARLY",
                    scopeLevel: "SITE",
                    scopeId: siteId,
                },
            });
        });
    }
    // §4.1 poin 5 "Penerimaan Sertifikat" — status DRAFT (diagram §4.3), BR-03
    // next_due_date SELALU server-computed, BR-04 auto-OOT kalau FAIL
    // ("disimpan" = saat create(), TIDAK bergantung hasil review).
    async create(input) {
        const tenantId = (0, calibration_context_1.requireTenantId)();
        const actorUserId = (0, calibration_context_1.requireActorUserId)();
        const item = await this.prisma.withRls((tx) => tx.calibrationItem.findUniqueOrThrow({ where: { id: input.calibrationItemId } }));
        await this.ensureNumberingConfig(item.siteId);
        const site = await this.prisma.withRls((tx) => tx.site.findUniqueOrThrow({ where: { id: item.siteId }, select: { siteCode: true } }));
        const internalReferenceNo = await this.numbering.generateNext(CALIBRATION_CERT_NUMBERING_MODULE_CODE, {
            scopeId: item.siteId,
            variables: { SITE_CODE: site.siteCode },
        });
        const nextDueDate = (0, calibration_lifecycle_1.calculateNextCalibrationDueDate)(input.calibrationDate, item.calibrationIntervalMonths);
        const certificate = await this.prisma.withRls((tx) => tx.calibrationCertificate.create({
            data: {
                tenantId,
                calibrationScheduleId: input.calibrationScheduleId,
                calibrationItemId: input.calibrationItemId,
                internalReferenceNo,
                certificateNo: input.certificateNo,
                calibrationProviderId: input.calibrationProviderId,
                calibrationDate: input.calibrationDate,
                nextDueDate,
                calibrationResult: input.calibrationResult,
                asFoundCondition: input.asFoundCondition,
                asLeftCondition: input.asLeftCondition,
                measurementUncertainty: input.measurementUncertainty,
                referenceStandardUsed: input.referenceStandardUsed,
                environmentalConditions: (input.environmentalConditions ?? undefined),
                createdBy: actorUserId,
                updatedBy: actorUserId,
            },
        }));
        if ((0, calibration_lifecycle_1.shouldAutoCreateOutOfToleranceRecord)(input.calibrationResult)) {
            await this.ootService.createFromFailedCertificate(certificate, item);
        }
        return certificate;
    }
    // §4.1 poin 6 — DRAFT->ISSUED + mulai Workflow Engine dalam SATU aksi (PRD
    // tidak deskripsikan langkah manual terpisah antara "issued" dan "mulai
    // review" — dibaca sbg momen yang sama, gap TDD §26). BR-05 gate akreditasi
    // ditegakkan DI SINI (SEBELUM workflow dimulai), bukan pasca-approval —
    // desain dipilih supaya tidak ada state "approved tapi tetap bukan
    // REVIEWED" yang janggal, gap TDD §26 (PRD tidak eksplisit titik penegakan).
    async submitForReview(id, overrideJustification) {
        const actorUserId = (0, calibration_context_1.requireActorUserId)();
        const certificate = await this.prisma.withRls((tx) => tx.calibrationCertificate.findUniqueOrThrow({ where: { id } }));
        const provider = await this.prisma.withRls((tx) => tx.calibrationProvider.findUniqueOrThrow({ where: { id: certificate.calibrationProviderId } }));
        if (!(0, calibration_lifecycle_1.isCertificateReviewAllowedByAccreditation)(provider.providerType, provider.accreditationValidUntil, certificate.calibrationDate)) {
            if (!overrideJustification) {
                throw new common_1.BadRequestException("BR-05 — akreditasi provider sudah lewat pada calibration_date. Review ditolak kecuali override manual dengan justifikasi (system_audit_logs).");
            }
            // system_audit_logs.action @db.VarChar(20) (Master PRD §11.6 poin 6 —
            // enumerasi kata pendek create/update/delete/APPROVE/EXPORT/LOGIN),
            // gap TDD §26 ditemukan disini: string deskriptif panjang meledak
            // batas kolom (pelajaran sama task 3.7, "column too long" gotcha).
            await this.auditLogService.recordStandalone({
                action: "OVERRIDE",
                entityType: "calibration_certificate",
                entityId: id,
                afterValue: { overrideJustification },
            });
        }
        const definition = await this.prisma.withRls((tx) => this.ensureCertificateWorkflowDefinition(tx));
        const instance = await this.workflowEngine.startInstance(exports.CERTIFICATE_WORKFLOW_ENTITY_TYPE, id, definition.id, {
            certificateNo: certificate.certificateNo,
            calibrationResult: certificate.calibrationResult,
        });
        return this.prisma.withRls((tx) => tx.calibrationCertificate.update({ where: { id }, data: { status: "ISSUED", workflowInstanceId: instance.id, updatedBy: actorUserId } }));
    }
    // Dipanggil CalibrationCertificateReviewCompletionListener. APPROVED ->
    // REVIEWED + BR §4.1 poin 7 (hasil PASS -> jadwal berikutnya OTOMATIS;
    // CONDITIONAL_PASS SENGAJA TIDAK, PRD literal "dengan hasil PASS" saja,
    // gap TDD §26). REJECTED -> workflowInstanceId null, status TETAP ISSUED
    // (resubmit via submitForReview() lagi pasca-koreksi, PRD tidak
    // deskripsikan status "review-rejected" terpisah, gap TDD §26).
    async onReviewCompleted(certificateId, approved) {
        if (!approved) {
            await this.prisma.withRls((tx) => tx.calibrationCertificate.update({ where: { id: certificateId }, data: { workflowInstanceId: null } }));
            return;
        }
        const certificate = await this.prisma.withRls((tx) => tx.calibrationCertificate.update({
            where: { id: certificateId },
            data: { status: "REVIEWED", isReviewed: true, reviewedAt: new Date(), workflowInstanceId: null },
        }));
        if (certificate.calibrationResult === "PASS") {
            await this.createNextSchedule(certificate);
        }
    }
    async createNextSchedule(certificate) {
        const tenantId = (0, calibration_context_1.requireTenantId)();
        const item = await this.prisma.withRls((tx) => tx.calibrationItem.findUniqueOrThrow({ where: { id: certificate.calibrationItemId } }));
        // BUG ditemukan+diperbaiki via integration test (task 290) — sebelumnya
        // memanggil this.ensureNumberingConfig() (module_code CALIBRATION_CERT
        // milik sertifikat SENDIRI), BUKAN config CALIBRATION_WO milik jadwal
        // yang genuinely mau dibuat — generateNext() throw "config tidak
        // ditemukan" tiap kali listener ini genuinely dipicu review APPROVED+PASS,
        // gagal senyap (listener try/catch, lihat CalibrationCertificateReviewCompletionListener).
        await this.scheduleService.ensureNumberingConfig(item.siteId);
        const site = await this.prisma.withRls((tx) => tx.site.findUniqueOrThrow({ where: { id: item.siteId }, select: { siteCode: true } }));
        const calibrationWoNo = await this.numbering.generateNext(CALIBRATION_SCHEDULE_NUMBERING_MODULE_CODE, {
            scopeId: item.siteId,
            variables: { SITE_CODE: site.siteCode },
        });
        await this.prisma.withRls((tx) => tx.calibrationSchedule.create({
            data: {
                tenantId,
                calibrationItemId: item.id,
                calibrationWoNo,
                dueDate: certificate.nextDueDate,
                assignedProviderId: certificate.calibrationProviderId,
                // system-generated — tidak ada actor manusia di titik ini
                // (listener-driven, pola sama Asset 6.1 disposal listener).
                createdBy: certificate.createdBy,
                updatedBy: certificate.createdBy,
            },
        }));
    }
    async ensureCertificateWorkflowDefinition(tx) {
        const tenantId = (0, calibration_context_1.requireTenantId)();
        const existing = await tx.workflowDefinition.findFirst({
            where: { tenantId, moduleCode: CERTIFICATE_WORKFLOW_MODULE_CODE, isActive: true },
            orderBy: { version: "desc" },
        });
        if (existing)
            return existing;
        const hseOfficerRole = await tx.role.findFirst({ where: { tenantId: null, roleCode: "HSE_OFFICER" } });
        if (!hseOfficerRole) {
            throw new common_1.NotFoundException('Role sistem "HSE_OFFICER" tidak ditemukan — RBAC baseline (seed-rbac-baseline.ts) wajib dijalankan sebelum modul Calibration bisa membuat workflow_definitions review sertifikat.');
        }
        const definition = await tx.workflowDefinition.create({
            data: { tenantId, moduleCode: CERTIFICATE_WORKFLOW_MODULE_CODE, name: CERTIFICATE_WORKFLOW_NAME, isActive: true, version: 1 },
        });
        const stage1 = await tx.workflowStage.create({
            data: {
                tenantId,
                workflowDefinitionId: definition.id,
                sequenceNo: 1,
                stageName: "Review Quality/HSE Officer",
                approverType: "ROLE_IN_SCOPE",
                approverRoleId: hseOfficerRole.id,
                slaHours: CERTIFICATE_STAGE_SLA_HOURS,
                escalationAction: "NOTIFY_SUPERIOR",
                allowDelegation: true,
            },
        });
        await tx.workflowTransition.createMany({
            data: [
                { tenantId, workflowDefinitionId: definition.id, fromStageId: stage1.id, toStageId: null, triggerAction: "APPROVE", resultStatus: "APPROVED" },
                { tenantId, workflowDefinitionId: definition.id, fromStageId: stage1.id, toStageId: null, triggerAction: "REJECT", resultStatus: "REJECTED" },
            ],
        });
        return definition;
    }
};
exports.CalibrationCertificateService = CalibrationCertificateService;
exports.CalibrationCertificateService = CalibrationCertificateService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        numbering_service_1.NumberingService,
        workflow_engine_service_1.WorkflowEngineService,
        notification_service_1.NotificationService,
        audit_log_service_1.AuditLogService,
        out_of_tolerance_record_service_1.OutOfToleranceRecordService,
        calibration_schedule_service_1.CalibrationScheduleService])
], CalibrationCertificateService);
//# sourceMappingURL=calibration-certificate.service.js.map