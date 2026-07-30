import { Injectable, NotFoundException } from "@nestjs/common";
import { IndustryTemplate, Prisma } from "@prisma/client";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
import { withCleanUniqueViolation } from "../organization-context";

export interface CreateIndustryTemplateInput {
  code: string;
  name: string;
  description?: string;
  defaultRegulatoryCodes?: Prisma.InputJsonValue;
  defaultChecklistRefs?: Prisma.InputJsonValue;
  defaultModuleEntitlements?: Prisma.InputJsonValue;
  isSystemDefined?: boolean;
}

export interface UpdateIndustryTemplateInput {
  name?: string;
  description?: string;
  defaultRegulatoryCodes?: Prisma.InputJsonValue;
  defaultChecklistRefs?: Prisma.InputJsonValue;
  defaultModuleEntitlements?: Prisma.InputJsonValue;
}

// Task 1.2 (Modul 01 §3/§5) — katalog GLOBAL platform (bukan tabel domain
// tenant, TIDAK ADA tenant_id sama sekali), dikelola Super Admin Platform
// (org.industry_template.manage). Pola akses beda dari OrganizationService:
// pakai prisma.withGlobalContext() (task 1.2, platform/tenancy/prisma.service.ts)
// BUKAN withRls() — listActive()/findByCode() bahkan HARUS bisa dipanggil
// TANPA tenant context sama sekali (dipakai setup wizard SEBELUM tenant baru
// dibuat, PRD §4.1 langkah 2 "pemilihan template industri" mendahului
// "pembuatan struktur inti"). BELUM ada controller HTTP (pola sama seluruh
// task 1.1 — dites langsung, endpoint menyusul begitu ada task yang
// eksplisit memintanya).
//
// Catalog authoring UTAMA lewat prisma/seed-industry-templates.ts (TDD §6.3
// "data referensi ... di-seed lewat migration terkontrol versi") — method
// create/update/deactivate di sini melayani org.industry_template.manage
// runtime (Super Admin Platform mengubah katalog tanpa redeploy), BUKAN
// jalur seed itu sendiri.
@Injectable()
export class IndustryTemplateService {
  constructor(private readonly prisma: PrismaService) {}

  async listActive(): Promise<IndustryTemplate[]> {
    return this.prisma.industryTemplate.findMany({ where: { isActive: true }, orderBy: { code: "asc" } });
  }

  async findByCode(code: string): Promise<IndustryTemplate | null> {
    return this.prisma.industryTemplate.findUnique({ where: { code } });
  }

  /** Dipakai OrganizationService saat assign industry_template_id ke
   * tenant/company (PRD §4.1) — template harus ADA dan AKTIF; menugaskan
   * template tidak dikenal/nonaktif ditolak fail closed (bukan diam-diam
   * disimpan sebagai UUID yatim). */
  async getActiveOrThrow(industryTemplateId: string): Promise<IndustryTemplate> {
    const template = await this.prisma.industryTemplate.findUnique({ where: { id: industryTemplateId } });
    if (!template || !template.isActive) {
      throw new NotFoundException(`industry_template_id "${industryTemplateId}" tidak ditemukan atau tidak aktif.`);
    }
    return template;
  }

  async create(input: CreateIndustryTemplateInput): Promise<IndustryTemplate> {
    return withCleanUniqueViolation(
      () =>
        this.prisma.withGlobalContext((tx) =>
          tx.industryTemplate.create({
            data: {
              code: input.code,
              name: input.name,
              description: input.description,
              defaultRegulatoryCodes: input.defaultRegulatoryCodes ?? [],
              defaultChecklistRefs: input.defaultChecklistRefs ?? [],
              defaultModuleEntitlements: input.defaultModuleEntitlements ?? [],
              isSystemDefined: input.isSystemDefined ?? false,
            },
          }),
        ),
      `industry_template code "${input.code}" sudah dipakai.`,
    );
  }

  async update(industryTemplateId: string, input: UpdateIndustryTemplateInput): Promise<IndustryTemplate> {
    return this.prisma.withGlobalContext((tx) => tx.industryTemplate.update({ where: { id: industryTemplateId }, data: input }));
  }

  /** BR-04 (PRD Modul 01 §6) — nonaktifkan (BUKAN hapus), supaya referensi
   * historis tenants/companies yang sudah memakainya tetap valid dan
   * regulatory_register yang sudah ada TIDAK retroaktif berubah (Modul 04
   * belum ada tabelnya Phase 1 — tidak ada yang perlu dilakukan di sini
   * selain isActive:false, lihat TDD §26). */
  async deactivate(industryTemplateId: string): Promise<IndustryTemplate> {
    return this.prisma.withGlobalContext((tx) => tx.industryTemplate.update({ where: { id: industryTemplateId }, data: { isActive: false } }));
  }
}
