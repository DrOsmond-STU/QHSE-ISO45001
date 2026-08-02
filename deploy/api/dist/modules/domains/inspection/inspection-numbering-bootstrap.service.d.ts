import { NumberingConfig } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
/**
 * Task 3.6 — pola PERSIS WorkPermitWorkflowBootstrapService.ensureNumberingConfig()
 * (3.3)/IncidentWorkflowBootstrapService (3.5), TAPI modul ini TIDAK PUNYA
 * workflow_definitions sama sekali (PRD §4 poin 9 "TIDAK WAJIB memakai
 * Workflow Engine", TIDAK diimplementasikan — gap TDD §26) — service ini
 * HANYA menangani numbering, bukan "Workflow" seperti nama precedent modul
 * lain. PRD §5 "Numbering" — reset_period=MONTHLY (BEDA dari SELURUH modul
 * lain yang pakai YEARLY — PERTAMA di codebase yang genuinely menguji
 * reset_period=MONTHLY NumberingService, sudah didukung sejak task 0.10
 * tapi baru di sini benar2 dipakai), scope_level=SITE (pola sama Work
 * Permit/Incident), SEQ:5 digit (5 digit BEDA dari SEQ:4 modul lain — PRD
 * §11 "volume tinggi").
 */
export declare class InspectionNumberingBootstrapService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    ensureNumberingConfig(siteId: string): Promise<NumberingConfig>;
}
