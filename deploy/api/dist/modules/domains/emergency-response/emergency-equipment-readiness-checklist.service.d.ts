import { EmergencyEquipmentReadinessChecklist, EquipmentReadinessStatus } from "@prisma/client";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export interface CreateEmergencyEquipmentReadinessChecklistInput {
    siteId: string;
    assetId: string;
    inspectionDate: Date;
    readinessStatus: EquipmentReadinessStatus;
    issueDescription?: string;
    capaId?: string;
    linkedMaintenanceRecordId?: string;
    nextCheckDueDate?: Date;
}
/**
 * Task 3.7 (Modul 14 §4.5/§6 BR-06). BELUM ada controller HTTP.
 *
 * BR-06 poin 1 — "asset_id wajib merujuk pada assets.is_safety_critical=TRUE
 * (Modul 15)" TIDAK BISA ditegakkan — Modul 15 (Asset & Equipment
 * Management) BELUM ADA di codebase ini (task 6.1, Phase 6) — assetId
 * bare UUID TANPA FK sama sekali (lihat banner comment schema.prisma),
 * jadi validasi silang "genuinely aset kritis" mustahil dilakukan
 * sekarang, gap TDD §26.
 *
 * BR-06 poin 2 — "readiness_status=OUT_OF_SERVICE pada alat kritis wajib
 * memicu notifikasi eskalasi REAL-TIME ke HSE Manager & Site Manager
 * (TIDAK menunggu siklus laporan berkala)" — DIIMPLEMENTASIKAN sinkron
 * DI DALAM create() (bukan scan job terpisah, sesuai "real-time" literal).
 * "Site Manager" TIDAK ADA sbg role di roster 15-role baseline (§3 modul
 * ini SENDIRI juga tidak memberi permission_code apa pun ke persona itu)
 * — eskalasi HANYA ke HSE_MANAGER, gap TDD §26.
 */
export declare class EmergencyEquipmentReadinessChecklistService {
    private readonly prisma;
    private readonly notificationService;
    constructor(prisma: PrismaService, notificationService: NotificationService);
    create(input: CreateEmergencyEquipmentReadinessChecklistInput): Promise<EmergencyEquipmentReadinessChecklist>;
    private escalateOutOfService;
    getById(readinessChecklistId: string): Promise<EmergencyEquipmentReadinessChecklist>;
    listBySite(siteId: string): Promise<EmergencyEquipmentReadinessChecklist[]>;
}
