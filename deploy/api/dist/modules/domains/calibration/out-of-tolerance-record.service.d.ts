import { CalibrationCertificate, CalibrationItem, OotImpactLevel, OutOfToleranceRecord } from "@prisma/client";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export interface AssessImpactInput {
    potentialImpactAssessment?: string;
    affectedPeriodFrom?: Date;
    affectedPeriodTo?: Date;
    impactLevel: OotImpactLevel;
    requiresIncidentReport?: boolean;
}
export declare class OutOfToleranceRecordService {
    private readonly prisma;
    private readonly notificationService;
    constructor(prisma: PrismaService, notificationService: NotificationService);
    createFromFailedCertificate(certificate: CalibrationCertificate, item: CalibrationItem): Promise<OutOfToleranceRecord>;
    assessImpact(id: string, input: AssessImpactInput): Promise<OutOfToleranceRecord>;
    linkCapaRegister(id: string, capaRegisterId: string): Promise<OutOfToleranceRecord>;
    linkIncidentReport(id: string, incidentReportId: string): Promise<OutOfToleranceRecord>;
    close(id: string): Promise<OutOfToleranceRecord>;
    getById(id: string): Promise<OutOfToleranceRecord>;
}
