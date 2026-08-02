import { NumberingConfig, Prisma, WorkflowDefinition } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export declare class RegulatoryComplianceBootstrapService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    ensureNumberingConfig(): Promise<NumberingConfig>;
    /**
     * PRD §4.2 poin 2 — "memakai Workflow Engine (module_code=COMPLIANCE,
     * entity_type=compliance_evaluation), template default disarankan: 1
     * stage Review HSE Manager." SATU stage ROLE_IN_SCOPE saja (BEDA dari
     * DMS 2 stage) — evaluasi tidak py konsep "context user" spesifik-entitas
     * spt Document Owner, langsung ke HSE Manager sesuai scope.
     */
    ensureWorkflowDefinition(tx: Prisma.TransactionClient): Promise<WorkflowDefinition>;
}
