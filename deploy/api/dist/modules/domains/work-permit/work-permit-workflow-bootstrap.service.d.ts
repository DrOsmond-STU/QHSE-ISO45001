import { NumberingConfig, Prisma, WorkflowDefinition } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export declare class WorkPermitWorkflowBootstrapService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    /**
     * PRD §5 "Numbering" literal: "module_code=WORK_PERMIT, pattern default
     * WP/{SITE_CODE}/{YYYY}/{SEQ:4}, reset_period=YEARLY, scope_level=SITE."
     * scope_level=SITE (BEDA dari HIRA/JSA/HIRADC/RISK_CORP scope_level=TENANT,
     * task 3.2) berarti SATU baris numbering_configs PER SITE — counter
     * genuinely terpisah antar site (bukan cuma token kosmetik {SITE_CODE}
     * lewat `variables`, lihat banner comment NumberingService.generateNext()
     * `GenerateNextOptions.scopeId`), mengurangi lock contention row-lock
     * saat lonjakan submit bersamaan mulai shift PER SITE (PRD §11).
     */
    ensureNumberingConfig(siteId: string): Promise<NumberingConfig>;
    private findRoleOrThrow;
    /**
     * PRD §4 poin 4-6 + tabel "Konfigurasi Workflow Engine default" — Stage 1
     * Review Issuer/Area Authority (`SUPERVISOR`, SELALU, SLA 2 jam) ->
     * [kondisional BR-04] Stage 2 Approval HSE (`HSE_MANAGER`, HANYA kalau
     * risk_level=HIGH ATAU work_permit_types.requires_hse_approval, SLA 4
     * jam). KONSUMEN KEDUA JSON Logic condition pada workflow_transitions di
     * seluruh codebase (setelah HIRA, task 3.2) — pola IDENTIK: DUA baris dari
     * stage1 dgn triggerAction=APPROVE sama tapi condition+priority beda;
     * priority 0 mengecek contextData.hasHseStage===true -> lanjut stage2;
     * priority 1 fallback (condition=null) -> langsung terminal APPROVED.
     * contextData.hasHseStage diisi WorkPermitService.submitForApproval()
     * SEBELUM startInstance() (computeHasHseStage(), work-permit-hse-stage-rules.ts)
     * — WorkflowEngineService sendiri TIDAK PERNAH fetch data domain.
     */
    ensureWorkflowDefinition(tx: Prisma.TransactionClient): Promise<WorkflowDefinition>;
    /**
     * PRD §4 poin 8 — "Extension... disetujui ulang oleh Issuer (dan HSE
     * jika tipe mengharuskan retest gas)." workflow_instance_id
     * (entity_type=work_permit_extension, PRD §5 literal) — KETIGA kalinya
     * JSON Logic condition dipakai pada workflow_transitions di seluruh
     * codebase (setelah HIRA 3.2, Work Permit Stage 2 HSE 3.3) — pola
     * IDENTIK, condition kali ini `gasRetestRequired` (field PADA
     * work_permit_extensions itu sendiri, diisi WorkPermitExtensionService.request()
     * dari input caller, BUKAN turunan risk_level/requires_hse_approval spt
     * permit induknya).
     */
    ensureExtensionWorkflowDefinition(tx: Prisma.TransactionClient): Promise<WorkflowDefinition>;
}
