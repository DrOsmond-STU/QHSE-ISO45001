import { Injectable } from "@nestjs/common";
import { HealthDataSubjectRequest, OhSubjectRequestType } from "@prisma/client";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { canProcessErasureRequest } from "./consent-and-subject-request-rules";
import { requireActorUserId, requireTenantId } from "./occupational-health-context";

export interface SubmitSubjectRequestInput {
  employeeUserId: string;
  requestType: OhSubjectRequestType;
  requestDetail: string;
}

// PRD §4.6/§6 BR-06. processErasure() SENGAJA TIDAK melalui dual-gate BR-02/
// access-log BR-01 — operasi ini TIDAK PERNAH mendekripsi/merender konten
// PHI ke pemanggil (hanya menulis NULL ke kolom [ENCRYPTED] + status), jadi
// tidak ada risiko "PHI bocor ke viewer tidak berwenang" yang jadi alasan
// dual-gate ada — konsisten dgn RBAC baseline PRD §3.2 yang HANYA kasih
// DPO/Compliance Officer subject_request.handle + access_log.view, TANPA
// read_phi/write (role ini secara desain tidak perlu "melihat" PHI utk
// menghapusnya).
@Injectable()
export class HealthDataSubjectRequestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async submit(input: SubmitSubjectRequestInput): Promise<HealthDataSubjectRequest> {
    const tenantId = requireTenantId();
    const actorUserId = requireActorUserId();
    const request = await this.prisma.withRls((tx) =>
      tx.healthDataSubjectRequest.create({
        data: {
          tenantId,
          employeeUserId: input.employeeUserId,
          requestType: input.requestType,
          requestDate: new Date(),
          requestDetail: input.requestDetail,
          handledBy: actorUserId,
          status: "SUBMITTED",
          createdBy: actorUserId,
          updatedBy: actorUserId,
        },
      }),
    );

    // PRD §8 baris 6 — "health_data_subject_requests baru diajukan -> OH
    // Staff/DPO."
    const recipients = await this.prisma.withRls((tx) =>
      tx.user.findMany({
        where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: { in: ["OCCUPATIONAL_HEALTH_STAFF", "COMPLIANCE_OFFICER"] } } } } },
        select: { id: true },
      }),
    );
    for (const recipient of recipients) {
      await this.notificationService.enqueue({
        eventType: "OCCUPATIONAL_HEALTH_SUBJECT_REQUEST_SUBMITTED",
        entityType: "HEALTH_DATA_SUBJECT_REQUEST",
        entityId: request.id,
        recipientUserId: recipient.id,
        priority: "MEDIUM",
        eventCategory: "OCCUPATIONAL_HEALTH",
        variables: { requestType: input.requestType },
      });
    }

    return request;
  }

  async beginReview(id: string): Promise<HealthDataSubjectRequest> {
    const actorUserId = requireActorUserId();
    return this.prisma.withRls((tx) => tx.healthDataSubjectRequest.update({ where: { id }, data: { status: "IN_REVIEW", updatedBy: actorUserId } }));
  }

  /** BR-06 — SATU-SATUNYA jalur pemrosesan ERASURE_ANONYMIZATION. Kalau
   * request_type BUKAN ERASURE_ANONYMIZATION, gunakan approve()/reject()/
   * complete() manual (ACCESS_COPY/CORRECTION/PROCESSING_RESTRICTION tidak
   * punya prosedur otomatis — ditangani proses manual OH Staff/DPO). */
  async processErasure(id: string, minimumRetentionDaysOverride?: number): Promise<HealthDataSubjectRequest> {
    const actorUserId = requireActorUserId();
    const request = await this.prisma.withRls((tx) => tx.healthDataSubjectRequest.findUniqueOrThrow({ where: { id } }));
    if (request.requestType !== "ERASURE_ANONYMIZATION") {
      throw new Error(`processErasure() hanya berlaku utk request_type=ERASURE_ANONYMIZATION, bukan ${request.requestType}.`);
    }

    const medicalRecord = await this.prisma.withRls((tx) => tx.medicalRecord.findUnique({ where: { employeeUserId: request.employeeUserId } }));
    const lastRecordActivityDate = medicalRecord?.updatedAt ?? request.requestDate;

    const eligibility = canProcessErasureRequest({
      lastRecordActivityDate,
      requestDate: request.requestDate,
      minimumRetentionDays: minimumRetentionDaysOverride,
    });

    if (!eligibility.eligible) {
      return this.prisma.withRls((tx) =>
        tx.healthDataSubjectRequest.update({
          where: { id },
          data: { status: "REJECTED", rejectionReason: eligibility.rejectionReason, resolutionDate: new Date(), updatedBy: actorUserId },
        }),
      );
    }

    if (medicalRecord) {
      await this.prisma.withRls((tx) =>
        tx.medicalRecord.update({
          where: { id: medicalRecord.id },
          data: {
            bloodTypeEncrypted: null,
            knownAllergiesEncrypted: null,
            chronicConditionsEncrypted: null,
            currentMedicationsEncrypted: null,
            disabilityStatusEncrypted: null,
            immunizationHistoryEncrypted: null,
            baselineHealthNotesEncrypted: null,
            emergencyMedicalContactName: null,
            emergencyMedicalContactPhone: null,
            emergencyMedicalContactRelationship: null,
            recordStatus: "ANONYMIZED",
            updatedBy: actorUserId,
          },
        }),
      );
    }

    return this.prisma.withRls((tx) =>
      tx.healthDataSubjectRequest.update({
        where: { id },
        data: {
          status: "COMPLETED",
          resolutionNotes: "Data medical_records dianonimkan sesuai BR-06 (bukan hard-delete).",
          resolutionDate: new Date(),
          updatedBy: actorUserId,
        },
      }),
    );
  }

  async approve(id: string, resolutionNotes?: string): Promise<HealthDataSubjectRequest> {
    const actorUserId = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.healthDataSubjectRequest.update({ where: { id }, data: { status: "APPROVED", resolutionNotes, updatedBy: actorUserId } }),
    );
  }

  async reject(id: string, rejectionReason: string): Promise<HealthDataSubjectRequest> {
    const actorUserId = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.healthDataSubjectRequest.update({
        where: { id },
        data: { status: "REJECTED", rejectionReason, resolutionDate: new Date(), updatedBy: actorUserId },
      }),
    );
  }

  async complete(id: string, resolutionNotes: string): Promise<HealthDataSubjectRequest> {
    const actorUserId = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.healthDataSubjectRequest.update({
        where: { id },
        data: { status: "COMPLETED", resolutionNotes, resolutionDate: new Date(), updatedBy: actorUserId },
      }),
    );
  }

  async getById(id: string): Promise<HealthDataSubjectRequest> {
    return this.prisma.withRls((tx) => tx.healthDataSubjectRequest.findUniqueOrThrow({ where: { id } }));
  }

  async listByEmployee(employeeUserId: string): Promise<HealthDataSubjectRequest[]> {
    const tenantId = requireTenantId();
    return this.prisma.withRls((tx) => tx.healthDataSubjectRequest.findMany({ where: { tenantId, employeeUserId }, orderBy: { requestDate: "desc" } }));
  }
}
