import { ConflictException, Injectable } from "@nestjs/common";
import { HazardCategory, HazardRegister } from "@prisma/client";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./risk-matrix-context";

export interface CreateHazardRegisterInput {
  siteId?: string;
  hazardCode?: string;
  hazardCategory: HazardCategory;
  hazardDescription: string;
  potentialConsequence?: string;
}

export interface UpdateHazardRegisterInput {
  hazardCode?: string;
  hazardCategory?: HazardCategory;
  hazardDescription?: string;
  potentialConsequence?: string;
}

// Task 3.1/3.2 (Modul 05 §5/§6 BR-07). BELUM ada controller HTTP —
// risk.hazard.propose/manage sudah di-seed RBAC baseline (task 104).
// BR-07 ("tidak dapat dihapus permanen selama masih direferensikan
// hira_hazard_lines/jsa_step_hazards/hiradc_lines AKTIF") — TIDAK ADA
// method hard-delete di sini sama sekali (konvensi soft-delete universal
// codebase ini), jadi bagian "tidak dapat dihapus permanen" terpenuhi by
// construction. Bagian "validasi referensial" DITUTUP task 3.2 begitu
// ketiga tabel anak genuinely ada (gap TDD §26 #92, sekarang diselesaikan)
// — retire() di bawah cek KETIGA tabel, tanpa membedakan status parent
// (HIRA/JSA/HIRADC) — "aktif" literal PRD dibaca KONSERVATIF sbg "ada
// referensi APA PUN" (bukan dipersempit ke parent yang masih status
// tertentu), menghindari encode 3 aturan "status aktif" berbeda dari 3
// modul lain ke dalam satu leaf service — lebih baik terlalu hati-hati
// (block retire) drpd salah mengizinkan referensi yatim.
@Injectable()
export class HazardRegisterService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateHazardRegisterInput): Promise<HazardRegister> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();

    return this.prisma.withRls((tx) =>
      tx.hazardRegister.create({
        data: {
          tenantId,
          siteId: input.siteId,
          hazardCode: input.hazardCode,
          hazardCategory: input.hazardCategory,
          hazardDescription: input.hazardDescription,
          potentialConsequence: input.potentialConsequence,
          status: "ACTIVE",
          createdBy,
          updatedBy: createdBy,
        },
      }),
    );
  }

  async update(hazardId: string, input: UpdateHazardRegisterInput): Promise<HazardRegister> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.hazardRegister.update({
        where: { id: hazardId },
        data: { ...input, updatedBy },
      }),
    );
  }

  async getById(hazardId: string): Promise<HazardRegister> {
    return this.prisma.withRls((tx) => tx.hazardRegister.findUniqueOrThrow({ where: { id: hazardId } }));
  }

  /** siteId=undefined -> seluruh hazard tenant (generik + per-site); siteId
   * diisi -> generik (siteId NULL, PRD §5 "NULL = bahaya generik tenant-wide")
   * DITAMBAH yang spesifik site itu, pola sama DocumentService "NULL
   * berlaku lebih luas". */
  async listActive(siteId?: string): Promise<HazardRegister[]> {
    return this.prisma.withRls((tx) =>
      tx.hazardRegister.findMany({
        where: {
          status: "ACTIVE",
          deletedAt: null,
          ...(siteId ? { OR: [{ siteId: null }, { siteId }] } : {}),
        },
        orderBy: { hazardDescription: "asc" },
      }),
    );
  }

  /** Soft delete (deletedAt + status INACTIVE) — pola sama
   * IndustryTemplateService.deactivate() (1.2)/DocumentService.retire()
   * (2.1). BR-07 — cek referensial ke hira_hazard_lines/jsa_step_hazards/
   * hiradc_lines SEBELUM soft-delete, lihat banner comment kelas. */
  async retire(hazardId: string): Promise<HazardRegister> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls(async (tx) => {
      const [hiraCount, jsaCount, hiradcCount] = await Promise.all([
        tx.hiraHazardLine.count({ where: { hazardId } }),
        tx.jsaStepHazard.count({ where: { hazardId } }),
        tx.hiradcLine.count({ where: { hazardId } }),
      ]);
      if (hiraCount > 0 || jsaCount > 0 || hiradcCount > 0) {
        throw new ConflictException(
          `hazard_register ${hazardId} masih direferensikan (hira_hazard_lines=${hiraCount}, jsa_step_hazards=${jsaCount}, hiradc_lines=${hiradcCount}) — tidak dapat di-retire (BR-07).`,
        );
      }
      return tx.hazardRegister.update({
        where: { id: hazardId },
        data: { status: "INACTIVE", deletedAt: new Date(), updatedBy },
      });
    });
  }
}
