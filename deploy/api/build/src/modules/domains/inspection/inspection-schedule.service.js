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
exports.InspectionScheduleService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const inspection_context_1 = require("./inspection-context");
// Task 3.6 (Modul 08 §3 "HSE Manager | inspection.schedule.create,
// inspection.schedule.assign", §4 poin 2). BELUM ada controller HTTP.
let InspectionScheduleService = class InspectionScheduleService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(input) {
        const createdBy = (0, inspection_context_1.requireActorUserId)();
        const tenantId = (0, inspection_context_1.requireTenantId)();
        const site = await this.prisma.withRls((tx) => tx.site.findUniqueOrThrow({ where: { id: input.siteId }, select: { companyId: true, branchId: true } }));
        return this.prisma.withRls((tx) => tx.inspectionSchedule.create({
            data: {
                tenantId,
                inspectionChecklistTemplateId: input.inspectionChecklistTemplateId,
                companyId: site.companyId,
                branchId: site.branchId,
                siteId: input.siteId,
                departmentId: input.departmentId,
                recurrencePattern: input.recurrencePattern,
                recurrenceDetail: input.recurrenceDetail,
                defaultAssignedInspectorId: input.defaultAssignedInspectorId,
                startDate: input.startDate,
                endDate: input.endDate,
                nextGenerationDate: input.nextGenerationDate,
                isActive: true,
                createdBy,
                updatedBy: createdBy,
            },
        }));
    }
    async getById(inspectionScheduleId) {
        return this.prisma.withRls((tx) => tx.inspectionSchedule.findUniqueOrThrow({ where: { id: inspectionScheduleId } }));
    }
    async deactivate(inspectionScheduleId) {
        const updatedBy = (0, inspection_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.inspectionSchedule.update({ where: { id: inspectionScheduleId }, data: { isActive: false, updatedBy } }));
    }
};
exports.InspectionScheduleService = InspectionScheduleService;
exports.InspectionScheduleService = InspectionScheduleService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InspectionScheduleService);
