import { NumberingConfig, Prisma, WorkflowDefinition } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export declare class IncidentWorkflowBootstrapService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    ensureNumberingConfig(siteId: string): Promise<NumberingConfig>;
    private findRoleOrThrow;
    /**
     * PRD §4 poin 7 "HSE Manager menyetujui via Workflow Engine
     * (entity_type=incident_investigation)" + tabel konfigurasi default — Stage
     * 1 Review Laporan Investigasi (HSE_MANAGER, SELALU — mengajukan berarti
     * investigasi sudah ada, jadi "jika investigasi wajib" §4 SUDAH terpenuhi
     * by construction saat workflow ini dimulai) -> [kondisional] Stage 2
     * Persetujuan Pelaporan Regulator (HSE_MANAGER JUGA — BEDA dari Work
     * Permit/HIRA yang pakai role berbeda per stage, PRD literal memang
     * menyebut HSE Manager utk KEDUA stage). KEEMPAT KALINYA JSON Logic
     * condition dipakai pada workflow_transitions di seluruh codebase (setelah
     * HIRA 3.2, Work Permit Stage 2 HSE 3.3, Work Permit Extension 3.4) —
     * pola IDENTIK: dua baris dari stage1 dgn triggerAction=APPROVE sama tapi
     * condition+priority beda; priority 0 mengecek contextData.hasRegulatoryReport
     * ===true -> lanjut stage2; priority 1 fallback (condition=null) -> langsung
     * terminal APPROVED. contextData.hasRegulatoryReport diisi
     * IncidentInvestigationService.submitForApproval() SEBELUM startInstance()
     * (query keberadaan incident_regulatory_reports utk incident_report_id
     * terkait, BR-03) — WorkflowEngineService sendiri TIDAK PERNAH fetch data
     * domain.
     */
    ensureWorkflowDefinition(tx: Prisma.TransactionClient): Promise<WorkflowDefinition>;
}
