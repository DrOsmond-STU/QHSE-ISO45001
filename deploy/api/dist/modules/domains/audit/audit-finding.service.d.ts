import { EventEmitter2 } from "@nestjs/event-emitter";
import { AuditFinding, AuditFindingClassification } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export declare const AUDIT_FINDING_CAPA_REQUIRED_EVENT = "audit.finding_capa_required";
export interface CreateAuditFindingInput {
    auditId: string;
    checklistItemId?: string;
    findingNumber: string;
    classification: AuditFindingClassification;
    clauseReference?: string;
    description: string;
    evidenceDescription?: string;
    requiresCapa?: boolean;
}
export interface AuditFindingCapaRequiredEvent {
    tenantId: string;
    auditFindingId: string;
    auditId: string;
    classification: AuditFindingClassification;
    description: string;
    identifiedBy: string;
    identifiedAt: Date;
}
/**
 * Task 4.1 (Modul 09 §4 poin 6/§6 BR-02/04/05, §7). PRD §7 "audit_findings
 * Major/Minor NC memicu CAPA (source_type=AUDIT_FINDING)" — Modul 10 (CAPA,
 * task 4.2) BELUM ADA, jadi create() HANYA emit event via EventEmitter2
 * (pola PERSIS InspectionFindingService.INSPECTION_FINDING_CREATED_EVENT
 * 3.6, namespace `audit.` bukan lewat WorkflowEngineService) BILA
 * requiresCapa=true (default TRUE utk Major/Minor NC, BISA override manual
 * jadi true utk Observation/OFI juga — event tetap dipicu kalau override
 * begitu, konsisten literal "memicu CAPA" merujuk ke requires_capa BUKAN
 * classification mentah). TIDAK ADA listener yang genuinely mengonsumsi
 * event ini sekarang di codebase ini — linkCapaRegister() jadi titik
 * sinkronisasi MANUAL begitu Modul 10 genuinely ada, gap TDD §26.
 */
export declare class AuditFindingService {
    private readonly prisma;
    private readonly eventEmitter;
    constructor(prisma: PrismaService, eventEmitter: EventEmitter2);
    create(input: CreateAuditFindingInput): Promise<AuditFinding>;
    /**
     * BR-05 — "Perubahan classification wajib dicatat di system_audit_logs
     * (OTOMATIS via audit_log_trigger generik, TIDAK ADA kode tambahan di
     * sini) dan memicu perhitungan ulang target_closure_date."
     */
    updateClassification(auditFindingId: string, classification: AuditFindingClassification): Promise<AuditFinding>;
    setAuditeeResponse(auditFindingId: string, auditeeResponse: string): Promise<AuditFinding>;
    /** Titik sinkronisasi MANUAL begitu Modul 10 genuinely ada dan CAPA
     * dibuat DI SANA — TIDAK ADA listener otomatis, pola sama
     * InspectionFindingService.linkActionTracking() 3.6. */
    linkCapaRegister(auditFindingId: string, capaRegisterId: string): Promise<AuditFinding>;
    verify(auditFindingId: string): Promise<AuditFinding>;
    close(auditFindingId: string): Promise<AuditFinding>;
    getById(auditFindingId: string): Promise<AuditFinding>;
    listByAudit(auditId: string): Promise<AuditFinding[]>;
}
