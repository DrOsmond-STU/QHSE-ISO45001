import { Injectable } from "@nestjs/common";
import { CapaRootCauseAnalysis, CapaRootCauseMethod, Prisma } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./capa-context";
import { CapaRegisterService } from "./capa-register.service";

export interface RecordCapaRootCauseAnalysisInput {
  capaRegisterId: string;
  method: CapaRootCauseMethod;
  methodDetail: Prisma.InputJsonValue;
  rootCauseSummary: string;
  contributingFactors?: string;
}

// Task 4.2 (Modul 10 §4 poin 3, §3 "CAPA Owner/PIC | capa.root_cause.record").
// BELUM ada controller HTTP. record() SELALU boleh dipanggil ulang (BR-04
// siklus NOT_EFFECTIVE_REOPENED butuh root cause BARU, bukan update baris
// lama — "1..N capa_root_cause_analysis, umumnya 1, bisa >1 jika
// NOT_EFFECTIVE_REOPENED" PRD §5 ERD literal).
@Injectable()
export class CapaRootCauseAnalysisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registerService: CapaRegisterService,
  ) {}

  async record(input: RecordCapaRootCauseAnalysisInput): Promise<CapaRootCauseAnalysis> {
    const analyzedBy = requireActorUserId();
    const tenantId = requireTenantId();

    await this.registerService.markRootCauseAnalysisStarted(input.capaRegisterId);

    return this.prisma.withRls((tx) =>
      tx.capaRootCauseAnalysis.create({
        data: {
          tenantId,
          capaRegisterId: input.capaRegisterId,
          method: input.method,
          methodDetail: input.methodDetail,
          rootCauseSummary: input.rootCauseSummary,
          contributingFactors: input.contributingFactors,
          analyzedBy,
          analyzedAt: new Date(),
          createdBy: analyzedBy,
          updatedBy: analyzedBy,
        },
      }),
    );
  }

  async getById(rootCauseAnalysisId: string): Promise<CapaRootCauseAnalysis> {
    return this.prisma.withRls((tx) => tx.capaRootCauseAnalysis.findUniqueOrThrow({ where: { id: rootCauseAnalysisId } }));
  }

  async listByCapa(capaRegisterId: string): Promise<CapaRootCauseAnalysis[]> {
    return this.prisma.withRls((tx) =>
      tx.capaRootCauseAnalysis.findMany({ where: { capaRegisterId, deletedAt: null }, orderBy: { analyzedAt: "desc" } }),
    );
  }
}
