import { IsolationLotoRecord, IsolationType } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export interface ApplyIsolationLotoInput {
    workPermitId: string;
    isolationPointDescription: string;
    isolationType: IsolationType;
    lockNumber?: string;
    tagNumber?: string;
    appliedBy: string;
    appliedAt: Date;
}
export declare class IsolationLotoRecordService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    apply(input: ApplyIsolationLotoInput): Promise<IsolationLotoRecord>;
    /** PRD §5 "Prinsip verifikasi independen (dua orang berbeda: pemasang vs
     * verifikator)" — verifiedBy WAJIB beda dari appliedBy, ditegakkan DI
     * SINI (bukan CHECK constraint DB — lihat banner comment schema.prisma
     * IsolationLotoRecord soal kenapa app-level guard dipilih drpd DB-level). */
    verify(isolationLotoId: string, verifiedBy: string): Promise<IsolationLotoRecord>;
    remove(isolationLotoId: string, removedBy: string): Promise<IsolationLotoRecord>;
    listByPermit(workPermitId: string): Promise<IsolationLotoRecord[]>;
}
