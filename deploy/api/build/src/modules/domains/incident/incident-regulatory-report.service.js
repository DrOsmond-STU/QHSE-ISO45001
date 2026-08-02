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
exports.IncidentRegulatoryReportService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const incident_context_1 = require("./incident-context");
// PRD §5/§6 BR-03 — baris incident_regulatory_reports diciptakan OTOMATIS
// oleh IncidentInvestigationService.submitForApproval() (BR-03 auto-create),
// TIDAK ADA method create() manual di service ini — service ini murni
// melacak status kirim (PENDING->SUBMITTED->ACKNOWLEDGED), pola "1
// tracker/scan job" sama licenses_permits (2.2).
let IncidentRegulatoryReportService = class IncidentRegulatoryReportService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async submit(incidentRegulatoryReportId, officialReferenceNumber) {
        const updatedBy = (0, incident_context_1.requireActorUserId)();
        return this.prisma.withRls(async (tx) => {
            const report = await tx.incidentRegulatoryReport.findUniqueOrThrow({ where: { id: incidentRegulatoryReportId } });
            if (report.status !== "PENDING" && report.status !== "OVERDUE") {
                throw new common_1.BadRequestException(`incident_regulatory_reports berstatus ${report.status} tidak dapat disubmit (wajib PENDING/OVERDUE).`);
            }
            return tx.incidentRegulatoryReport.update({
                where: { id: incidentRegulatoryReportId },
                data: { status: "SUBMITTED", submittedDate: new Date(), submittedBy: updatedBy, officialReferenceNumber, updatedBy },
            });
        });
    }
    async acknowledge(incidentRegulatoryReportId) {
        const updatedBy = (0, incident_context_1.requireActorUserId)();
        return this.prisma.withRls(async (tx) => {
            const report = await tx.incidentRegulatoryReport.findUniqueOrThrow({ where: { id: incidentRegulatoryReportId } });
            if (report.status !== "SUBMITTED") {
                throw new common_1.BadRequestException(`incident_regulatory_reports berstatus ${report.status} tidak dapat diakui (wajib SUBMITTED).`);
            }
            return tx.incidentRegulatoryReport.update({ where: { id: incidentRegulatoryReportId }, data: { status: "ACKNOWLEDGED", updatedBy } });
        });
    }
    async listByReport(incidentReportId) {
        return this.prisma.withRls((tx) => tx.incidentRegulatoryReport.findMany({ where: { incidentReportId }, orderBy: { requiredByDate: "asc" } }));
    }
};
exports.IncidentRegulatoryReportService = IncidentRegulatoryReportService;
exports.IncidentRegulatoryReportService = IncidentRegulatoryReportService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], IncidentRegulatoryReportService);
