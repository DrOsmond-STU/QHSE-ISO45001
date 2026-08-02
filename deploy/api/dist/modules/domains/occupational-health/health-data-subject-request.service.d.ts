import { HealthDataSubjectRequest, OhSubjectRequestType } from "@prisma/client";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export interface SubmitSubjectRequestInput {
    employeeUserId: string;
    requestType: OhSubjectRequestType;
    requestDetail: string;
}
export declare class HealthDataSubjectRequestService {
    private readonly prisma;
    private readonly notificationService;
    constructor(prisma: PrismaService, notificationService: NotificationService);
    submit(input: SubmitSubjectRequestInput): Promise<HealthDataSubjectRequest>;
    beginReview(id: string): Promise<HealthDataSubjectRequest>;
    /** BR-06 — SATU-SATUNYA jalur pemrosesan ERASURE_ANONYMIZATION. Kalau
     * request_type BUKAN ERASURE_ANONYMIZATION, gunakan approve()/reject()/
     * complete() manual (ACCESS_COPY/CORRECTION/PROCESSING_RESTRICTION tidak
     * punya prosedur otomatis — ditangani proses manual OH Staff/DPO). */
    processErasure(id: string, minimumRetentionDaysOverride?: number): Promise<HealthDataSubjectRequest>;
    approve(id: string, resolutionNotes?: string): Promise<HealthDataSubjectRequest>;
    reject(id: string, rejectionReason: string): Promise<HealthDataSubjectRequest>;
    complete(id: string, resolutionNotes: string): Promise<HealthDataSubjectRequest>;
    getById(id: string): Promise<HealthDataSubjectRequest>;
    listByEmployee(employeeUserId: string): Promise<HealthDataSubjectRequest[]>;
}
