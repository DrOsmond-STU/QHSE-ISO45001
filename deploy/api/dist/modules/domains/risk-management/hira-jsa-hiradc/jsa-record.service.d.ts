import { JsaCrewAcknowledgement, JsaJobStep, JsaRecord, JsaStepHazard, Prisma } from "@prisma/client";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
import { NumberingService } from "../../../../platform/numbering/numbering.service";
import { WorkflowEngineService } from "../../../../platform/workflow-engine/workflow-engine.service";
import { RiskWorkflowBootstrapService } from "./risk-workflow-bootstrap.service";
export interface CreateJsaRecordInput {
    siteId: string;
    departmentId?: string;
    jobTitle: string;
    jobDescription?: string;
    preparedBy: string;
    assessmentDate: Date;
    validUntil?: Date;
    linkedHiraId?: string;
}
export interface AddJsaStepHazardInput {
    hazardId?: string;
    hazardDescriptionFreetext?: string;
    potentialRisk?: string;
    controlMeasures: string;
    ppeRequired?: string[];
}
export declare class JsaRecordService {
    private readonly prisma;
    private readonly numberingService;
    private readonly workflowEngineService;
    private readonly bootstrapService;
    constructor(prisma: PrismaService, numberingService: NumberingService, workflowEngineService: WorkflowEngineService, bootstrapService: RiskWorkflowBootstrapService);
    create(input: CreateJsaRecordInput): Promise<JsaRecord>;
    addJobStep(jsaId: string, sequenceNo: number, stepDescription: string): Promise<JsaJobStep>;
    addStepHazard(jsaStepId: string, input: AddJsaStepHazardInput): Promise<JsaStepHazard>;
    getById(jsaId: string): Promise<{
        jobSteps: ({
            stepHazards: {
                id: string;
                tenantId: string;
                createdAt: Date;
                updatedAt: Date;
                hazardId: string | null;
                hazardDescriptionFreetext: string | null;
                controlMeasures: string;
                ppeRequired: Prisma.JsonValue;
                jsaStepId: string;
                potentialRisk: string | null;
            }[];
        } & {
            id: string;
            tenantId: string;
            createdAt: Date;
            updatedAt: Date;
            sequenceNo: number;
            stepDescription: string;
            jsaId: string;
        })[];
        crewAcknowledgements: {
            id: string;
            tenantId: string;
            createdAt: Date;
            userId: string;
            acknowledgedAt: Date;
            jsaId: string;
            workDate: Date;
            signatureRef: string | null;
        }[];
    } & {
        status: import("@prisma/client").$Enums.JsaRecordStatus;
        id: string;
        tenantId: string;
        createdBy: string;
        createdAt: Date;
        updatedBy: string;
        updatedAt: Date;
        departmentId: string | null;
        siteId: string;
        jobTitle: string;
        deletedAt: Date | null;
        workflowInstanceId: string | null;
        preparedBy: string;
        reviewedBy: string | null;
        assessmentDate: Date;
        validUntil: Date | null;
        jsaNumber: string;
        jobDescription: string | null;
        linkedHiraId: string | null;
    }>;
    /**
     * PRD §4.2 poin 2 — submit memicu workflow_instances (module_code=RISK,
     * entity_type=jsa_record). jsa_records.status TETAP "DRAFT" sepanjang
     * proses (skema §5 literal TIDAK py status "sedang direview" terpisah,
     * lihat banner comment jsa-lifecycle.ts) — guard double-submit karena itu
     * pakai workflowInstanceId===null (bukan cek status), BUKAN
     * validateJsaRecordStatusTransition() (yang cuma menegakkan urutan 5
     * status literal, tidak cocok utk skenario "masih DRAFT tapi sudah
     * pernah/sedang disubmit").
     */
    submitForApproval(jsaId: string): Promise<JsaRecord>;
    /**
     * PRD §4.2 poin 3 — sign-off kru sebelum bekerja tiap shift (ISO 45001
     * §5.4). Hanya JSA ACTIVE yang bisa diakui (BR-08-ADJACENT: kalau belum
     * ACTIVE, belum ada versi disetujui utk diikuti kru). Unique constraint
     * DB (jsaId,userId,workDate) menegakkan "1 per user per work_date" —
     * P2002 diterjemahkan pesan bersih via withCleanUniqueViolation().
     */
    acknowledge(jsaId: string, userId: string, workDate: Date, signatureRef?: string): Promise<JsaCrewAcknowledgement>;
}
