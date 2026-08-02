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
exports.EnvironmentalMonitoringRecordService = exports.ENV_MONITORING_CAPA_REQUIRED_EVENT = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const numbering_service_1 = require("../../../platform/numbering/numbering.service");
const notification_service_1 = require("../../../platform/notification/notification.service");
const environmental_context_1 = require("./environmental-context");
const monitoring_rules_1 = require("./monitoring-rules");
const environmental_workflow_bootstrap_service_1 = require("./environmental-workflow-bootstrap.service");
const MONITORING_NUMBERING_MODULE_CODE = "ENV_MONITORING";
const MONITORING_ATTACHMENT_ENTITY_TYPE = "environmental_monitoring_record";
// BR-02 — "compliance_status=EXCEED otomatis membuat draft CAPA" (PRD §4.2
// poin 2/§6, BEDA dari NCR 5.1 yang lunak "dapat memicu" — kata "otomatis"
// literal di sini) — diwujudkan EVENT STUB (EventEmitter2, pola PERSIS
// AuditFindingService.AUDIT_FINDING_CAPA_REQUIRED_EVENT 4.1), dikonsumsi
// EnvironmentalMonitoringCapaTriggerListener yg hidup DI DALAM CapaModule
// (bukan modul ini) — arah dependency SEARAH (CapaModule mengimpor
// EnvironmentalModule, BUKAN sebaliknya), pola sama Audit->CAPA 4.1/4.2.
exports.ENV_MONITORING_CAPA_REQUIRED_EVENT = "environmental.monitoring_capa_required";
/**
 * Task 5.2 (Modul 12 §4.2, §3 "Environmental Officer | environmental.monitoring.create",
 * "HSE Manager | environmental.monitoring.view_all"). BELUM ada controller
 * HTTP.
 */
