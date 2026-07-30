import { Injectable } from "@nestjs/common";
import { NumberingConfig } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireTenantId } from "./inspection-context";

const INSPECTION_MODULE_CODE = "INSPECTION";
const INSPECTION_NUMBERING_PATTERN = "{PREFIX}/{SITE_CODE}/{YYYY}/{SEQ:5}";

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
@Injectable()
export class InspectionNumberingBootstrapService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureNumberingConfig(siteId: string): Promise<NumberingConfig> {
    const tenantId = requireTenantId();
    return this.prisma.withRls(async (tx) => {
      const existing = await tx.numberingConfig.findFirst({ where: { tenantId, moduleCode: INSPECTION_MODULE_CODE, scopeId: siteId } });
      if (existing) return existing;

      return tx.numberingConfig.create({
        data: {
          tenantId,
          moduleCode: INSPECTION_MODULE_CODE,
          pattern: INSPECTION_NUMBERING_PATTERN,
          prefix: "INS",
          resetPeriod: "MONTHLY",
          scopeLevel: "SITE",
          scopeId: siteId,
        },
      });
    });
  }
}
