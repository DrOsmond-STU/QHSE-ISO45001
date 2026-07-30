import { Injectable, NotFoundException } from "@nestjs/common";
import {
  ComplianceApplicableScope,
  Prisma,
  RegulatoryFrameworkCategory,
  RegulatoryRegister,
  RegulatoryRegisterStatus,
  RegulationType,
} from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { IndustryTemplateService } from "../organization/industry-template/industry-template.service";
import { assertApplicableScopeConsistency } from "./regulatory-register-rules";
import { requireActorUserId, requireTenantId } from "./regulatory-compliance-context";

export interface CreateRegulatoryRegisterInput {
  frameworkId?: string;
  regulationType: RegulationType;
  regulationNumber: string;
  title: string;
  issuingAuthority?: string;
  issueDate?: Date;
  effectiveDate?: Date;
  applicableScope?: ComplianceApplicableScope;
  applicableCompanyId?: string;
  applicableSiteId?: string;
  industryRelevance?: Prisma.InputJsonValue;
  summary?: string;
  sourceUrl?: string;
  reviewCycleMonths?: number;
}

export type UpdateRegulatoryRegisterInput = Partial<
  Pick<
    CreateRegulatoryRegisterInput,
    | "title"
    | "issuingAuthority"
    | "issueDate"
    | "effectiveDate"
    | "applicableScope"
    | "applicableCompanyId"
    | "applicableSiteId"
    | "industryRelevance"
    | "summary"
    | "sourceUrl"
    | "reviewCycleMonths"
  >
>;

// PRD Modul 04 §5 "kategori framework -> jenis regulasi default" — dipakai
// HANYA oleh seedFromIndustryTemplate() saat mengarang baris awal dari
// katalog global (RegulatoryFramework tidak punya field regulation_type
// sendiri, PRD §5 tidak memintanya di situ). Pemetaan kasar/best-effort;
// Compliance Officer diharapkan "melengkapi/menyesuaikan register" (PRD
// §4.1 poin 2) termasuk mengoreksi regulation_type kalau perlu.
const DEFAULT_REGULATION_TYPE_BY_CATEGORY: Record<RegulatoryFrameworkCategory, RegulationType> = {
  ISO_STANDARD: "INTERNATIONAL_STANDARD",
  GOVERNMENT_REGULATION: "GOVERNMENT_REGULATION_PP",
  INDUSTRY_GUIDELINE: "GUIDELINE",
};

export interface SeedFromIndustryTemplateResult {
  created: RegulatoryRegister[];
  skippedCodes: string[];
}

