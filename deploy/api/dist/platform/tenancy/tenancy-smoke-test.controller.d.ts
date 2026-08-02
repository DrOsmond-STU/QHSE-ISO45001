import { PrismaService } from "./prisma.service";
export declare class TenancySmokeTestController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    check(): Promise<{
        data: {
            id: string;
            tenantId: string;
            label: string;
        }[];
        meta: {
            count: number;
        };
    }>;
}
