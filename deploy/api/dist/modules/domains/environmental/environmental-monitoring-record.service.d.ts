import { EventEmitter2 } from "@nestjs/event-emitter";
import { EnvironmentalMonitoringRecord, EnvMonitoringType } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { NumberingService } from "../../../platform/numbering/numbering.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { EnvironmentalWorkflowBootstrapService } from "./environmental-workflow-bootstrap.service";
export declare const ENV_MONITORING_CAPA_REQUIRED_EVENT = "environmental.monitoring_capa_required";
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
export declare class EnvironmentalMonitoringRecordService {
    private readonly prisma;
    private readonly numberingService;
    private readonly bootstrapService;
    private readonly eventEmitter;
    private readonly notificationService;
    constructor(prisma: PrismaService, numberingService: NumberingService, bootstrapService: EnvironmentalWorkflowBootstrapService, eventEmitter: EventEmitter2, notificationService: NotificationService);
    create(input: CreateMonitoringRecordInput): Promise<EnvironmentalMonitoringRecord>;
    /** BR-07 — gate RECORDED->VERIFIED, hasLabReportAttachment dihitung dari attachments generik. */
    verify(monitoringRecordId: string): Promise<EnvironmentalMonitoringRecord>;
    markReportedToRegulator(monitoringRecordId: string): Promise<EnvironmentalMonitoringRecord>;
    /** Dipanggil EnvironmentalMonitoringCapaTriggerListener (CapaModule) setelah capa_register dibuat. */
    linkCapaRegister(monitoringRecordId: string, capaRegisterId: string): Promise<EnvironmentalMonitoringRecord>;
    getById(monitoringRecordId: string): Promise<EnvironmentalMonitoringRecord>;
    listBySite(siteId: string): Promise<EnvironmentalMonitoringRecord[]>;
}
