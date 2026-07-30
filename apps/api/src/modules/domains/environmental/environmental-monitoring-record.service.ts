import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { EnvironmentalMonitoringRecord, EnvMonitoringType } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { NumberingService } from "../../../platform/numbering/numbering.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { requireActorUserId, requireTenantId } from "./environmental-context";
import { assertLabReportAttachedBeforeVerified, calculateComplianceStatus, validateMonitoringRecordStatusTransition } from "./monitoring-rules";
import { EnvironmentalWorkflowBootstrapService } from "./environmental-workflow-bootstrap.service";

const MONITORING_NUMBERING_MODULE_CODE = "ENV_MONITORING";
const MONITORING_ATTACHMENT_ENTITY_TYPE = "environmental_monitoring_record";

// BR-02 — "compliance_status=EXCEED otomatis membuat draft CAPA" (PRD §4.2
// poin 2/§6, BEDA dari NCR 5.1 yang lunak "dapat memicu" — kata "otomatis"
// literal di sini) — diwujudkan EVENT STUB (EventEmitter2, pola PERSIS
// AuditFindingService.AUDIT_FINDING_CAPA_REQUIRED_EVENT 4.1), dikonsumsi
// EnvironmentalMonitoringCapaTriggerListener yg hidup DI DALAM CapaModule
// (bukan modul ini) — arah dependency SEARAH (CapaModule mengimpor
// EnvironmentalModule, BUKAN sebaliknya), pola sama Audit->CAPA 4.1/4.2.
export const ENV_MONITORING_CAPA_REQUIRED_EVENT = "environmental.monitoring_capa_required";

export interface EnvMonitoringCapaRequiredEvent {
  tenantId: string;
  monitoringRecordId: string;
  siteId: string;
  monitoringNumber: string;
  parameterName: string;
  resultValue: number;
  identifiedBy: string;
  identifiedAt: Date;
}

export interface CreateMonitoringRecordInput {
  siteId: string;
  monitoringType: EnvMonitoringType;
  monitoringPointCode: string;
  monitoringPointName: string;
  parameterName: string;
  unitOfMeasure: string;
  resultValue: number;
  bakuMutuMin?: number;
  bakuMutuMax?: number;
  regulatoryReference?: string;
  samplingDate: Date;
  samplingTime?: Date;
  analysisMethod?: string;
  labName?: string;
  labAccreditationNo?: string;
  sampleTakenBy?: string;
  analyzedBy?: string;
  reportNumber?: string;
  weatherCondition?: string;
  relatedPermitId?: string;
}

/**
 * Task 5.2 (Modul 12 §4.2, §3 "Environmental Officer | environmental.monitoring.create",
 * "HSE Manager | environmental.monitoring.view_all"). BELUM ada controller
 * HTTP.
 */
