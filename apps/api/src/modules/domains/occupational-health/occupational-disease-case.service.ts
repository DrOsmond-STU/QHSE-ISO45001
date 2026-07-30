import { Injectable } from "@nestjs/common";
import { OccupationalDiseaseCase, OhAccessReason, OhDiseaseCategory, OhPakCaseStatus, OhSeverityClassification, OhWorkRelatedness } from "@prisma/client";
import { FieldEncryptionService } from "../../../platform/field-encryption/field-encryption.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { NumberingService } from "../../../platform/numbering/numbering.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { WorkflowEngineService } from "../../../platform/workflow-engine/workflow-engine.service";
import { requiresTopManagementEscalation, validatePakCaseStatusTransition } from "./pak-case-lifecycle";
import { requireActorUserId, requireTenantId } from "./occupational-health-context";
import { OccupationalHealthAccessControlService } from "./occupational-health-access-control.service";
import { MedicalRecordAccessLogService } from "./medical-record-access-log.service";
import { OccupationalHealthWorkflowBootstrapService } from "./occupational-health-workflow-bootstrap.service";

const PAK_NUMBERING_MODULE_CODE = "OH_PAK";
const PAK_CASE_WORKFLOW_ENTITY_TYPE = "occupational_disease_case";

export interface CreatePakCaseInput {
  siteId: string;
  departmentId?: string;
  employeeUserId: string;
  diagnosisDate: Date;
  diagnosedBy: string;
  diseaseCategory: OhDiseaseCategory;
  diagnosisDetail?: string;
  suspectedCausalAgentExposure?: string;
  relatedHiraId?: string;
  relatedEnvironmentalMonitoringRecordId?: string;
  severityClassification: OhSeverityClassification;
}

export type DecryptedPakCase = Omit<OccupationalDiseaseCase, "diagnosisDetailEncrypted" | "suspectedCausalAgentExposureEncrypted"> & {
  diagnosisDetail: string | null;
  suspectedCausalAgentExposure: string | null;
};

