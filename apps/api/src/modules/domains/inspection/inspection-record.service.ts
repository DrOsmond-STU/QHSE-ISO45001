import { BadRequestException, Injectable } from "@nestjs/common";
import { InspectionRecord, InspectionRecordItem } from "@prisma/client";
import { NumberingService } from "../../../platform/numbering/numbering.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./inspection-context";
import { validateInspectionRecordStatusTransition } from "./inspection-lifecycle";
import { assertAllMandatoryItemsAnswered } from "./inspection-mandatory-items";
import { InspectionNumberingBootstrapService } from "./inspection-numbering-bootstrap.service";
import { computeAllMandatoryItemsPassed, computeItemScore, computeOverallResult, computeOverallScore } from "./inspection-scoring";

const INSPECTION_NUMBERING_MODULE_CODE = "INSPECTION";

export interface CreateInspectionRecordInput {
  // Caller resolves WHICH template version: ad-hoc callers typically call
  // InspectionChecklistTemplateService.resolveActiveTemplate(inspectionTypeId)
  // first; schedule-driven generation (inspection-record-generation-scan)
  // passes the schedule's OWN pinned inspectionChecklistTemplateId directly.
  // Keeping resolution OUTSIDE this method is what let the scan job reuse
  // this exact method instead of duplicating the insert.
  inspectionChecklistTemplateId: string;
  inspectionScheduleId?: string;
  siteId: string;
  departmentId?: string;
  plannedDate?: Date;
  inspectorId: string;
}

export interface SubmitInspectionRecordItemInput {
  templateItemId: string;
  responseValue: string;
  comment?: string;
}

