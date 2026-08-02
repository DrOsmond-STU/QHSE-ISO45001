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
exports.RestrictedDutyAssignmentService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const fit_to_work_lifecycle_1 = require("./fit-to-work-lifecycle");
const occupational_health_context_1 = require("./occupational-health-context");
// §3.1 poin 5 + catatan desain PRD di tabel ini: "SENGAJA tidak memiliki
// foreign key langsung ke kolom klinis... menegakkan batas isolasi akses
// SECARA STRUKTURAL." Konsisten dgn itu, service ini TIDAK punya
// dependency ke FieldEncryptionService/OccupationalHealthAccessControlService/
// MedicalRecordAccessLogService SAMA SEKALI — bukan oversight, desain.
let RestrictedDutyAssignmentService = class RestrictedDutyAssignmentService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(input) {
        const tenantId = (0, occupational_health_context_1.requireTenantId)();
        const actorUserId = (0, occupational_health_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.restrictedDutyAssignment.create({
            data: {
                tenantId,
                siteId: input.siteId,
                departmentId: input.departmentId,
                employeeUserId: input.employeeUserId,
                fitToWorkAssessmentId: input.fitToWorkAssessmentId,
                restrictionType: input.restrictionType,
                alternativeTaskDescription: input.alternativeTaskDescription,
                assignedBy: actorUserId,
                startDate: input.startDate,
                endDate: input.endDate,
                status: "ACTIVE",
                createdBy: actorUserId,
                updatedBy: actorUserId,
            },
        }));
    }
    async confirmCompliance(id) {
        const actorUserId = (0, occupational_health_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.restrictedDutyAssignment.update({
            where: { id },
            data: { complianceConfirmedBySupervisor: true, updatedBy: actorUserId },
        }));
    }
    async transitionStatus(id, to) {
        const actorUserId = (0, occupational_health_context_1.requireActorUserId)();
        const existing = await this.prisma.withRls((tx) => tx.restrictedDutyAssignment.findUniqueOrThrow({ where: { id } }));
        (0, fit_to_work_lifecycle_1.validateRestrictedDutyAssignmentStatusTransition)(existing.status, to);
        return this.prisma.withRls((tx) => tx.restrictedDutyAssignment.update({ where: { id }, data: { status: to, updatedBy: actorUserId } }));
    }
    async getById(id) {
        return this.prisma.withRls((tx) => tx.restrictedDutyAssignment.findUniqueOrThrow({ where: { id } }));
    }
    async listByEmployee(employeeUserId) {
        const tenantId = (0, occupational_health_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => tx.restrictedDutyAssignment.findMany({ where: { tenantId, employeeUserId }, orderBy: { startDate: "desc" } }));
    }
    async listBySite(siteId, status) {
        const tenantId = (0, occupational_health_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => tx.restrictedDutyAssignment.findMany({ where: { tenantId, siteId, status }, orderBy: { startDate: "desc" } }));
    }
};
exports.RestrictedDutyAssignmentService = RestrictedDutyAssignmentService;
exports.RestrictedDutyAssignmentService = RestrictedDutyAssignmentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RestrictedDutyAssignmentService);
