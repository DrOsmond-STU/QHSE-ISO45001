import { WorkPermitExtension } from "@prisma/client";
import { ActOnTaskResult, WorkflowEngineService } from "../../../platform/workflow-engine/workflow-engine.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { WorkPermitWorkflowBootstrapService } from "./work-permit-workflow-bootstrap.service";
export interface RequestWorkPermitExtensionInput {
    workPermitId: string;
    requestedNewEndDatetime: Date;
    reason: string;
    gasRetestRequired: boolean;
    requestedBy: string;
}
export declare class WorkPermitExtensionService {
    private readonly prisma;
    private readonly workflowEngineService;
    private readonly bootstrapService;
    constructor(prisma: PrismaService, workflowEngineService: WorkflowEngineService, bootstrapService: WorkPermitWorkflowBootstrapService);
    /**
     * BR-07 (gate pengajuan) + PRD §4 poin 8. EMPAT transaksi TERPISAH,
     * alasan PERSIS HiraAssessmentService.submitForApproval() (3.2) —
     * gate check, create baris extension, ensure workflow definition +
     * startInstance, lalu commit workflowInstanceId + transisi
     * work_permits.status ACTIVE->EXTENSION_REQUESTED.
     */
    request(input: RequestWorkPermitExtensionInput): Promise<WorkPermitExtension>;
    /**
     * BR-09 — wrapper WAJIB, pola PERSIS WorkPermitService.actOnApprovalTask()
     * (3.3, gap TDD §26 #111) — segregation of duty berlaku SAMA utk
     * approval extension (mengacu requester PERMIT INDUK, bukan extension
     * itu sendiri yang tidak py "requester" terpisah). Sekaligus mencatat
     * decided_by/decided_at "aktor TERAKHIR bertindak" pada SETIAP aksi
     * (bukan hanya final) — work_permit_extensions HANYA py SATU kolom
     * decided_by (beda dari work_permit_approvals cache yang pisah
     * issuer/hse), jadi utk workflow 2-stage kolom ini tertimpa aktor stage
     * kedua — dibaca sbg semantik paling masuk akal utk kolom tunggal.
     */
    actOnExtensionTask(taskId: string, action: "APPROVE" | "REJECT", comment: string | undefined, actingUserId: string): Promise<ActOnTaskResult>;
    getById(extensionId: string): Promise<WorkPermitExtension>;
    listByPermit(workPermitId: string): Promise<WorkPermitExtension[]>;
}
