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
var EnvironmentalMonitoringCapaTriggerListener_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvironmentalMonitoringCapaTriggerListener = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
const environmental_monitoring_record_service_1 = require("../environmental/environmental-monitoring-record.service");
const capa_register_service_1 = require("./capa-register.service");
/**
 * Task 5.2 — konsumen SUNGGUHAN PERTAMA `environmental.monitoring_capa_required`
 * (event stub, TIDAK ada listener sebelum task ini krn Environmental baru
 * dibangun task ini juga — beda dari `audit.finding_capa_required` 4.1
 * yang sempat jadi stub TANPA konsumen selama satu task penuh sebelum
 * CAPA 4.2 ada). PRD Modul 12 §6 BR-02 "compliance_status=EXCEED otomatis
 * membuat draft CAPA" — listener ini yang mewujudkan kata "otomatis" itu:
 * buat `capa_register` (source_type=ENVIRONMENTAL_MONITORING) LALU
 * `EnvironmentalMonitoringRecordService.linkCapaRegister()` menulis balik
 * FK-nya. `userId` context diambil dari `payload.identifiedBy`, pola
 * PERSIS `AuditFindingCapaTriggerListener` 4.2.
 *
 * CapaModule mengimpor EnvironmentalModule (arah domain->domain diizinkan
 * utk orkestrasi, KETIGA kalinya CapaModule jadi hub setelah Audit+Incident
 * 4.2) — modul SUMBER (Environmental) TIDAK mengimpor CapaModule sama
 * sekali, arah ketergantungan SEARAH.
 */
let EnvironmentalMonitoringCapaTriggerListener = EnvironmentalMonitoringCapaTriggerListener_1 = class EnvironmentalMonitoringCapaTriggerListener {
    prisma;
    capaRegisterService;
    monitoringRecordService;
    logger = new common_1.Logger(EnvironmentalMonitoringCapaTriggerListener_1.name);
    constructor(prisma, capaRegisterService, monitoringRecordService) {
        this.prisma = prisma;
        this.capaRegisterService = capaRegisterService;
        this.monitoringRecordService = monitoringRecordService;
    }
    async onEnvironmentalMonitoringCapaRequired(payload) {
        await tenant_context_1.tenantContextStorage.run({ tenantId: payload.tenantId, userId: payload.identifiedBy }, async () => {
            try {
                const record = await this.prisma.withRls((tx) => tx.environmentalMonitoringRecord.findUniqueOrThrow({ where: { id: payload.monitoringRecordId }, select: { capaRegisterId: true, siteId: true } }));
                if (record.capaRegisterId)
                    return; // idempotent — sudah pernah ditautkan.
                const capa = await this.capaRegisterService.create({
                    sourceType: "ENVIRONMENTAL_MONITORING",
                    sourceId: payload.monitoringRecordId,
                    sourceReferenceNumber: payload.monitoringNumber,
                    category: "CORRECTIVE",
                    priority: "HIGH",
                    title: `Parameter ${payload.parameterName} melebihi baku mutu — ${payload.monitoringNumber}`,
                    problemStatement: `environmental_monitoring_records ${payload.monitoringNumber}: parameter "${payload.parameterName}" hasil ${payload.resultValue} EXCEED baku mutu (BR-02).`,
                    siteId: payload.siteId,
                });
                await this.monitoringRecordService.linkCapaRegister(payload.monitoringRecordId, capa.id);
            }
            catch (err) {
                this.logger.error(`Gagal memproses ${environmental_monitoring_record_service_1.ENV_MONITORING_CAPA_REQUIRED_EVENT} utk monitoring_record=${payload.monitoringRecordId}: ${err instanceof Error ? err.message : err}`);
            }
        });
    }
};
exports.EnvironmentalMonitoringCapaTriggerListener = EnvironmentalMonitoringCapaTriggerListener;
__decorate([
    (0, event_emitter_1.OnEvent)(environmental_monitoring_record_service_1.ENV_MONITORING_CAPA_REQUIRED_EVENT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EnvironmentalMonitoringCapaTriggerListener.prototype, "onEnvironmentalMonitoringCapaRequired", null);
exports.EnvironmentalMonitoringCapaTriggerListener = EnvironmentalMonitoringCapaTriggerListener = EnvironmentalMonitoringCapaTriggerListener_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        capa_register_service_1.CapaRegisterService,
        environmental_monitoring_record_service_1.EnvironmentalMonitoringRecordService])
], EnvironmentalMonitoringCapaTriggerListener);
