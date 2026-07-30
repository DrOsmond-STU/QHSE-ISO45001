import { BadRequestException, Injectable } from "@nestjs/common";
import { ContractorAssignmentStatus, ContractorProjectAssignment, ContractorRiskRating } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { NumberingService } from "../../../platform/numbering/numbering.service";
import { ContractorWorkflowBootstrapService } from "./contractor-workflow-bootstrap.service";
import { requireActorUserId, requireTenantId } from "./contractor-context";
import { isContractorEligibleForAssignment, isPtk007ComplianceSatisfied } from "./contractor-lifecycle";

const ASSIGNMENT_NUMBERING_MODULE_CODE = "CONTRACTOR_ASSIGNMENT";

export interface CreateAssignmentInput {
  contractorId: string;
  siteId: string;
  branchId?: string;
  contractTitle?: string;
  scopeOfWork?: string;
  contractStartDate: Date;
  contractEndDate?: Date;
  contractValue?: number;
  hsePlanDocumentId?: string;
  picInternalUserId: string;
  riskClassification: ContractorRiskRating;
  autoGenerateContractNo?: boolean;
  contractNo?: string;
}

@Injectable()
export class ContractorProjectAssignmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbering: NumberingService,
    private readonly workflowBootstrap: ContractorWorkflowBootstrapService,
  ) {}

  // §4.3 poin 1 — BR-01 kontraktor HANYA dapat ditugaskan jika
  // status=PREQUALIFIED atau ACTIVE.
  async create(input: CreateAssignmentInput): Promise<ContractorProjectAssignment> {
    const tenantId = requireTenantId();
    const actorUserId = requireActorUserId();

    const contractor = await this.prisma.withRls((tx) => tx.contractor.findUniqueOrThrow({ where: { id: input.contractorId } }));
    if (!isContractorEligibleForAssignment(contractor.status)) {
      throw new BadRequestException(
        `BR-01 — contractor_project_assignments tidak dapat dibuat: contractors.status="${contractor.status}" (harus PREQUALIFIED atau ACTIVE).`,
      );
    }

    const site = await this.prisma.withRls((tx) => tx.site.findUniqueOrThrow({ where: { id: input.siteId }, select: { companyId: true, siteCode: true } }));

    let contractNo = input.contractNo;
    if (input.autoGenerateContractNo) {
      await this.workflowBootstrap.ensureAssignmentNumberingConfig(input.siteId);
      contractNo = await this.numbering.generateNext(ASSIGNMENT_NUMBERING_MODULE_CODE, { scopeId: input.siteId, variables: { SITE_CODE: site.siteCode } });
    }

    return this.prisma.withRls((tx) =>
      tx.contractorProjectAssignment.create({
        data: {
          tenantId,
          contractorId: input.contractorId,
          companyId: site.companyId,
          branchId: input.branchId,
          siteId: input.siteId,
          contractNo,
          contractTitle: input.contractTitle,
          scopeOfWork: input.scopeOfWork,
          contractStartDate: input.contractStartDate,
          contractEndDate: input.contractEndDate,
          contractValue: input.contractValue,
          hsePlanDocumentId: input.hsePlanDocumentId,
          picInternalUserId: input.picInternalUserId,
          riskClassification: input.riskClassification,
          status: "PLANNED",
          createdBy: actorUserId,
          updatedBy: actorUserId,
        },
      }),
    );
  }

  // §4.3 poin 1 (transisi ke ACTIVE) — BR-04 utk tenant OIL_GAS wajib
  // IUJP+CSMS_CERTIFICATE compliance docs is_mandatory_for_ptk007=true
  // SEBELUM assignment ACTIVE.
  async activate(id: string): Promise<ContractorProjectAssignment> {
    const tenantId = requireTenantId();
    const actorUserId = requireActorUserId();

    const assignment = await this.prisma.withRls((tx) => tx.contractorProjectAssignment.findUniqueOrThrow({ where: { id } }));
    const tenant = await this.prisma.withRls((tx) =>
      tx.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { industryTemplate: { select: { code: true } } } }),
    );
    const isOilGasTenant = tenant.industryTemplate?.code === "OIL_GAS";

    const complianceDocs = await this.prisma.withRls((tx) =>
      tx.contractorDocumentCompliance.findMany({
        where: { contractorId: assignment.contractorId },
        select: { documentCategory: true, isMandatoryForPtk007: true },
      }),
    );

    if (!isPtk007ComplianceSatisfied(isOilGasTenant, complianceDocs.map((d) => ({ category: d.documentCategory, isMandatoryForPtk007: d.isMandatoryForPtk007 })))) {
      throw new BadRequestException(
        "BR-04 — assignment tidak dapat ACTIVE: tenant sektor Migas wajib dokumen IUJP dan CSMS_CERTIFICATE (is_mandatory_for_ptk007=true) pada contractor_document_compliance.",
      );
    }

    return this.prisma.withRls((tx) => tx.contractorProjectAssignment.update({ where: { id }, data: { status: "ACTIVE", updatedBy: actorUserId } }));
  }

  async updateStatus(id: string, status: ContractorAssignmentStatus): Promise<ContractorProjectAssignment> {
    const actorUserId = requireActorUserId();
    return this.prisma.withRls((tx) => tx.contractorProjectAssignment.update({ where: { id }, data: { status, updatedBy: actorUserId } }));
  }

  // §4.3 poin 5 — perwakilan kontraktor di lapangan ditautkan SETELAH
  // pekerja terdaftar (bidirectional FK dgn contractor_workers, keduanya
  // nullable — urutan create WAJIB assignment dulu baru worker, lihat
  // banner comment schema.prisma blok Modul 17).
  async setContractorPic(id: string, contractorPicWorkerId: string): Promise<ContractorProjectAssignment> {
    const actorUserId = requireActorUserId();
    return this.prisma.withRls((tx) => tx.contractorProjectAssignment.update({ where: { id }, data: { contractorPicWorkerId, updatedBy: actorUserId } }));
  }

  async getById(id: string): Promise<ContractorProjectAssignment> {
    return this.prisma.withRls((tx) => tx.contractorProjectAssignment.findUniqueOrThrow({ where: { id } }));
  }
}