// Task 3.6 (Modul 08 §4 poin 3-6/§6 BR-01/02/03). BELUM ada controller
// HTTP — inspection.record.* sudah di-seed RBAC baseline (task 167).
@Injectable()
export class InspectionRecordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numberingService: NumberingService,
    private readonly numberingBootstrapService: InspectionNumberingBootstrapService,
  ) {}

  /**
   * PRD §4 poin 3 "Sistem membangkitkan instance inspection_records otomatis
   * dari jadwal MENJELANG tanggal jatuh tempo, ATAU Inspector menginisiasi
   * inspeksi ad-hoc langsung dari inspection_types TANPA jadwal" —
   * inspectionScheduleId opsional (NULL = ad-hoc). BR-07 snapshot terpenuhi
   * KRN inspectionChecklistTemplateId yang caller suplai disimpan permanen
   * di baris ini, TIDAK PERNAH ikut berubah kalau template dapat versi baru.
   */
  async create(input: CreateInspectionRecordInput): Promise<InspectionRecord> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();

    await this.numberingBootstrapService.ensureNumberingConfig(input.siteId);
    const site = await this.prisma.withRls((tx) =>
      tx.site.findUniqueOrThrow({ where: { id: input.siteId }, select: { siteCode: true, companyId: true, branchId: true } }),
    );
    const inspectionRecordNumber = await this.numberingService.generateNext(INSPECTION_NUMBERING_MODULE_CODE, {
      scopeId: input.siteId,
      variables: { SITE_CODE: site.siteCode },
    });

    return this.prisma.withRls((tx) =>
      tx.inspectionRecord.create({
        data: {
          tenantId,
          inspectionRecordNumber,
          inspectionScheduleId: input.inspectionScheduleId,
          inspectionChecklistTemplateId: input.inspectionChecklistTemplateId,
          companyId: site.companyId,
          branchId: site.branchId,
          siteId: input.siteId,
          departmentId: input.departmentId,
          plannedDate: input.plannedDate,
          inspectorId: input.inspectorId,
          status: "SCHEDULED",
          createdBy,
          updatedBy: createdBy,
        },
      }),
    );
  }

  async start(inspectionRecordId: string): Promise<InspectionRecord> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls(async (tx) => {
      const record = await tx.inspectionRecord.findUniqueOrThrow({ where: { id: inspectionRecordId } });
      validateInspectionRecordStatusTransition(record.status, "IN_PROGRESS");
      return tx.inspectionRecord.update({
        where: { id: inspectionRecordId },
        data: { status: "IN_PROGRESS", actualDate: record.actualDate ?? new Date(), updatedBy },
      });
    });
  }

  /** Upsert-by-(record,templateItem) — Inspector boleh mengoreksi jawaban
   * sebelum status COMPLETED (TIDAK ADA guard "sekali isi terkunci" —
   * PRD tidak menyebutnya). scoreObtained dihitung LANGSUNG saat submit
   * (computeItemScore()), BUKAN ditunda ke complete(). */
  async submitItemResponse(inspectionRecordId: string, input: SubmitInspectionRecordItemInput): Promise<InspectionRecordItem> {
    const actorId = requireActorUserId();
    const tenantId = requireTenantId();
    return this.prisma.withRls(async (tx) => {
      const templateItem = await tx.inspectionChecklistTemplateItem.findUniqueOrThrow({ where: { id: input.templateItemId } });
      const scoreObtained = computeItemScore(templateItem.responseType, input.responseValue, Number(templateItem.weight));

      const existing = await tx.inspectionRecordItem.findUnique({
        where: { inspectionRecordId_templateItemId: { inspectionRecordId, templateItemId: input.templateItemId } },
      });
      if (existing) {
        return tx.inspectionRecordItem.update({
          where: { id: existing.id },
          data: { responseValue: input.responseValue, scoreObtained, comment: input.comment, updatedBy: actorId },
        });
      }
      return tx.inspectionRecordItem.create({
        data: {
          tenantId,
          inspectionRecordId,
          templateItemId: input.templateItemId,
          responseValue: input.responseValue,
          scoreObtained,
          comment: input.comment,
          createdBy: actorId,
          updatedBy: actorId,
        },
      });
    });
  }

  /**
   * BR-01 (seluruh item mandatory terjawab) + BR-02 (foto wajib utk item
   * requires_photo_if_fail=TRUE ber-response FAIL — dicek lewat query
   * `attachments` LANGSUNG, entity_type=inspection_record_item, POLA SAMA
   * precedent cross-module read-only lain di codebase ini, BUKAN inject
   * AttachmentService) ditegakkan SEBELUM tulis apa pun. BR-03 — overall_score/
   * overall_result dihitung SAAT INI (pure fn incident-scoring.ts).
   */
  async complete(inspectionRecordId: string): Promise<InspectionRecord> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls(async (tx) => {
      const record = await tx.inspectionRecord.findUniqueOrThrow({ where: { id: inspectionRecordId } });
      validateInspectionRecordStatusTransition(record.status, "COMPLETED");

      const template = await tx.inspectionChecklistTemplate.findUniqueOrThrow({ where: { id: record.inspectionChecklistTemplateId } });
      const templateItems = await tx.inspectionChecklistTemplateItem.findMany({
        where: { inspectionChecklistTemplateId: record.inspectionChecklistTemplateId },
      });
      const recordItems = await tx.inspectionRecordItem.findMany({ where: { inspectionRecordId } });
      const templateItemById = new Map(templateItems.map((t) => [t.id, t]));

      assertAllMandatoryItemsAnswered(
        templateItems.map((t) => ({ id: t.id, isMandatory: t.isMandatory })),
        recordItems.map((r) => ({ templateItemId: r.templateItemId })),
      );

      for (const recordItem of recordItems) {
        const templateItem = templateItemById.get(recordItem.templateItemId);
        if (templateItem?.requiresPhotoIfFail && recordItem.responseValue === "FAIL") {
          const photoCount = await tx.attachment.count({
            where: { entityType: "inspection_record_item", entityId: recordItem.id, scanStatus: "CLEAN" },
          });
          if (photoCount === 0) {
            throw new BadRequestException(
              `inspection_record_items ${recordItem.id} wajib memiliki minimal 1 foto (attachments) krn response=FAIL pada item requires_photo_if_fail=TRUE (BR-02).`,
            );
          }
        }
      }

      const overallScore = computeOverallScore(
        recordItems.map((r) => ({
          scoreObtained: r.scoreObtained !== null ? Number(r.scoreObtained) : null,
          weight: Number(templateItemById.get(r.templateItemId)?.weight ?? 1),
        })),
      );
      const allMandatoryPassed = computeAllMandatoryItemsPassed(
        recordItems.map((r) => {
          const templateItem = templateItemById.get(r.templateItemId)!;
          return { isMandatory: templateItem.isMandatory, responseType: templateItem.responseType, responseValue: r.responseValue };
        }),
      );
      const overallResult = computeOverallResult(
        template.scoringMethod,
        overallScore,
        template.passingScoreThreshold !== null ? Number(template.passingScoreThreshold) : null,
        allMandatoryPassed,
      );

      return tx.inspectionRecord.update({
        where: { id: inspectionRecordId },
        data: { status: "COMPLETED", overallScore, overallResult, actualDate: record.actualDate ?? new Date(), updatedBy },
      });
    });
  }

  /** BR-03 "dibuka ulang (reopen) oleh HSE Manager dengan jejak audit" —
   * "siapa boleh" ditegakkan lewat RBAC (permission_code) di layer
   * pemanggil (BELUM ada controller HTTP), jejak audit lewat
   * audit_log_trigger generik + updatedBy. overallScore/overallResult
   * SENGAJA TIDAK direset (biar tetap terlihat nilai TERAKHIR sampai
   * complete() dipanggil ulang). */
  async reopen(inspectionRecordId: string): Promise<InspectionRecord> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls(async (tx) => {
      const record = await tx.inspectionRecord.findUniqueOrThrow({ where: { id: inspectionRecordId } });
      validateInspectionRecordStatusTransition(record.status, "IN_PROGRESS");
      return tx.inspectionRecord.update({ where: { id: inspectionRecordId }, data: { status: "IN_PROGRESS", updatedBy } });
    });
  }

  async cancel(inspectionRecordId: string): Promise<InspectionRecord> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls(async (tx) => {
      const record = await tx.inspectionRecord.findUniqueOrThrow({ where: { id: inspectionRecordId } });
      validateInspectionRecordStatusTransition(record.status, "CANCELLED");
      return tx.inspectionRecord.update({ where: { id: inspectionRecordId }, data: { status: "CANCELLED", updatedBy } });
    });
  }

  async getById(inspectionRecordId: string) {
    return this.prisma.withRls((tx) =>
      tx.inspectionRecord.findUniqueOrThrow({
        where: { id: inspectionRecordId },
        include: { items: true, findings: true, scores: true },
      }),
    );
  }
}
