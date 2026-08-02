import { RiskMatrixAxis, RiskMatrixConfig, RiskMatrixLevel, RiskMatrixCell, RiskMatrixModuleScope } from "@prisma/client";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
export interface RiskMatrixLevelInput {
    axis: RiskMatrixAxis;
    levelValue: number;
    label: string;
    description?: string;
}
export interface RiskMatrixCellInput {
    likelihoodValue: number;
    severityValue: number;
    riskScore: number;
    riskLevel: string;
    colorCode: string;
    requiredActionDescription?: string;
    requiresEscalation?: boolean;
}
export interface CreateRiskMatrixConfigInput {
    name: string;
    applicableModuleScope?: RiskMatrixModuleScope;
    likelihoodLevels?: number;
    severityLevels?: number;
    levels: RiskMatrixLevelInput[];
    cells: RiskMatrixCellInput[];
}
export interface CreateRiskMatrixVersionInput {
    name: string;
    likelihoodLevels?: number;
    severityLevels?: number;
    levels: RiskMatrixLevelInput[];
    cells: RiskMatrixCellInput[];
}
export type RiskMatrixConfigWithGrid = RiskMatrixConfig & {
    levels: RiskMatrixLevel[];
    cells: RiskMatrixCell[];
};
export declare class RiskMatrixConfigService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    /**
     * Authoring matriks BARU (Visual Builder, PRD §12) — satu unit kerja
     * (config+levels+cells) ditulis SEKALIGUS dalam satu withRls(), TIDAK ADA
     * panggilan ke service lain yang membuka withRls()/$transaction sendiri
     * di dalamnya (aman dari pitfall nested-transaction 2.1). Partial unique
     * index (1 aktif per tenant+scope, task 103) menegakkan caller TIDAK
     * bisa create() kedua kali utk scope yang sudah py versi aktif — pesan
     * error diarahkan ke createNewVersion() sbg gantinya.
     */
    create(input: CreateRiskMatrixConfigInput): Promise<RiskMatrixConfig>;
    /**
     * BR-09 (PRD §6) — "Perubahan risk_matrix_configs membuat versi BARU;
     * assessment yang sudah dibuat tetap mengacu versi lama, tidak berubah
     * skornya secara retroaktif." Baris LAMA disentuh HANYA utk isActive->false
     * (kolom lain SAMA SEKALI tidak diupdate) — deactivate dilakukan SEBELUM
     * insert baris baru dalam transaksi yang SAMA, supaya partial unique index
     * tidak pernah sempat melihat 2 baris aktif utk scope yang sama di titik
     * mana pun (bukan celah TOCTOU antara dua transaksi terpisah).
     */
    createNewVersion(previousConfigId: string, input: CreateRiskMatrixVersionInput): Promise<RiskMatrixConfig>;
    /**
     * PRD §5 "NULL berarti berlaku lebih luas"-style fallback (pola sama
     * DocumentService.listPublishedForCurrentUser() 2.1 utk site/department
     * NULL) — konfigurasi scope-spesifik (mis. HIRA) MENANG kalau ada &
     * aktif, baru fallback ke scope ALL kalau tidak. Dipakai task 3.2 saat
     * hira_assessments/dst butuh tahu matriks mana yang berlaku.
     */
    resolveActiveConfig(scope: RiskMatrixModuleScope): Promise<RiskMatrixConfig>;
    getById(configId: string): Promise<RiskMatrixConfigWithGrid>;
    listVersions(scope: RiskMatrixModuleScope): Promise<RiskMatrixConfig[]>;
}
