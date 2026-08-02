import { ListQueryDto } from "../../../platform/common/list-query.dto";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export declare class ContractorController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(query: ListQueryDto): Promise<{
        data: {
            status: import("@prisma/client").$Enums.ContractorStatus;
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            deletedAt: Date | null;
            address: string | null;
            businessRegistrationNo: string | null;
            contactPersonName: string | null;
            contactPersonPhone: string | null;
            contactPersonEmail: string | null;
            contractorName: string;
            contractorType: import("@prisma/client").$Enums.ContractorType;
            businessLicenseType: string | null;
            taxIdNpwp: string | null;
            city: string | null;
            province: string | null;
            contractorCategory: import("@prisma/client").$Enums.ContractorCategory;
            parentContractorId: string | null;
            overallRiskRating: import("@prisma/client").$Enums.ContractorRiskRating;
            registeredAt: Date | null;
        }[];
        meta: {
            page: number;
            limit: number;
            total: number;
        };
    }>;
    getById(id: string): Promise<{
        data: {
            status: import("@prisma/client").$Enums.ContractorStatus;
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            deletedAt: Date | null;
            address: string | null;
            businessRegistrationNo: string | null;
            contactPersonName: string | null;
            contactPersonPhone: string | null;
            contactPersonEmail: string | null;
            contractorName: string;
            contractorType: import("@prisma/client").$Enums.ContractorType;
            businessLicenseType: string | null;
            taxIdNpwp: string | null;
            city: string | null;
            province: string | null;
            contractorCategory: import("@prisma/client").$Enums.ContractorCategory;
            parentContractorId: string | null;
            overallRiskRating: import("@prisma/client").$Enums.ContractorRiskRating;
            registeredAt: Date | null;
        };
    }>;
}
