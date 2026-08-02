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
exports.EmergencyDrillService = void 0;
const common_1 = require("@nestjs/common");
const numbering_service_1 = require("../../../platform/numbering/numbering.service");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const emergency_response_context_1 = require("./emergency-response-context");
const emergency_drill_rules_1 = require("./emergency-drill-rules");
const emergency_response_workflow_bootstrap_service_1 = require("./emergency-response-workflow-bootstrap.service");
const EMERGENCY_DRILL_NUMBERING_MODULE_CODE = "EMERGENCY_DRILL";
// Task 3.7 (Modul 14 §4.3/§6 BR-04/BR-08). BELUM ada controller HTTP.
let EmergencyDrillService = class EmergencyDrillService {
    prisma;
    numberingService;
    bootstrapService;
    constructor(prisma, numberingService, bootstrapService) {
        this.prisma = prisma;
        this.numberingService = numberingService;
        this.bootstrapService = bootstrapService;
    }
    async create(input) {
        const createdBy = (0, emergency_response_context_1.requireActorUserId)();
        const tenantId = (0, emergency_response_context_1.requireTenantId)();
        await this.bootstrapService.ensureDrillNumberingConfig(input.siteId);
        const site = await this.prisma.withRls((tx) => tx.site.findUniqueOrThrow({ where: { id: input.siteId }, select: { siteCode: true } }));
        const drillNumber = await this.numberingService.generateNext(EMERGENCY_DRILL_NUMBERING_MODULE_CODE, {
            scopeId: input.siteId,
            variables: { SITE_CODE: site.siteCode },
        });
        return this.prisma.withRls((tx) => tx.emergencyDrill.create({
            data: {
                tenantId,
                siteId: input.siteId,
                drillNumber,
                emergencyResponsePlanId: input.emergencyResponsePlanId,
                drillType: input.drillType,
                scheduledDate: input.scheduledDate,
                objective: input.objective,
                scenarioDescription: input.scenarioDescription,
                plannedParticipantCount: input.plannedParticipantCount,
                evacuationTimeTargetMinutes: input.evacuationTimeTargetMinutes,
                conductedBy: input.conductedBy,
                status: "PLANNED",
                createdBy,
                updatedBy: createdBy,
            },
        }));
    }
    async start(emergencyDrillId) {
        const updatedBy = (0, emergency_response_context_1.requireActorUserId)();
        return this.prisma.withRls(async (tx) => {
            const drill = await tx.emergencyDrill.findUniqueOrThrow({ where: { id: emergencyDrillId } });
            (0, emergency_drill_rules_1.validateEmergencyDrillStatusTransition)(drill.status, "IN_PROGRESS");
            return tx.emergencyDrill.update({
                where: { id: emergencyDrillId },
                data: { status: "IN_PROGRESS", actualDate: drill.actualDate ?? new Date(), updatedBy },
            });
        });
    }
    /** PRD §4.3 poin 3-4 — "HSE Officer/Marshal mencatat kehadiran manual utk
     * yang tidak dapat mengakses aplikasi" + "actual_participant_count
     * denormalized dari drill_participation_logs." Recompute HANYA menghitung
     * baris attendance_status=PRESENT (ABSENT/EXCUSED TIDAK dihitung sbg
     * "berpartisipasi"). */
    async recordParticipation(emergencyDrillId, input) {
        const createdBy = (0, emergency_response_context_1.requireActorUserId)();
        const tenantId = (0, emergency_response_context_1.requireTenantId)();
        return this.prisma.withRls(async (tx) => {
            const log = await tx.drillParticipationLog.create({
                data: {
                    tenantId,
                    emergencyDrillId,
                    userId: input.userId,
                    participantName: input.participantName,
                    participantType: input.participantType,
                    roleDuringDrill: input.roleDuringDrill,
                    attendanceStatus: input.attendanceStatus,
                    performanceNotes: input.performanceNotes,
                    createdBy,
                    updatedBy: createdBy,
                },
            });
            const actualParticipantCount = await tx.drillParticipationLog.count({ where: { emergencyDrillId, attendanceStatus: "PRESENT" } });
            await tx.emergencyDrill.update({ where: { id: emergencyDrillId }, data: { actualParticipantCount } });
            return log;
        });
    }
    /** BR-04 (FULL_SCALE_EVACUATION wajib >=1 emergency_activations) + BR-08
     * (capa_id wajib kalau gapsIdentified terisi) ditegakkan SEBELUM menulis
     * status COMPLETED. */
    async complete(emergencyDrillId, input) {
        const updatedBy = (0, emergency_response_context_1.requireActorUserId)();
        return this.prisma.withRls(async (tx) => {
            const drill = await tx.emergencyDrill.findUniqueOrThrow({ where: { id: emergencyDrillId } });
            (0, emergency_drill_rules_1.validateEmergencyDrillStatusTransition)(drill.status, "COMPLETED");
            const activationCount = await tx.emergencyActivation.count({ where: { relatedEmergencyDrillId: emergencyDrillId } });
            (0, emergency_drill_rules_1.assertActivationExistsIfFullScaleEvacuation)(drill.drillType, activationCount);
            (0, emergency_drill_rules_1.assertCapaLinkedIfGapsIdentified)(input.gapsIdentified, input.capaId);
            return tx.emergencyDrill.update({
                where: { id: emergencyDrillId },
                data: {
                    status: "COMPLETED",
                    evacuationTimeActualMinutes: input.evacuationTimeActualMinutes,
                    observerNotes: input.observerNotes,
                    gapsIdentified: input.gapsIdentified,
                    capaId: input.capaId,
                    updatedBy,
                },
            });
        });
    }
    async cancel(emergencyDrillId) {
        const updatedBy = (0, emergency_response_context_1.requireActorUserId)();
        return this.prisma.withRls(async (tx) => {
            const drill = await tx.emergencyDrill.findUniqueOrThrow({ where: { id: emergencyDrillId } });
            (0, emergency_drill_rules_1.validateEmergencyDrillStatusTransition)(drill.status, "CANCELLED");
            return tx.emergencyDrill.update({ where: { id: emergencyDrillId }, data: { status: "CANCELLED", updatedBy } });
        });
    }
    async getById(emergencyDrillId) {
        return this.prisma.withRls((tx) => tx.emergencyDrill.findUniqueOrThrow({ where: { id: emergencyDrillId }, include: { participationLogs: true, activations: true } }));
    }
    async listBySite(siteId) {
        return this.prisma.withRls((tx) => tx.emergencyDrill.findMany({ where: { siteId, deletedAt: null }, orderBy: { scheduledDate: "desc" } }));
    }
};
exports.EmergencyDrillService = EmergencyDrillService;
exports.EmergencyDrillService = EmergencyDrillService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        numbering_service_1.NumberingService,
        emergency_response_workflow_bootstrap_service_1.EmergencyResponseWorkflowBootstrapService])
], EmergencyDrillService);
