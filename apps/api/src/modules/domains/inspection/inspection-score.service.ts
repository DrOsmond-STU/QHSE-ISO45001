import { Injectable } from "@nestjs/common";
import { InspectionScore } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./inspection-context";

export interface RecordInspectionScoreInput {
  inspectionRecordId: string;
  category: string;
  scoreObtained: number;
  maxPossibleScore: number;
}

// PRD §5 "inspection_scores — ringkasan skor per kategori dalam 1
// inspeksi, BEDA dari overall_score." Caller (mis. UI/report generator)
// menghitung breakdown per category dari inspection_record_items sendiri
// lalu memanggil record() per kategori — TIDAK diotomatisasi di
// InspectionRecordService.complete() (PRD tidak menyebutnya sbg bagian
// BR-03, hanya overall_score yang eksplisit "dihitung otomatis").
@Injectable()
export class InspectionScoreService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordInspectionScoreInput): Promise<InspectionScore> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();
    const percentage = input.maxPossibleScore === 0 ? 0 : (input.scoreObtained / input.maxPossibleScore) * 100;
    return this.prisma.withRls((tx) =>
      tx.inspectionScore.create({
        data: {
          tenantId,
          inspectionRecordId: input.inspectionRecordId,
          category: input.category,
          scoreObtained: input.scoreObtained,
          maxPossibleScore: input.maxPossibleScore,
          percentage,
          createdBy,
          updatedBy: createdBy,
        },
      }),
    );
  }

  async listByRecord(inspectionRecordId: string): Promise<InspectionScore[]> {
    return this.prisma.withRls((tx) => tx.inspectionScore.findMany({ where: { inspectionRecordId }, orderBy: { category: "asc" } }));
  }
}