// PRD §4.3 — occupational_disease_cases ADA di enum accessed_entity_type
// (PAK_CASE) DAN literal BR-01 -- dual-gate + access-log PENUH. BR-10
// (deskripsi CAPA sistemik) TIDAK bisa ditegakkan dari sini (field bebas-
// teks CapaRegister.problemStatement, modul ini tidak kontrol isinya) —
// linkCapaRegister() TETAP caller-supplied manual (PRD §4.3 poin 4 TIDAK
// pernah menulis "otomatis", BEDA literal dari Environmental BR-02).
@Injectable()
export class OccupationalDiseaseCaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fieldEncryption: FieldEncryptionService,
    private readonly accessControl: OccupationalHealthAccessControlService,
    private readonly accessLog: MedicalRecordAccessLogService,
    private readonly numberingService: NumberingService,
    private readonly bootstrapService: OccupationalHealthWorkflowBootstrapService,
    private readonly workflowEngineService: WorkflowEngineService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(input: CreatePakCaseInput, reasonForAccess: OhAccessReason, reasonNotes?: string): Promise<DecryptedPakCase> {
    const tenantId = requireTenantId();
    const actorUserId = requireActorUserId();

    await this.accessControl.assertPhiAccessAuthorized({ scopeType: "SITE", scopeId: input.siteId });

    await this.bootstrapService.ensurePakNumberingConfig(input.siteId);
    const site = await this.prisma.withRls((tx) => tx.site.findUniqueOrThrow({ where: { id: input.siteId }, select: { siteCode: true } }));
    const caseNumber = await this.numberingService.generateNext(PAK_NUMBERING_MODULE_CODE, {
      scopeId: input.siteId,
      variables: { SITE_CODE: site.siteCode },
    });

    const [diagnosisDetailEncrypted, suspectedCausalAgentExposureEncrypted] = await Promise.all([
      this.fieldEncryption.encrypt(tenantId, input.diagnosisDetail),
      this.fieldEncryption.encrypt(tenantId, input.suspectedCausalAgentExposure),
    ]);

    const record = await this.prisma.withRls((tx) =>
      tx.occupationalDiseaseCase.create({
        data: {
          tenantId,
          siteId: input.siteId,
          departmentId: input.departmentId,
          caseNumber,
          employeeUserId: input.employeeUserId,
          diagnosisDate: input.diagnosisDate,
          diagnosedBy: input.diagnosedBy,
          diseaseCategory: input.diseaseCategory,
          diagnosisDetailEncrypted,
          suspectedCausalAgentExposureEncrypted,
          relatedHiraId: input.relatedHiraId,
          relatedEnvironmentalMonitoringRecordId: input.relatedEnvironmentalMonitoringRecordId,
          severityClassification: input.severityClassification,
          workRelatednessDetermination: "UNDER_INVESTIGATION",
          caseStatus: "OPEN",
          createdBy: actorUserId,
          updatedBy: actorUserId,
        },
      }),
    );

    await this.accessLog.recordAccess({
      subjectEmployeeUserId: input.employeeUserId,
      accessedEntityType: "PAK_CASE",
      accessedEntityId: record.id,
      accessType: "EDIT",
      reasonForAccess,
      reasonNotes,
    });

    // BR-08 — eskalasi ke Top Management, ringkasan AGREGAT/non-identifiable
    // (kategori & site SAJA, TIDAK PERNAH employeeUserId/nama) DAN ke OH
    // Staff (detail penuh, PRD §8 baris 4 "detail penuh hanya OH Staff") —
    // DUA event type TERPISAH (bukan satu event dgn variables berbeda) demi
    // BR-03/§3.1 structural: recipient Top Management TIDAK PERNAH menerima
    // payload yang secara teknis BISA memuat employeeUserId. Dicek+dikirim
    // LANGSUNG di sini (pola sama Environmental "SIGNIFICANT tanpa kontrol"
    // 5.2), bukan scan job terjadwal (PRD tidak beri timing lain).
    if (requiresTopManagementEscalation(input.severityClassification)) {
      const topManagement = await this.prisma.withRls((tx) =>
        tx.user.findMany({ where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "COMPANY_ADMIN" } } } }, select: { id: true } }),
      );
      for (const recipient of topManagement) {
        await this.notificationService.enqueue({
          eventType: "OCCUPATIONAL_HEALTH_PAK_CASE_SEVERE_AGGREGATE",
          entityType: "PAK_CASE",
          entityId: record.id,
          recipientUserId: recipient.id,
          priority: "CRITICAL",
          eventCategory: "OCCUPATIONAL_HEALTH",
          variables: { severityClassification: input.severityClassification, siteId: input.siteId },
        });
      }

      const ohStaff = await this.prisma.withRls((tx) =>
        tx.user.findMany({ where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "OCCUPATIONAL_HEALTH_STAFF" } } } }, select: { id: true } }),
      );
      for (const recipient of ohStaff) {
        await this.notificationService.enqueue({
          eventType: "OCCUPATIONAL_HEALTH_PAK_CASE_SEVERE_DETAIL",
          entityType: "PAK_CASE",
          entityId: record.id,
          recipientUserId: recipient.id,
          priority: "CRITICAL",
          eventCategory: "OCCUPATIONAL_HEALTH",
          variables: { severityClassification: input.severityClassification, siteId: input.siteId, caseNumber: record.caseNumber, diseaseCategory: input.diseaseCategory },
        });
      }
    }

    return this.toDecrypted(tenantId, record, {
      diagnosisDetail: input.diagnosisDetail ?? null,
      suspectedCausalAgentExposure: input.suspectedCausalAgentExposure ?? null,
    });
  }

  async submitForReview(id: string): Promise<void> {
    const actorId = requireActorUserId();
    const existing = await this.prisma.withRls((tx) => tx.occupationalDiseaseCase.findUniqueOrThrow({ where: { id } }));
    if (existing.workflowInstanceId) {
      throw new Error("occupational_disease_cases sudah punya workflow_instance aktif — tunggu hasil review sebelum submit ulang.");
    }

    const definition = await this.prisma.withRls((tx) => this.bootstrapService.ensurePakCaseWorkflowDefinition(tx));
    const instance = await this.workflowEngineService.startInstance(PAK_CASE_WORKFLOW_ENTITY_TYPE, id, definition.id, {});

    await this.prisma.withRls((tx) =>
      tx.occupationalDiseaseCase.update({ where: { id }, data: { workflowInstanceId: instance.id, updatedBy: actorId } }),
    );
  }

  /** Dipanggil OccupationalDiseaseCaseWorkflowCompletionListener — review
   * (konfirmasi diagnosis + systemic risk) selesai, TIDAK mengubah
   * case_status (itu concern terpisah, perjalanan klinis nyata pasien,
   * ditegakkan transitionStatus() langsung oleh OH Staff). */
  async markReviewCompleted(id: string): Promise<void> {
    await this.prisma.withRls((tx) => tx.occupationalDiseaseCase.update({ where: { id }, data: { workflowInstanceId: null } }));
  }

  async recordWorkRelatednessDetermination(id: string, determination: OhWorkRelatedness): Promise<void> {
    const actorUserId = requireActorUserId();
    await this.prisma.withRls((tx) =>
      tx.occupationalDiseaseCase.update({ where: { id }, data: { workRelatednessDetermination: determination, updatedBy: actorUserId } }),
    );
  }

  async recordDisnakerReport(id: string, reportDate: Date, reportNumber: string): Promise<void> {
    const actorUserId = requireActorUserId();
    await this.prisma.withRls((tx) =>
      tx.occupationalDiseaseCase.update({
        where: { id },
        data: { reportedToDisnaker: true, disnakerReportDate: reportDate, disnakerReportNumber: reportNumber, updatedBy: actorUserId },
      }),
    );
  }

  async recordBpjsClaimNumber(id: string, claimNumber: string): Promise<void> {
    const actorUserId = requireActorUserId();
    await this.prisma.withRls((tx) =>
      tx.occupationalDiseaseCase.update({ where: { id }, data: { bpjsKetenagakerjaanClaimNumber: claimNumber, updatedBy: actorUserId } }),
    );
  }

  /** BR-10 — link MANUAL (caller sudah CapaRegisterService.create({sourceType:
   * "OCCUPATIONAL_DISEASE_CASE",...}) sendiri, deskripsi WAJIB sistemik/
   * non-identifiable — didisiplinkan proses/UI, TIDAK bisa dipaksa dari sini). */
  async linkCapaRegister(id: string, capaRegisterId: string): Promise<void> {
    const actorUserId = requireActorUserId();
    await this.prisma.withRls((tx) => tx.occupationalDiseaseCase.update({ where: { id }, data: { capaRegisterId, updatedBy: actorUserId } }));
  }

  async transitionStatus(id: string, to: OhPakCaseStatus): Promise<void> {
    const actorUserId = requireActorUserId();
    const existing = await this.prisma.withRls((tx) => tx.occupationalDiseaseCase.findUniqueOrThrow({ where: { id } }));
    validatePakCaseStatusTransition(existing.caseStatus, to);
    const closedDate = to === "CLOSED" ? new Date() : undefined;
    await this.prisma.withRls((tx) =>
      tx.occupationalDiseaseCase.update({ where: { id }, data: { caseStatus: to, closedDate, updatedBy: actorUserId } }),
    );
  }

  async getById(id: string, reasonForAccess: OhAccessReason, reasonNotes?: string): Promise<DecryptedPakCase> {
    const tenantId = requireTenantId();
    const record = await this.prisma.withRls((tx) => tx.occupationalDiseaseCase.findUniqueOrThrow({ where: { id } }));

    await this.accessControl.assertPhiAccessAuthorized({ scopeType: "SITE", scopeId: record.siteId });

    await this.accessLog.recordAccess({
      subjectEmployeeUserId: record.employeeUserId,
      accessedEntityType: "PAK_CASE",
      accessedEntityId: record.id,
      accessType: "VIEW",
      reasonForAccess,
      reasonNotes,
    });

    return this.toDecrypted(tenantId, record);
  }

  private async toDecrypted(
    tenantId: string,
    record: OccupationalDiseaseCase,
    plainHint?: { diagnosisDetail: string | null; suspectedCausalAgentExposure: string | null },
  ): Promise<DecryptedPakCase> {
    const { diagnosisDetailEncrypted, suspectedCausalAgentExposureEncrypted, ...rest } = record;
    if (plainHint) {
      return { ...rest, ...plainHint };
    }
    const [diagnosisDetail, suspectedCausalAgentExposure] = await Promise.all([
      this.fieldEncryption.decrypt(tenantId, diagnosisDetailEncrypted),
      this.fieldEncryption.decrypt(tenantId, suspectedCausalAgentExposureEncrypted),
    ]);
    return { ...rest, diagnosisDetail, suspectedCausalAgentExposure };
  }
}
