import { EmergencyActivation, EmergencyActivationTriggerContext, EmergencyType } from "@prisma/client";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export interface DeclareEmergencyActivationInput {
    siteId: string;
    emergencyResponsePlanId?: string;
    triggerContext: EmergencyActivationTriggerContext;
    relatedEmergencyDrillId?: string;
    emergencyType: EmergencyType;
    description?: string;
    totalExpectedHeadcount?: number;
}
export interface EmergencyActivationProgress {
    activation: EmergencyActivation;
    totalCheckedInCount: number;
    missingPersonCount: number | null;
}
/**
 * Task 3.7 (Modul 14 §4.4/§6 BR-07). Acceptance criterion literal
 * TASK_INSTRUCTION.md 3.7 — "aktivasi darurat (emergency_activations)
 * memicu notifikasi broadcast prioritas tinggi (0.11)". PRD §8 baris
 * pertama: "trigger_context=REAL_EMERGENCY -> Seluruh karyawan/kontraktor
 * di site terkait, Top Management, HSE Manager, In-app+WhatsApp/Telegram
 * (prioritas TERTINGGI)". `NotificationService.enqueue()` (0.11) HANYA
 * terima SATU recipientUserId per panggilan — "broadcast" diimplementasikan
 * sbg LOOP sequential per resolved recipient (TIDAK ada infrastruktur
 * batch-notification baru di codebase ini) — NFR §11 "beban lonjakan
 * ratusan/ribuan submit" TIDAK ditangani strategi arsitektur khusus
 * (queue/rate-limit terpisah), gap TDD §26. `trigger_context=DRILL` TIDAK
 * memicu broadcast SAMA SEKALI (PRD §8 baris itu eksplisit HANYA
 * REAL_EMERGENCY).
 */
export declare class EmergencyActivationService {
    private readonly prisma;
    private readonly notificationService;
    constructor(prisma: PrismaService, notificationService: NotificationService);
    declare(input: DeclareEmergencyActivationInput): Promise<EmergencyActivation>;
    private broadcastRealEmergencyActivation;
    markAllClear(emergencyActivationId: string): Promise<EmergencyActivation>;
    standDown(emergencyActivationId: string): Promise<EmergencyActivation>;
    /** PRD §4.4 poin 5 — "Jika berkembang menjadi insiden formal ->
     * ditautkan related_incident_report_id ... untuk investigasi lanjutan."
     * Tautan MANUAL (caller sudah membuat IncidentReport terpisah lewat
     * IncidentReportService, di luar modul ini) — pola sama
     * IncidentCorrectiveActionLinkService (3.5). */
    linkIncidentReport(emergencyActivationId: string, incidentReportId: string): Promise<EmergencyActivation>;
    /** BR-07 — total_checked_in_count/missing_person_count DIHITUNG di sini
     * (bukan disimpan/didenormalisasi, lihat banner comment schema.prisma)
     * dari agregasi LIVE muster_point_checkins — TIDAK PERNAH stale. Caller
     * (API response/UI) WAJIB menampilkan disclaimer eksplisit (PRD §12) —
     * fungsi/method ini TIDAK menyertakan teks disclaimer (bukan tanggung
     * jawab layer data). */
    getWithProgress(emergencyActivationId: string): Promise<EmergencyActivationProgress>;
    getById(emergencyActivationId: string): Promise<EmergencyActivation>;
}
