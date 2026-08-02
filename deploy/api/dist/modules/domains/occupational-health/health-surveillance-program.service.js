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
exports.HealthSurveillanceProgramService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const occupational_health_context_1 = require("./occupational-health-context");
// PRD §4.5 — target_population_criteria SENGAJA "deskripsi non-sensitif
// (jabatan/area), BUKAN daftar nama" (§5), jadi TIDAK ada kolom [ENCRYPTED]
// sama sekali di tabel ini/enrollments — TIDAK melalui dual-gate BR-02
// (bukan data klinis mentah), CRUD biasa.
let HealthSurveillanceProgramService = class HealthSurveillanceProgramService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(input) {
        const tenantId = (0, occupational_health_context_1.requireTenantId)();
        const actorUserId = (0, occupational_health_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.healthSurveillanceProgram.create({
            data: {
                tenantId,
                siteId: input.siteId,
                departmentId: input.departmentId,
                programName: input.programName,
                exposureType: input.exposureType,
                relatedHiraId: input.relatedHiraId,
                targetPopulationCriteria: input.targetPopulationCriteria,
                monitoringFrequency: input.monitoringFrequency,
                mcuPackageRequired: input.mcuPackageRequired,
                programOwner: actorUserId,
                startDate: input.startDate,
                reviewDate: input.reviewDate,
                status: "ACTIVE",
                createdBy: actorUserId,
                updatedBy: actorUserId,
            },
        }));
    }
    async transitionStatus(id, status) {
        const actorUserId = (0, occupational_health_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.healthSurveillanceProgram.update({ where: { id }, data: { status, updatedBy: actorUserId } }));
    }
    async getById(id) {
        return this.prisma.withRls((tx) => tx.healthSurveillanceProgram.findUniqueOrThrow({ where: { id } }));
    }
    async listBySite(siteId) {
        const tenantId = (0, occupational_health_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => tx.healthSurveillanceProgram.findMany({ where: { tenantId, siteId } }));
    }
    async enroll(healthSurveillanceProgramId, employeeUserId, enrollmentDate) {
        const tenantId = (0, occupational_health_context_1.requireTenantId)();
        const actorUserId = (0, occupational_health_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.healthSurveillanceEnrollment.create({
            data: {
                tenantId,
                healthSurveillanceProgramId,
                employeeUserId,
                enrollmentDate,
                createdBy: actorUserId,
                updatedBy: actorUserId,
            },
        }));
    }
    async exitEnrollment(enrollmentId, exitDate, exitReason) {
        const actorUserId = (0, occupational_health_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.healthSurveillanceEnrollment.update({
            where: { id: enrollmentId },
            data: { exitDate, exitReason, updatedBy: actorUserId },
        }));
    }
    async listEnrollmentsByProgram(healthSurveillanceProgramId) {
        const tenantId = (0, occupational_health_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => tx.healthSurveillanceEnrollment.findMany({ where: { tenantId, healthSurveillanceProgramId } }));
    }
    async listActiveEnrollmentsByEmployee(employeeUserId) {
        const tenantId = (0, occupational_health_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => tx.healthSurveillanceEnrollment.findMany({ where: { tenantId, employeeUserId, exitDate: null } }));
    }
};
exports.HealthSurveillanceProgramService = HealthSurveillanceProgramService;
exports.HealthSurveillanceProgramService = HealthSurveillanceProgramService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], HealthSurveillanceProgramService);
//# sourceMappingURL=health-surveillance-program.service.js.map