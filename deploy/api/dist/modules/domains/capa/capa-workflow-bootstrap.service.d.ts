import { NumberingConfig, Prisma, WorkflowDefinition } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
/**
 * Task 4.2 — pola PERSIS RegulatoryComplianceBootstrapService (2.2, plain
 * 1-stage TANPA JSON Logic condition) x2 (capa_action_plan DAN
 * capa_effectiveness_verification), digabung SATU service krn keduanya
 * milik modul yang sama. BR-06 (CAPA priority=CRITICAL wajib approval HSE
 * Manager, tidak boleh auto-approve) TERPENUHI BY CONSTRUCTION — approver
 * SELALU ROLE_IN_SCOPE HSE_MANAGER apa pun priority-nya (TIDAK ADA
 * mekanisme "auto-approve"/template ringan per-priority di Workflow
 * Engine 0.9 manapun di codebase ini), jadi tidak butuh JSON Logic
 * condition tambahan.
 */
export declare class CapaWorkflowBootstrapService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    ensureNumberingConfig(siteId: string): Promise<NumberingConfig>;
    private findRoleOrThrow;
    ensureActionPlanWorkflowDefinition(tx: Prisma.TransactionClient): Promise<WorkflowDefinition>;
    ensureEffectivenessVerificationWorkflowDefinition(tx: Prisma.TransactionClient): Promise<WorkflowDefinition>;
    private ensureSingleStageDefinition;
}
