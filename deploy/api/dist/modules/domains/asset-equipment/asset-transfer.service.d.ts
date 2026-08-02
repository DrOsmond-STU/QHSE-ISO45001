import { EventEmitter2 } from "@nestjs/event-emitter";
import { Asset, AssetTransferLog } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { WorkflowEngineService } from "../../../platform/workflow-engine/workflow-engine.service";
import { AssetService } from "./asset.service";
export declare const DISPOSAL_WORKFLOW_ENTITY_TYPE = "asset";
export declare const ASSET_SITE_CHANGED_EVENT = "asset.site_changed";
export interface AssetSiteChangedEvent {
    tenantId: string;
    assetId: string;
    newSiteId: string;
}
export interface TransferAssetInput {
    assetId: string;
    toSiteId: string;
    transferDate: Date;
    reason?: string;
    requestedBy?: string;
    approvedBy?: string;
}
export declare class AssetTransferService {
    private readonly prisma;
    private readonly assetService;
    private readonly workflowEngine;
    private readonly eventEmitter;
    constructor(prisma: PrismaService, assetService: AssetService, workflowEngine: WorkflowEngineService, eventEmitter: EventEmitter2);
    transfer(input: TransferAssetInput): Promise<AssetTransferLog>;
    retire(assetId: string): Promise<Asset>;
    /** BR-03 — disposal langsung kalau kategori TIDAK mewajibkan approval,
     * ATAU mulai Workflow Engine (status TETAP belum DISPOSED sampai
     * disetujui) kalau kategori mewajibkannya. */
    requestDisposal(assetId: string): Promise<Asset>;
    /** Dipanggil AssetDisposalWorkflowCompletionListener. APPROVED -> DISPOSED
     * + nonaktifkan jadwal (BR-01). REJECTED -> lifecycle_status TIDAK
     * berubah (tetap ACTIVE/apa pun sebelumnya) — disposalWorkflowInstanceId
     * TIDAK di-null-kan (pointer sekali-pakai historis, lihat banner comment
     * schema.prisma), caller yang ingin coba lagi memanggil requestDisposal()
     * ULANG (instance BARU, menimpa pointer lama). */
    onDisposalWorkflowCompleted(assetId: string, approved: boolean): Promise<void>;
    private ensureDisposalWorkflowDefinition;
}
