import { EventEmitter2 } from "@nestjs/event-emitter";
import { InspectionFinding, InspectionFindingSeverity } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export declare const INSPECTION_FINDING_CREATED_EVENT = "inspection.finding_created";
export interface CreateInspectionFindingInput {
    inspectionRecordId: string;
    recordItemId?: string;
    title: string;
    description: string;
    severity: InspectionFindingSeverity;
    areaLocation?: string;
    targetCloseDate?: Date;
}
export interface InspectionFindingCreatedEvent {
    tenantId: string;
    inspectionFindingId: string;
    inspectionRecordId: string;
    severity: InspectionFindingSeverity;
    title: string;
    identifiedBy: string;
    identifiedAt: Date;
}
/**
 * Task 3.6 (Modul 08 §4 poin 6-8/§6 BR-05). BELUM ada controller HTTP.
 * PRD §4 poin 7 "setiap inspection_findings SECARA DEFAULT langsung
 * membuat action item di Modul 24 Action Tracking" + TASK_INSTRUCTION.md
 * literal "di-stub sebagai event inspection.finding_created untuk saat
 * ini" — Modul 24 BELUM ADA (task 7.4), jadi create() HANYA emit event via
 * EventEmitter2 (pola infra SAMA WORKFLOW_INSTANCE_COMPLETED_EVENT tapi
 * NAMESPACE terpisah, BUKAN lewat WorkflowEngineService) — TIDAK ADA
 * listener yang genuinely mengonsumsi event ini sekarang di codebase ini.
 */
export declare class InspectionFindingService {
    private readonly prisma;
    private readonly eventEmitter;
    constructor(prisma: PrismaService, eventEmitter: EventEmitter2);
    create(input: CreateInspectionFindingInput): Promise<InspectionFinding>;
    /** Titik sinkronisasi MANUAL begitu Modul 24 genuinely ada dan action
     * item dibuat DI SANA — TIDAK ADA listener otomatis di codebase ini yang
     * memanggil ini (gap TDD §26, pola sama
     * IncidentCorrectiveActionLinkService.updateCapaStatusCache(), 3.5). */
    linkActionTracking(inspectionFindingId: string, actionTrackingId: string): Promise<InspectionFinding>;
    /** BR-05 — eskalasi CAPA BERSIFAT MANUAL/OPSIONAL, TIDAK ADA proses
     * otomatis yang membuat CAPA utk seluruh temuan — ini SATU-SATUNYA
     * jalur mengisi escalated_capa_register_id. */
    escalateToCapa(inspectionFindingId: string, capaRegisterId: string): Promise<InspectionFinding>;
    close(inspectionFindingId: string): Promise<InspectionFinding>;
    listByRecord(inspectionRecordId: string): Promise<InspectionFinding[]>;
}
