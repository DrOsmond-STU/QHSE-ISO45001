import { ComplianceObligation, ObligationFrequency, ObligationType } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export interface CreateComplianceObligationInput {
    regulatoryRegisterId: string;
    obligationDescription: string;
    obligationType: ObligationType;
    frequency: ObligationFrequency;
    obligationCode?: string;
    clauseReference?: string;
    responsibleUserId?: string;
    responsibleDepartmentId?: string;
    applicableSiteId?: string;
    nextDueDate?: Date;
}
export interface UpdateComplianceObligationInput {
    obligationDescription?: string;
    clauseReference?: string;
    responsibleUserId?: string;
    responsibleDepartmentId?: string;
    applicableSiteId?: string;
    frequency?: ObligationFrequency;
    nextDueDate?: Date;
}
export declare class ComplianceObligationService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    /**
     * BR-04 (PRD §6) — register SUPERSEDED/REVOKED tidak boleh jadi acuan
     * obligation BARU. Status register dibaca DI DALAM transaksi yang sama
     * dgn create (bukan query terpisah sebelumnya) supaya tidak ada celah
     * TOCTOU antara pengecekan dan penulisan.
     */
    create(input: CreateComplianceObligationInput): Promise<ComplianceObligation>;
    update(obligationId: string, input: UpdateComplianceObligationInput): Promise<ComplianceObligation>;
    getById(obligationId: string): Promise<ComplianceObligation>;
    listByRegister(regulatoryRegisterId: string): Promise<ComplianceObligation[]>;
    /** PRD §2.2/§6 — obligation tidak lagi berlaku (mis. regulasi dicabut
     * tapi jejak historis evaluasi terkait tetap harus tersimpan) — status
     * RETIRED (BUKAN delete), pola sama IndustryTemplateService.deactivate()
     * (1.2)/DocumentService.retire() (2.1). */
    retire(obligationId: string): Promise<ComplianceObligation>;
}
