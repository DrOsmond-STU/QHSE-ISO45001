import { HealthSurveillanceEnrollment, HealthSurveillanceProgram, OhExposureType, OhMonitoringFrequency, OhSurveillanceProgramStatus } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export interface CreateHealthSurveillanceProgramInput {
    siteId: string;
    departmentId?: string;
    programName: string;
    exposureType: OhExposureType;
    relatedHiraId?: string;
    targetPopulationCriteria: string;
    monitoringFrequency: OhMonitoringFrequency;
    mcuPackageRequired?: string;
    startDate: Date;
    reviewDate?: Date;
}
export declare class HealthSurveillanceProgramService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(input: CreateHealthSurveillanceProgramInput): Promise<HealthSurveillanceProgram>;
    transitionStatus(id: string, status: OhSurveillanceProgramStatus): Promise<HealthSurveillanceProgram>;
    getById(id: string): Promise<HealthSurveillanceProgram>;
    listBySite(siteId: string): Promise<HealthSurveillanceProgram[]>;
    enroll(healthSurveillanceProgramId: string, employeeUserId: string, enrollmentDate: Date): Promise<HealthSurveillanceEnrollment>;
    exitEnrollment(enrollmentId: string, exitDate: Date, exitReason: string): Promise<HealthSurveillanceEnrollment>;
    listEnrollmentsByProgram(healthSurveillanceProgramId: string): Promise<HealthSurveillanceEnrollment[]>;
    listActiveEnrollmentsByEmployee(employeeUserId: string): Promise<HealthSurveillanceEnrollment[]>;
}