// Task 2.2 (Modul 04 §4.1/§5/§6 BR-04/BR-07). BELUM ada controller HTTP
// (pola sama seluruh modul domain lain tanpa deliverable apps/web di Phase
// 2 sejauh ini) — compliance.regulation.* sudah di-seed RBAC baseline
// (task 92), siap digerbangi @RequirePermission begitu ada endpoint.
@Injectable()
export class RegulatoryRegisterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly industryTemplateService: IndustryTemplateService,
  ) {}

  async create(input: CreateRegulatoryRegisterInput): Promise<RegulatoryRegister> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();
    const applicableScope = input.applicableScope ?? "ALL_TENANT";
    assertApplicableScopeConsistency(applicableScope, input.applicableCompanyId ?? null, input.applicableSiteId ?? null);

    return this.prisma.withRls((tx) =>
      tx.regulatoryRegister.create({
        data: {
          tenantId,
          frameworkId: input.frameworkId,
          regulationType: input.regulationType,
          regulationNumber: input.regulationNumber,
          title: input.title,
          issuingAuthority: input.issuingAuthority,
          issueDate: input.issueDate,
          effectiveDate: input.effectiveDate,
          applicableScope,
          applicableCompanyId: input.applicableCompanyId,
          applicableSiteId: input.applicableSiteId,
          industryRelevance: input.industryRelevance ?? [],
          summary: input.summary,
          sourceUrl: input.sourceUrl,
          reviewCycleMonths: input.reviewCycleMonths,
          status: "ACTIVE",
          createdBy,
          updatedBy: createdBy,
        },
      }),
    );
  }

  async update(registerId: string, input: UpdateRegulatoryRegisterInput): Promise<RegulatoryRegister> {
    const updatedBy = requireActorUserId();

    return this.prisma.withRls(async (tx) => {
      const existing = await tx.regulatoryRegister.findUniqueOrThrow({ where: { id: registerId } });
      const nextScope = input.applicableScope ?? existing.applicableScope;
      const nextCompanyId = "applicableCompanyId" in input ? (input.applicableCompanyId ?? null) : existing.applicableCompanyId;
      const nextSiteId = "applicableSiteId" in input ? (input.applicableSiteId ?? null) : existing.applicableSiteId;
      assertApplicableScopeConsistency(nextScope, nextCompanyId, nextSiteId);

      return tx.regulatoryRegister.update({
        where: { id: registerId },
        data: { ...input, updatedBy },
      });
    });
  }

  async getById(registerId: string): Promise<RegulatoryRegister> {
    return this.prisma.withRls((tx) => tx.regulatoryRegister.findUniqueOrThrow({ where: { id: registerId } }));
  }

  async listActive(): Promise<RegulatoryRegister[]> {
    return this.prisma.withRls((tx) =>
      tx.regulatoryRegister.findMany({ where: { status: "ACTIVE", deletedAt: null }, orderBy: { title: "asc" } }),
    );
  }

  /**
   * PRD §4.1 poin 3 (implisit) — register lama diganti register baru
   * (perubahan regulasi/revisi). status -> SUPERSEDED/REVOKED (BUKAN
   * delete, BR-04 tetap membiarkan obligation historis yang sudah menunjuk
   * ke baris ini apa adanya — lihat regulatory-register-rules.ts). Kalau
   * ada penerus, supersededByRegisterId diisi (unique — satu register lama
   * hanya bisa digantikan SATU register baru, ditegakkan constraint DB).
   */
  async retire(
    registerId: string,
    status: Extract<RegulatoryRegisterStatus, "SUPERSEDED" | "REVOKED">,
    supersededByRegisterId?: string,
  ): Promise<RegulatoryRegister> {
    const updatedBy = requireActorUserId();

    return this.prisma.withRls(async (tx) => {
      const existing = await tx.regulatoryRegister.findUniqueOrThrow({ where: { id: registerId } });
      if (existing.status !== "ACTIVE") {
        throw new NotFoundException(`regulatory_register ${registerId} sudah berstatus ${existing.status}, bukan ACTIVE.`);
      }
      return tx.regulatoryRegister.update({
        where: { id: registerId },
        data: { status, supersededByRegisterId, updatedBy },
      });
    });
  }

  /**
   * PRD §4.1 poin 1 — "Saat onboarding tenant, industry_templates.default_regulatory_codes
   * di-seed menjadi entri awal regulatory_register (status ACTIVE)." Method
   * BERDIRI SENDIRI (buka withRls()-nya sendiri, pola sama
   * DmsBootstrapService.ensureNumberingConfig() 2.1) — SENGAJA TIDAK
   * dipanggil otomatis dari ProvisioningService.provisionTenant() (1.5)
   * dalam task ini (di luar timebox menyentuh ulang orkestrasi Phase 1
   * yang sudah shipped; gap TDD §26). Kode yang tidak match baris apapun
   * di regulatory_frameworks (semestinya nihil hari ini — seed-regulatory-frameworks.ts
   * sudah mencakup SELURUH kode yang dirujuk seed-industry-templates.ts,
   * lihat banner comment file itu) dilaporkan via skippedCodes, bukan
   * exception — supaya template baru di masa depan yang lupa menambah
   * baris framework tidak menggagalkan SELURUH provisioning tenant.
   */
  async seedFromIndustryTemplate(industryTemplateId: string): Promise<SeedFromIndustryTemplateResult> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();

    const template = await this.industryTemplateService.getActiveOrThrow(industryTemplateId);
    const codes = Array.isArray(template.defaultRegulatoryCodes) ? (template.defaultRegulatoryCodes as unknown[]) : [];

    const created: RegulatoryRegister[] = [];
    const skippedCodes: string[] = [];

    for (const rawCode of codes) {
      if (typeof rawCode !== "string") continue;
      const framework = await this.prisma.regulatoryFramework.findUnique({ where: { code: rawCode } });
      if (!framework || !framework.isActive) {
        skippedCodes.push(rawCode);
        continue;
      }

      const row = await this.prisma.withRls((tx) =>
        tx.regulatoryRegister.create({
          data: {
            tenantId,
            frameworkId: framework.id,
            regulationType: DEFAULT_REGULATION_TYPE_BY_CATEGORY[framework.category],
            regulationNumber: framework.code,
            title: framework.name,
            summary: framework.description,
            applicableScope: "ALL_TENANT",
            industryRelevance: [template.code],
            status: "ACTIVE",
            createdBy,
            updatedBy: createdBy,
          },
        }),
      );
      created.push(row);
    }

    return { created, skippedCodes };
  }
}
