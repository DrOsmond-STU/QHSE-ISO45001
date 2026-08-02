import { PrismaService } from "../tenancy/prisma.service";
export declare class RbacController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    listPermissions(): Promise<{
        data: {
            action: string;
            isActive: boolean;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            moduleCode: string;
            description: string | null;
            permissionCode: string;
            entity: string;
            permissionGroupId: string | null;
        }[];
    }>;
}
