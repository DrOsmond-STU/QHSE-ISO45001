import { EnvironmentalPermit, EnvPermitMedia, EnvPermitMonitoringFrequency, Prisma } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export interface CreateEnvironmentalPermitInput {
    licensePermitId: string;
    permitMedia: EnvPermitMedia;
    requiredMonitoringParameters?: Prisma.InputJsonValue;
    requiredMonitoringFrequency?: EnvPermitMonitoringFrequency;
    reportingObligationTo?: string;
}
/**
 * Task 5.2 (Modul 12 §5, BR-05 — 1:1 ekstensi `licenses_permits` Modul 04).
 * BELUM ada controller HTTP. Validasi `licensePermitId` via QUERY PRISMA
 * LANGSUNG ke `licenses_permits` (pola sama `assertSourceValidIfKnownContract()`
 * CAPA 4.2/5.1) — TIDAK mengimpor RegulatoryComplianceModule (arah
 * dependency: Prisma schema shared resource, NestJS module boundary bukan
 * soal per-tabel ownership, lihat memory project-qhse-dev-conventions.md
 * "Module layering rule").
 */
export declare class EnvironmentalPermitService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(input: CreateEnvironmentalPermitInput): Promise<EnvironmentalPermit>;
    recordReportSubmitted(environmentalPermitId: string): Promise<EnvironmentalPermit>;
    getById(environmentalPermitId: string): Promise<EnvironmentalPermit>;
    getByLicensePermitId(licensePermitId: string): Promise<EnvironmentalPermit | null>;
}
