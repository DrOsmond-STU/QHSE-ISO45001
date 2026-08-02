import { DistributionTargetType, DocumentDistribution } from "@prisma/client";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export interface CreateDistributionInput {
    documentId: string;
    documentVersionId: string;
    distributionTargetType: DistributionTargetType;
    distributionTargetId?: string;
    requiresAcknowledgement?: boolean;
    acknowledgementDueDays?: number;
}
export declare class DocumentDistributionService {
    private readonly prisma;
    private readonly notificationService;
    constructor(prisma: PrismaService, notificationService: NotificationService);
    createDistribution(input: CreateDistributionInput): Promise<DocumentDistribution>;
    /** PRD §4.2 poin 2 — "sistem meng-expand target menjadi baris individual
     * per user yang match target PADA SAAT DISTRIBUSI (snapshot keanggotaan
     * saat itu)" — hasil dipakai SEKALI utk createMany di atas, TIDAK pernah
     * di-refresh otomatis kalau keanggotaan role/site/dept berubah belakangan
     * (snapshot literal, bukan live query). */
    private resolveTargetUserIds;
}
