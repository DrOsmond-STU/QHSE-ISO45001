import { CalibrationCertificate, CalibrationResult, NumberingConfig } from "@prisma/client";
import { AuditLogService } from "../../../platform/audit-log/audit-log.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { NumberingService } from "../../../platform/numbering/numbering.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { WorkflowEngineService } from "../../../platform/workflow-engine/workflow-engine.service";
import { CalibrationScheduleService } from "./calibration-schedule.service";
import { OutOfToleranceRecordService } from "./out-of-tolerance-record.service";
export declare const CERTIFICATE_WORKFLOW_ENTITY_TYPE = "calibration_certificate";
export interface CreateCalibrationCertificateInput {
    calibrationScheduleId?: string;
    calibrationItemId: string;
    certificateNo: string;
    calibrationProviderId: string;
    calibrationDate: Date;
    calibrationResult: CalibrationResult;
    asFoundCondition?: string;
    asLeftCondition?: string;
    measurementUncertainty?: string;
    referenceStandardUsed?: string;
    environmentalConditions?: unknown;
}
export declare class CalibrationCertificateService {
    private readonly prisma;
    private readonly numbering;
    private readonly workflowEngine;
    private readonly notificationService;
    private readonly auditLogService;
    private readonly ootService;
    private readonly scheduleService;
    constructor(prisma: PrismaService, numbering: NumberingService, workflowEngine: WorkflowEngineService, notificationService: NotificationService, auditLogService: AuditLogService, ootService: OutOfToleranceRecordService, scheduleService: CalibrationScheduleService);
    ensureNumberingConfig(siteId: string): Promise<NumberingConfig>;
    create(input: CreateCalibrationCertificateInput): Promise<CalibrationCertificate>;
    submitForReview(id: string, overrideJustification?: string): Promise<CalibrationCertificate>;
    onReviewCompleted(certificateId: string, approved: boolean): Promise<void>;
    private createNextSchedule;
    private ensureCertificateWorkflowDefinition;
}
