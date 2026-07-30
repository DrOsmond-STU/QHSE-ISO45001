import { BadRequestException, Injectable } from "@nestjs/common";
import { IsolationLotoRecord, IsolationType } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./work-permit-context";

export interface ApplyIsolationLotoInput {
  workPermitId: string;
  isolationPointDescription: string;
  isolationType: IsolationType;
  lockNumber?: string;
  tagNumber?: string;
  appliedBy: string;
  appliedAt: Date;
}

// Task 3.3 (Modul 06 §4 poin 6/§5/§6 BR-03). BELUM ada controller HTTP —
// work_permit.loto.record sudah di-seed RBAC baseline (task 129). Bukti
// foto isolasi via attachments generik (0.12, PRD §5 "entity_type=
// isolation_loto_record") — TIDAK ada method upload eksplisit di sini
// (caller pakai AttachmentService langsung, pola sama licenses_permits 2.2
// yang juga tidak wiring upload evidence generik), gap TDD §26.
@Injectable()
export class IsolationLotoRecordService {
  constructor(private readonly prisma: PrismaService) {}

  async apply(input: ApplyIsolationLotoInput): Promise<IsolationLotoRecord> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();
    return this.prisma.withRls((tx) =>
      tx.isolationLotoRecord.create({
        data: {
          tenantId,
          workPermitId: input.workPermitId,
          isolationPointDescription: input.isolationPointDescription,
          isolationType: input.isolationType,
          lockNumber: input.lockNumber,
          tagNumber: input.tagNumber,
          appliedBy: input.appliedBy,
          appliedAt: input.appliedAt,
          status: "APPLIED",
          createdBy,
          updatedBy: createdBy,
        },
      }),
    );
  }

  /** PRD §5 "Prinsip verifikasi independen (dua orang berbeda: pemasang vs
   * verifikator)" — verifiedBy WAJIB beda dari appliedBy, ditegakkan DI
   * SINI (bukan CHECK constraint DB — lihat banner comment schema.prisma
   * IsolationLotoRecord soal kenapa app-level guard dipilih drpd DB-level). */
  async verify(isolationLotoId: string, verifiedBy: string): Promise<IsolationLotoRecord> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls(async (tx) => {
      const record = await tx.isolationLotoRecord.findUniqueOrThrow({ where: { id: isolationLotoId } });
      if (record.appliedBy === verifiedBy) {
        throw new BadRequestException(
          "Verifikator isolation_loto_records wajib berbeda dari petugas yang memasang (prinsip verifikasi independen).",
        );
      }
      if (record.status !== "APPLIED") {
        throw new BadRequestException(`isolation_loto_records berstatus ${record.status} tidak dapat diverifikasi (wajib APPLIED).`);
      }
      return tx.isolationLotoRecord.update({
        where: { id: isolationLotoId },
        data: { status: "VERIFIED", verifiedBy, verifiedAt: new Date(), updatedBy },
      });
    });
  }

  async remove(isolationLotoId: string, removedBy: string): Promise<IsolationLotoRecord> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls(async (tx) => {
      const record = await tx.isolationLotoRecord.findUniqueOrThrow({ where: { id: isolationLotoId } });
      if (record.status !== "VERIFIED") {
        throw new BadRequestException(`isolation_loto_records berstatus ${record.status} tidak dapat dilepas (wajib VERIFIED).`);
      }
      return tx.isolationLotoRecord.update({
        where: { id: isolationLotoId },
        data: { status: "REMOVED", removedBy, removedAt: new Date(), updatedBy },
      });
    });
  }

  async listByPermit(workPermitId: string): Promise<IsolationLotoRecord[]> {
    return this.prisma.withRls((tx) => tx.isolationLotoRecord.findMany({ where: { workPermitId }, orderBy: { appliedAt: "desc" } }));
  }
}
