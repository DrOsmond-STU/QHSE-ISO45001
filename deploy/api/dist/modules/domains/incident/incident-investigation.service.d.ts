import { IncidentInvestigation, IncidentInvestigationMethod, IncidentInvestigationTeam, IncidentInvestigationTeamRole, IncidentRootCause, IncidentRootCauseCategory, IncidentRootCauseType } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { WorkflowEngineService } from "../../../platform/workflow-engine/workflow-engine.service";
import { IncidentWorkflowBootstrapService } from "./incident-workflow-bootstrap.service";
export interface CreateIncidentInvestigationInput {
    incidentReportId: string;
    method: IncidentInvestigationMethod;
    methodOtherDetail?: string;
    leadInvestigatorId: string;
    startedAt: Date;
    targetCompletionAt: Date;
}
export interface RecordIncidentRootCauseInput {
    causeType: IncidentRootCauseType;
    category: IncidentRootCauseCategory;
    description: string;
    methodReference?: string;
    sequenceNo?: number;
}
export declare class IncidentInvestigationService {
    private readonly prisma;
    private readonly workflowEngineService;
    private readonly bootstrapService;
    constructor(prisma: PrismaService, workflowEngineService: WorkflowEngineService, bootstrapService: IncidentWorkflowBootstrapService);
    /** PRD §4 poin 4 "wajib utk FATALITY/LTI/PSE/RESTRICTED_WORK_CASE;
     * opsional/sampling lainnya" — TIDAK ditegakkan sbg guard DI SINI (siapa
     * pun dgn permission boleh membuat investigasi utk klasifikasi apa pun,
     * termasuk NEAR_MISS "sampling") — hanya BR-01 (gate CLOSED) yang
     * genuinely menegakkan kewajiban utk 3 klasifikasi spesifik. */
    create(input: CreateIncidentInvestigationInput): Promise<IncidentInvestigation>;
    assignTeam(incidentInvestigationId: string, userId: string, roleInTeam: IncidentInvestigationTeamRole): Promise<IncidentInvestigationTeam>;
    recordRootCause(incidentInvestigationId: string, input: RecordIncidentRootCauseInput): Promise<IncidentRootCause>;
    /**
     * PRD §4 poin 7-8 — Review & Approval via Workflow Engine
     * (entity_type=incident_investigation), diikuti (BR-03) pembuatan
     * incident_regulatory_reports otomatis kalau classification permit induk
     * masuk kategori wajib lapor. Auto-create regulatory report DI SINI (SAAT
     * submit, BUKAN setelah approval — lihat banner comment
     * IncidentWorkflowBootstrapService.ensureWorkflowDefinition()) supaya
     * Stage 2 workflow ini SENDIRI (kondisional hasRegulatoryReport) punya
     * data yang genuinely sudah ada saat kondisi dievaluasi — interpretasi
     * urutan §4 poin 7 vs 8 didokumentasikan TDD §26. EMPAT transaksi
     * terpisah, pola PERSIS WorkPermitExtensionService.request() (3.4).
     */
    submitForApproval(incidentInvestigationId: string): Promise<IncidentInvestigation>;
    getById(incidentInvestigationId: string): Promise<{
        team: {
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            deletedAt: Date | null;
            userId: string;
            roleInTeam: import("@prisma/client").$Enums.IncidentInvestigationTeamRole;
            incidentInvestigationId: string;
        }[];
        rootCauses: {
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            deletedAt: Date | null;
            sequenceNo: number | null;
            description: string;
            category: import("@prisma/client").$Enums.IncidentRootCauseCategory;
            incidentInvestigationId: string;
            causeType: import("@prisma/client").$Enums.IncidentRootCauseType;
            methodReference: string | null;
        }[];
    } & {
        method: import("@prisma/client").$Enums.IncidentInvestigationMethod;
        status: import("@prisma/client").$Enums.IncidentInvestigationStatus;
        id: string;
        tenantId: string;
        createdBy: string;
        createdAt: Date;
        updatedBy: string;
        updatedAt: Date;
        deletedAt: Date | null;
        startedAt: Date;
        completedAt: Date | null;
        workflowInstanceId: string | null;
        incidentReportId: string;
        methodOtherDetail: string | null;
        leadInvestigatorId: string;
        targetCompletionAt: Date;
        findingsSummary: string | null;
    }>;
}