@Injectable()
export class EnvironmentalMonitoringRecordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numberingService: NumberingService,
    private readonly bootstrapService: EnvironmentalWorkflowBootstrapService,
    private readonly eventEmitter: EventEmitter2,
    private readonly notificationService: NotificationService,
  ) {}

  async create(input: CreateMonitoringRecordInput): Promise<EnvironmentalMonitoringRecord> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();
    const identifiedAt = new Date();

    await this.bootstrapService.ensureMonitoringNumberingConfig(input.siteId);
    const site = await this.prisma.withRls((tx) => tx.site.findUniqueOrThrow({ where: { id: input.siteId }, select: { siteCode: true } }));
    const monitoringNumber = await this.numberingService.generateNext(MONITORING_NUMBERING_MODULE_CODE, {
      scopeId: input.siteId,
      variables: { SITE_CODE: site.siteCode },
    });

    const complianceStatus = calculateComplianceStatus(input.resultValue, input.bakuMutuMin ?? null, input.bakuMutuMax ?? null);

    const record = await this.prisma.withRls((tx) =>
      tx.environmentalMonitoringRecord.create({
        data: {
          tenantId,
          siteId: input.siteId,
          monitoringNumber,
          monitoringType: input.monitoringType,
          monitoringPointCode: input.monitoringPointCode,
          monitoringPointName: input.monitoringPointName,
          parameterName: input.parameterName,
          unitOfMeasure: input.unitOfMeasure,
          resultValue: input.resultValue,
          bakuMutuMin: input.bakuMutuMin,
          bakuMutuMax: input.bakuMutuMax,
          regulatoryReference: input.regulatoryReference,
          complianceStatus,
          samplingDate: input.samplingDate,
          samplingTime: input.samplingTime,
          analysisMethod: input.analysisMethod,
          labName: input.labName,
          labAccreditationNo: input.labAccreditationNo,
          sampleTakenBy: input.sampleTakenBy,
          analyzedBy: input.analyzedBy,
          reportNumber: input.reportNumber,
          weatherCondition: input.weatherCondition,
          relatedPermitId: input.relatedPermitId,
          status: "RECORDED",
          createdBy,
          updatedBy: createdBy,
        },
      }),
    );

    if (complianceStatus === "EXCEED") {
      const event: EnvMonitoringCapaRequiredEvent = {
        tenantId,
        monitoringRecordId: record.id,
        siteId: record.siteId,
        monitoringNumber: record.monitoringNumber,
        parameterName: record.parameterName,
        resultValue: input.resultValue,
        identifiedBy: createdBy,
        identifiedAt,
      };
      this.eventEmitter.emit(ENV_MONITORING_CAPA_REQUIRED_EVENT, event);

      // PRD §8 "compliance_status=EXCEED | HSE Manager, Top Management,
      // Environmental Officer | In-app, Email, WhatsApp". "Top Management"
      // dipetakan COMPANY_ADMIN (pola sama seluruh modul), pola query
      // recipients PERSIS NcrRecordService.create() 5.1 CRITICAL notif.
      const recipients = await this.prisma.withRls((tx) =>
        tx.user.findMany({
          where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: { in: ["HSE_MANAGER", "COMPANY_ADMIN", "ENVIRONMENTAL_OFFICER"] } } } } },
          select: { id: true },
        }),
      );
      for (const recipient of recipients) {
        await this.notificationService.enqueue({
          eventType: "ENVIRONMENTAL_MONITORING_EXCEED",
          entityType: "ENVIRONMENTAL_MONITORING_RECORD",
          entityId: record.id,
          recipientUserId: recipient.id,
          priority: "CRITICAL",
          eventCategory: "ENVIRONMENTAL",
          variables: { parameterName: record.parameterName, monitoringPointName: record.monitoringPointName },
        });
      }
    }

    return record;
  }

  /** BR-07 — gate RECORDED->VERIFIED, hasLabReportAttachment dihitung dari attachments generik. */
  async verify(monitoringRecordId: string): Promise<EnvironmentalMonitoringRecord> {
    const updatedBy = requireActorUserId();
    const record = await this.prisma.withRls((tx) => tx.environmentalMonitoringRecord.findUniqueOrThrow({ where: { id: monitoringRecordId } }));
    validateMonitoringRecordStatusTransition(record.status, "VERIFIED");

    const attachmentCount = await this.prisma.withRls((tx) =>
      tx.attachment.count({ where: { entityType: MONITORING_ATTACHMENT_ENTITY_TYPE, entityId: monitoringRecordId } }),
    );
    assertLabReportAttachedBeforeVerified(attachmentCount > 0);

    return this.prisma.withRls((tx) => tx.environmentalMonitoringRecord.update({ where: { id: monitoringRecordId }, data: { status: "VERIFIED", updatedBy } }));
  }

  async markReportedToRegulator(monitoringRecordId: string): Promise<EnvironmentalMonitoringRecord> {
    const updatedBy = requireActorUserId();
    const record = await this.prisma.withRls((tx) => tx.environmentalMonitoringRecord.findUniqueOrThrow({ where: { id: monitoringRecordId } }));
    validateMonitoringRecordStatusTransition(record.status, "REPORTED_TO_REGULATOR");
    return this.prisma.withRls((tx) =>
      tx.environmentalMonitoringRecord.update({ where: { id: monitoringRecordId }, data: { status: "REPORTED_TO_REGULATOR", updatedBy } }),
    );
  }

  /** Dipanggil EnvironmentalMonitoringCapaTriggerListener (CapaModule) setelah capa_register dibuat. */
  async linkCapaRegister(monitoringRecordId: string, capaRegisterId: string): Promise<EnvironmentalMonitoringRecord> {
    return this.prisma.withRls((tx) => tx.environmentalMonitoringRecord.update({ where: { id: monitoringRecordId }, data: { capaRegisterId } }));
  }

  async getById(monitoringRecordId: string): Promise<EnvironmentalMonitoringRecord> {
    return this.prisma.withRls((tx) => tx.environmentalMonitoringRecord.findUniqueOrThrow({ where: { id: monitoringRecordId } }));
  }

  async listBySite(siteId: string): Promise<EnvironmentalMonitoringRecord[]> {
    return this.prisma.withRls((tx) => tx.environmentalMonitoringRecord.findMany({ where: { siteId }, orderBy: { createdAt: "desc" } }));
  }
}