let EnvironmentalMonitoringRecordService = class EnvironmentalMonitoringRecordService {
    prisma;
    numberingService;
    bootstrapService;
    eventEmitter;
    notificationService;
    constructor(prisma, numberingService, bootstrapService, eventEmitter, notificationService) {
        this.prisma = prisma;
        this.numberingService = numberingService;
        this.bootstrapService = bootstrapService;
        this.eventEmitter = eventEmitter;
        this.notificationService = notificationService;
    }
    async create(input) {
        const createdBy = (0, environmental_context_1.requireActorUserId)();
        const tenantId = (0, environmental_context_1.requireTenantId)();
        const identifiedAt = new Date();
        await this.bootstrapService.ensureMonitoringNumberingConfig(input.siteId);
        const site = await this.prisma.withRls((tx) => tx.site.findUniqueOrThrow({ where: { id: input.siteId }, select: { siteCode: true } }));
        const monitoringNumber = await this.numberingService.generateNext(MONITORING_NUMBERING_MODULE_CODE, {
            scopeId: input.siteId,
            variables: { SITE_CODE: site.siteCode },
        });
        const complianceStatus = (0, monitoring_rules_1.calculateComplianceStatus)(input.resultValue, input.bakuMutuMin ?? null, input.bakuMutuMax ?? null);
        const record = await this.prisma.withRls((tx) => tx.environmentalMonitoringRecord.create({
            data: {
                tenantId,
                siteId: input.siteId,
                monitoringNumber,
                monitoringType: input.monitoringType,
                monitoringPointCode: input.monitoringPointCode,
                monitoringPointName: input.monitoringPointName,
                parameterName: input.parameterName,
                unitOfMeasure: input.unitOfMeasure,
                resultValue: input.resultValue,
                bakuMutuMin: input.bakuMutuMin,
                bakuMutuMax: input.bakuMutuMax,
                regulatoryReference: input.regulatoryReference,
                complianceStatus,
                samplingDate: input.samplingDate,
                samplingTime: input.samplingTime,
                analysisMethod: input.analysisMethod,
                labName: input.labName,
                labAccreditationNo: input.labAccreditationNo,
                sampleTakenBy: input.sampleTakenBy,
                analyzedBy: input.analyzedBy,
                reportNumber: input.reportNumber,
                weatherCondition: input.weatherCondition,
                relatedPermitId: input.relatedPermitId,
                status: "RECORDED",
                createdBy,
                updatedBy: createdBy,
            },
        }));
        if (complianceStatus === "EXCEED") {
            const event = {
                tenantId,
                monitoringRecordId: record.id,
                siteId: record.siteId,
                monitoringNumber: record.monitoringNumber,
                parameterName: record.parameterName,
                resultValue: input.resultValue,
                identifiedBy: createdBy,
                identifiedAt,
            };
            this.eventEmitter.emit(exports.ENV_MONITORING_CAPA_REQUIRED_EVENT, event);
            // PRD §8 "compliance_status=EXCEED | HSE Manager, Top Management,
            // Environmental Officer | In-app, Email, WhatsApp". "Top Management"
            // dipetakan COMPANY_ADMIN (pola sama seluruh modul), pola query
            // recipients PERSIS NcrRecordService.create() 5.1 CRITICAL notif.
            const recipients = await this.prisma.withRls((tx) => tx.user.findMany({
                where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: { in: ["HSE_MANAGER", "COMPANY_ADMIN", "ENVIRONMENTAL_OFFICER"] } } } } },
                select: { id: true },
            }));
            for (const recipient of recipients) {
                await this.notificationService.enqueue({
                    eventType: "ENVIRONMENTAL_MONITORING_EXCEED",
                    entityType: "ENVIRONMENTAL_MONITORING_RECORD",
                    entityId: record.id,
                    recipientUserId: recipient.id,
                    priority: "CRITICAL",
                    eventCategory: "ENVIRONMENTAL",
                    variables: { parameterName: record.parameterName, monitoringPointName: record.monitoringPointName },
                });
            }
        }
        return record;
    }
    /** BR-07 — gate RECORDED->VERIFIED, hasLabReportAttachment dihitung dari attachments generik. */
    async verify(monitoringRecordId) {
        const updatedBy = (0, environmental_context_1.requireActorUserId)();
        const record = await this.prisma.withRls((tx) => tx.environmentalMonitoringRecord.findUniqueOrThrow({ where: { id: monitoringRecordId } }));
        (0, monitoring_rules_1.validateMonitoringRecordStatusTransition)(record.status, "VERIFIED");
        const attachmentCount = await this.prisma.withRls((tx) => tx.attachment.count({ where: { entityType: MONITORING_ATTACHMENT_ENTITY_TYPE, entityId: monitoringRecordId } }));
        (0, monitoring_rules_1.assertLabReportAttachedBeforeVerified)(attachmentCount > 0);
        return this.prisma.withRls((tx) => tx.environmentalMonitoringRecord.update({ where: { id: monitoringRecordId }, data: { status: "VERIFIED", updatedBy } }));
    }
    async markReportedToRegulator(monitoringRecordId) {
        const updatedBy = (0, environmental_context_1.requireActorUserId)();
        const record = await this.prisma.withRls((tx) => tx.environmentalMonitoringRecord.findUniqueOrThrow({ where: { id: monitoringRecordId } }));
        (0, monitoring_rules_1.validateMonitoringRecordStatusTransition)(record.status, "REPORTED_TO_REGULATOR");
        return this.prisma.withRls((tx) => tx.environmentalMonitoringRecord.update({ where: { id: monitoringRecordId }, data: { status: "REPORTED_TO_REGULATOR", updatedBy } }));
    }
    /** Dipanggil EnvironmentalMonitoringCapaTriggerListener (CapaModule) setelah capa_register dibuat. */
    async linkCapaRegister(monitoringRecordId, capaRegisterId) {
        return this.prisma.withRls((tx) => tx.environmentalMonitoringRecord.update({ where: { id: monitoringRecordId }, data: { capaRegisterId } }));
    }
    async getById(monitoringRecordId) {
        return this.prisma.withRls((tx) => tx.environmentalMonitoringRecord.findUniqueOrThrow({ where: { id: monitoringRecordId } }));
    }
    async listBySite(siteId) {
        return this.prisma.withRls((tx) => tx.environmentalMonitoringRecord.findMany({ where: { siteId }, orderBy: { createdAt: "desc" } }));
    }
};
exports.EnvironmentalMonitoringRecordService = EnvironmentalMonitoringRecordService;
exports.EnvironmentalMonitoringRecordService = EnvironmentalMonitoringRecordService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        numbering_service_1.NumberingService,
        environmental_workflow_bootstrap_service_1.EnvironmentalWorkflowBootstrapService,
        event_emitter_1.EventEmitter2,
        notification_service_1.NotificationService])
], EnvironmentalMonitoringRecordService);
//# sourceMappingURL=environmental-monitoring-record.service.js.map