import { AcknowledgementMethod, ReadAcknowledgementLog } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export declare class ReadAcknowledgementService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    listPendingForCurrentUser(): Promise<ReadAcknowledgementLog[]>;
    markViewed(ackLogId: string): Promise<ReadAcknowledgementLog>;
    acknowledge(ackLogId: string, method: AcknowledgementMethod): Promise<ReadAcknowledgementLog>;
    private findOwnedOrThrow;
}
