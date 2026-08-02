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
exports.IncidentReportService = void 0;
const common_1 = require("@nestjs/common");
const numbering_service_1 = require("../../../platform/numbering/numbering.service");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const incident_context_1 = require("./incident-context");
const incident_workflow_bootstrap_service_1 = require("./incident-workflow-bootstrap.service");
const incident_investigation_rules_1 = require("./incident-investigation-rules");
const incident_lifecycle_1 = require("./incident-lifecycle");
const incident_regulatory_report_rules_1 = require("./incident-regulatory-report-rules");
const incident_severity_1 = require("./incident-severity");
const INCIDENT_NUMBERING_MODULE_CODE = "INCIDENT";
// Task 3.5 (Modul 07 §4/§5/§6). BELUM ada controller HTTP (pola sama
// seluruh modul domain Phase 2+) — incident.* sudah di-seed RBAC baseline
// (task 153).
let IncidentReportService = class IncidentReportService {
    prisma;
    numberingService;
    bootstrapService;
    constructor(prisma, numberingService, bootstrapService) {
        this.prisma = prisma;
        this.numberingService = numberingService;
        this.bootstrapService = bootstrapService;
    }
    /**
     * PRD §4 poin 1 "siapa pun membuat incident_reports dgn informasi minimal."
     * incident_number DIGENERATE SAAT CREATE (bukan ditunda), pola PERSIS
     * WorkPermitService.create() (3.3). BR-04 — reportedBy WAJIB null kalau
     * isAnonymous=TRUE (satu-satunya titik dimana kombinasi itu ditentukan;
     * TIDAK ADA method update() yang bisa mengubahnya nanti, jadi "tidak
     * dapat diubah menjadi anonim setelah submit" terpenuhi BY CONSTRUCTION).
     * classification AWAL = initialClassification (sama persis, blm
     * difinalisasi HSE Officer — lihat classify()). severityLevel dihitung
     * dari initialClassification saat ini (computeSeverityLevel(), incident-severity.ts
     * — gap TDD §26, PRD tidak menyediakan tabel pemetaan literal).
     */
    async create(input) {
        const createdBy = (0, incident_context_1.requireActorUserId)();
        const tenantId = (0, incident_context_1.requireTenantId)();
        if (input.isAnonymous && input.reportedBy) {
            throw new common_1.BadRequestException("incident_reports.reportedBy wajib kosong kalau isAnonymous=TRUE (BR-04).");
        }
        await this.bootstrapService.ensureNumberingConfig(input.siteId);
        const site = await this.prisma.withRls((tx) => tx.site.findUniqueOrThrow({ where: { id: input.siteId }, select: { siteCode: true, companyId: true, branchId: true } }));
        const incidentNumber = await this.numberingService.generateNext(INCIDENT_NUMBERING_MODULE_CODE, {
            scopeId: input.siteId,
            variables: { SITE_CODE: site.siteCode },
        });
        return this.prisma.withRls((tx) => tx.incidentReport.create({
            data: {
                tenantId,
                incidentNumber,
                companyId: site.companyId,
                branchId: site.branchId,
                siteId: input.siteId,
                departmentId: input.departmentId,
                classification: input.initialClassification,
                initialClassification: input.initialClassification,
                severityLevel: (0, incident_severity_1.computeSeverityLevel)(input.initialClassification),
                incidentDatetime: input.incidentDatetime,
                locationDetail: input.locationDetail,
                description: input.description,
                immediateActionTaken: input.immediateActionTaken,
                reportedBy: input.isAnonymous ? null : input.reportedBy,
                isAnonymous: input.isAnonymous ?? false,
                injuredPersonId: input.injuredPersonId,
                workPermitId: input.workPermitId,
                involvesContractor: input.involvesContractor ?? false,
                contractorCompanyId: input.contractorCompanyId,
                status: "REPORTED",
                daysLost: input.daysLost,
                estimatedCost: input.estimatedCost,
                customFields: input.customFields ?? {},
                createdBy,
                updatedBy: createdBy,
            },
        }));
    }
    /**
     * PRD §4 poin 3 "Verifikasi/triase — HSE Officer memfinalisasi
     * classification (dapat berbeda dari initial_classification, perubahan
     * tercatat di audit log)." BR-02 — jejak perubahan terpenuhi lewat
     * audit_log_trigger generik (TIDAK ada tabel riwayat classification
     * terpisah, pola sama correctRiskLevel() Work Permit 3.3). "memicu
     * perhitungan ulang incident_statistics_cache periode terkait" DIBACA
     * sbg terpenuhi PASIF oleh scan harian berikutnya (BR-06 eksplisit
     * "TIDAK dihitung on-the-fly") — TIDAK ADA panggilan recalc SINKRON di
     * sini, gap didokumentasikan TDD §26. severityLevel ikut dihitung ulang
     * dari classification BARU. status REPORTED->UNDER_VERIFICATION kalau
     * masih REPORTED (reklasifikasi di status LEBIH LANJUT tetap diizinkan
     * tanpa transisi status tambahan — BR-02 tidak membatasi kapan).
     */
    async classify(incidentReportId, classification) {
        const updatedBy = (0, incident_context_1.requireActorUserId)();
        return this.prisma.withRls(async (tx) => {
            const report = await tx.incidentReport.findUniqueOrThrow({ where: { id: incidentReportId } });
            const data = {
                classification,
                severityLevel: (0, incident_severity_1.computeSeverityLevel)(classification),
                updatedBy,
            };
            if (report.status === "REPORTED") {
                (0, incident_lifecycle_1.validateIncidentReportStatusTransition)("REPORTED", "UNDER_VERIFICATION");
                data.status = "UNDER_VERIFICATION";
            }
            return tx.incidentReport.update({ where: { id: incidentReportId }, data });
        });
    }
    async getById(incidentReportId) {
        return this.prisma.withRls((tx) => tx.incidentReport.findUniqueOrThrow({
            where: { id: incidentReportId },
            include: { investigations: true, witnessStatements: true, regulatoryReports: true, correctiveActionLinks: true },
        }));
    }
    /**
     * BR-01 + BR-09 gate, ditegakkan SEBELUM tulis apa pun. Status sumber
     * BOLEH UNDER_VERIFICATION (insiden ringan tanpa investigasi wajib,
     * langsung ditutup), INVESTIGATION_COMPLETED, ATAU PENDING_REGULATORY_REPORT
     * (validateIncidentReportStatusTransition menegakkan mana yang genuinely
     * valid utk baris ini).
     */
    async close(incidentReportId) {
        const updatedBy = (0, incident_context_1.requireActorUserId)();
        return this.prisma.withRls(async (tx) => {
            const report = await tx.incidentReport.findUniqueOrThrow({ where: { id: incidentReportId } });
            (0, incident_lifecycle_1.validateIncidentReportStatusTransition)(report.status, "CLOSED");
            const latestInvestigation = await tx.incidentInvestigation.findFirst({
                where: { incidentReportId },
                orderBy: { createdAt: "desc" },
                select: { status: true },
            });
            (0, incident_investigation_rules_1.assertInvestigationApprovedIfRequiredForClosure)(report.classification, latestInvestigation?.status ?? null);
            const regulatoryReports = await tx.incidentRegulatoryReport.findMany({ where: { incidentReportId }, select: { status: true } });
            (0, incident_regulatory_report_rules_1.assertNoPendingOrOverdueRegulatoryReports)(regulatoryReports);
            return tx.incidentReport.update({ where: { id: incidentReportId }, data: { status: "CLOSED", updatedBy } });
        });
    }
    /** PRD §5 enum incident_reports.status "REOPENED" + ERD "bisa >1
     * incident_investigations jika REOPENED" — investigasi BARU dibuat
     * terpisah oleh IncidentInvestigationService setelah ini (REOPENED->
     * UNDER_INVESTIGATION, lihat incident-lifecycle.ts). */
    async reopen(incidentReportId) {
        const updatedBy = (0, incident_context_1.requireActorUserId)();
        return this.prisma.withRls(async (tx) => {
            const report = await tx.incidentReport.findUniqueOrThrow({ where: { id: incidentReportId } });
            (0, incident_lifecycle_1.validateIncidentReportStatusTransition)(report.status, "REOPENED");
            return tx.incidentReport.update({ where: { id: incidentReportId }, data: { status: "REOPENED", updatedBy } });
        });
    }
};
exports.IncidentReportService = IncidentReportService;
exports.IncidentReportService = IncidentReportService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        numbering_service_1.NumberingService,
        incident_workflow_bootstrap_service_1.IncidentWorkflowBootstrapService])
], IncidentReportService);
//# sourceMappingURL=incident-report.service.js.map