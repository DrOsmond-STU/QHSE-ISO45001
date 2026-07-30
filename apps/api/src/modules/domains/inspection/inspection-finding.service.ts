import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InspectionFinding, InspectionFindingSeverity } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./inspection-context";

export const INSPECTION_FINDING_CREATED_EVENT = "inspection.finding_created";

export interface CreateInspectionFindingInput {
  inspectionRecordId: string;
  recordItemId?: string;
  title: string;
  description: string;
  severity: InspectionFindingSeverity;
  areaLocation?: string;
  targetCloseDate?: Date;
}

export interface InspectionFindingCreatedEvent {
  tenantId: string;
  inspectionFindingId: string;
  inspectionRecordId: string;
  severity: InspectionFindingSeverity;
  title: string;
  identifiedBy: string;
  identifiedAt: Date;
}

/**
 * Task 3.6 (Modul 08 §4 poin 6-8/§6 BR-05). BELUM ada controller HTTP.
 * PRD §4 poin 7 "setiap inspection_findings SECARA DEFAULT langsung
 * membuat action item di Modul 24 Action Tracking" + TASK_INSTRUCTION.md
 * literal "di-stub sebagai event inspection.finding_created untuk saat
 * ini" — Modul 24 BELUM ADA (task 7.4), jadi create() HANYA emit event via
 * EventEmitter2 (pola infra SAMA WORKFLOW_INSTANCE_COMPLETED_EVENT tapi
 * NAMESPACE terpisah, BUKAN lewat WorkflowEngineService) — TIDAK ADA
 * listener yang genuinely mengonsumsi event ini sekarang di codebase ini.
 */
@Injectable()
export class InspectionFindingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(input: CreateInspectionFindingInput): Promise<InspectionFinding> {
    const identifiedBy = requireActorUserId();
    const tenantId = requireTenantId();

    const finding = await this.prisma.withRls((tx) =>
      tx.inspectionFinding.create({
        data: {
          tenantId,
          inspectionRecordId: input.inspectionRecordId,
          recordItemId: input.recordItemId,
          title: input.title,
          description: input.description,
          severity: input.severity,
          areaLocation: input.areaLocation,
          status: "OPEN",
          identifiedBy,
          identifiedAt: new Date(),
          targetCloseDate: input.targetCloseDate,
          createdBy: identifiedBy,
          updatedBy: identifiedBy,
        },
      }),
    );

    const event: InspectionFindingCreatedEvent = {
      tenantId,
      inspectionFindingId: finding.id,
      inspectionRecordId: finding.inspectionRecordId,
      severity: finding.severity,
      title: finding.title,
      identifiedBy: finding.identifiedBy,
      identifiedAt: finding.identifiedAt,
    };
    this.eventEmitter.emit(INSPECTION_FINDING_CREATED_EVENT, event);

    return finding;
  }

  /** Titik sinkronisasi MANUAL begitu Modul 24 genuinely ada dan action
   * item dibuat DI SANA — TIDAK ADA listener otomatis di codebase ini yang
   * memanggil ini (gap TDD §26, pola sama
   * IncidentCorrectiveActionLinkService.updateCapaStatusCache(), 3.5). */
  async linkActionTracking(inspectionFindingId: string, actionTrackingId: string): Promise<InspectionFinding> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.inspectionFinding.update({
        where: { id: inspectionFindingId },
        data: { actionTrackingId, status: "ACTION_ASSIGNED", updatedBy },
      }),
    );
  }

  /** BR-05 — eskalasi CAPA BERSIFAT MANUAL/OPSIONAL, TIDAK ADA proses
   * otomatis yang membuat CAPA utk seluruh temuan — ini SATU-SATUNYA
   * jalur mengisi escalated_capa_register_id. */
  async escalateToCapa(inspectionFindingId: string, capaRegisterId: string): Promise<InspectionFinding> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.inspectionFinding.update({
        where: { id: inspectionFindingId },
        data: { escalatedCapaRegisterId: capaRegisterId, status: "ESCALATED_TO_CAPA", updatedBy },
      }),
    );
  }

  async close(inspectionFindingId: string): Promise<InspectionFinding> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.inspectionFinding.update({ where: { id: inspectionFindingId }, data: { status: "CLOSED", closedAt: new Date(), updatedBy } }),
    );
  }

  async listByRecord(inspectionRecordId: string): Promise<InspectionFinding[]> {
    return this.prisma.withRls((tx) => tx.inspectionFinding.findMany({ where: { inspectionRecordId }, orderBy: { identifiedAt: "desc" } }));
  }
}
