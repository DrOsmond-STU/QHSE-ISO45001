import { Injectable } from "@nestjs/common";
import { ContractorWorker, ContractorWorkerCategory } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./contractor-context";

export interface RegisterWorkerInput {
  contractorId: string;
  projectAssignmentId?: string;
  fullName: string;
  idNumberKtp?: string;
  dateOfBirth?: Date;
  jobPosition?: string;
  workerCategory: ContractorWorkerCategory;
  isAuthorizedPermitRequester?: boolean;
}

@Injectable()
export class ContractorWorkerService {
  constructor(private readonly prisma: PrismaService) {}

  // §4.3 poin 2 — pekerja didaftarkan. BR-03 ditegakkan BY CONSTRUCTION —
  // status TIDAK PERNAH diterima sbg input caller (beda field lain), SELALU
  // dihitung server-side dari siteInductionCompleted. PRD §5 enum
  // contractor_workers.status TIDAK PUNYA nilai "baru terdaftar/belum
  // diinduksi" (hanya ACTIVE/DEMOBILIZED/SUSPENDED/BLACKLISTED) — SUSPENDED
  // dipakai sbg placeholder pra-induksi terdekat (gap TDD §26, lihat banner
  // comment schema.prisma blok Modul 17 poin akhir).
  async register(input: RegisterWorkerInput): Promise<ContractorWorker> {
    const tenantId = requireTenantId();
    const actorUserId = requireActorUserId();

    return this.prisma.withRls((tx) =>
      tx.contractorWorker.create({
        data: {
          tenantId,
          contractorId: input.contractorId,
          projectAssignmentId: input.projectAssignmentId,
          fullName: input.fullName,
          idNumberKtp: input.idNumberKtp,
          dateOfBirth: input.dateOfBirth,
          jobPosition: input.jobPosition,
          workerCategory: input.workerCategory,
          isAuthorizedPermitRequester: input.isAuthorizedPermitRequester ?? false,
          siteInductionCompleted: false,
          status: "SUSPENDED",
          createdBy: actorUserId,
          updatedBy: actorUserId,
        },
      }),
    );
  }

  // §4.3 poin 3 — BR-03: site_induction_completed=TRUE adalah SATU-SATUNYA
  // jalur worker menjadi ACTIVE (mobilisasi penuh).
  async completeSiteInduction(id: string, inductionDate: Date = new Date()): Promise<ContractorWorker> {
    const actorUserId = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.contractorWorker.update({
        where: { id },
        data: {
          siteInductionCompleted: true,
          siteInductionDate: inductionDate,
          status: "ACTIVE",
          mobilizationDate: new Date(),
          updatedBy: actorUserId,
        },
      }),
    );
  }

  // §4.3 poin 5 — proyek selesai/dihentikan.
  async demobilize(id: string): Promise<ContractorWorker> {
    const actorUserId = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.contractorWorker.update({ where: { id }, data: { status: "DEMOBILIZED", demobilizationDate: new Date(), updatedBy: actorUserId } }),
    );
  }

  async updateAuthorizedPermitRequester(id: string, isAuthorizedPermitRequester: boolean): Promise<ContractorWorker> {
    const actorUserId = requireActorUserId();
    return this.prisma.withRls((tx) => tx.contractorWorker.update({ where: { id }, data: { isAuthorizedPermitRequester, updatedBy: actorUserId } }));
  }

  async getById(id: string): Promise<ContractorWorker> {
    return this.prisma.withRls((tx) => tx.contractorWorker.findUniqueOrThrow({ where: { id } }));
  }

  async listByAssignment(projectAssignmentId: string): Promise<ContractorWorker[]> {
    return this.prisma.withRls((tx) => tx.contractorWorker.findMany({ where: { projectAssignmentId, deletedAt: null } }));
  }
}
