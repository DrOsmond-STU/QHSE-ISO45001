"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CalibrationItemAssetSiteSyncListener_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalibrationItemAssetSiteSyncListener = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const asset_transfer_service_1 = require("../asset-equipment/asset-transfer.service");
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
const calibration_item_service_1 = require("./calibration-item.service");
/**
 * Task 6.2 — BR-08 Modul 16, konsumen ASSET_SITE_CHANGED_EVENT (stub baru
 * ditambah retroaktif ke AssetTransferService.transfer() 6.1, lihat banner
 * comment di sana). Payload-only, pola PERSIS listener modul lain sesi ini.
 * Arah impor SEARAH (Calibration -> Asset Equipment, HANYA tipe event +
 * konstanta nama event, BUKAN service Asset Equipment manapun) — Calibration
 * "bergantung penuh" pada Asset Equipment (PRD §1 literal), jadi arah ini
 * konsisten dgn dependency Modul 15 (LEBIH TUA) <- Modul 16 (LEBIH BARU).
 */
let CalibrationItemAssetSiteSyncListener = CalibrationItemAssetSiteSyncListener_1 = class CalibrationItemAssetSiteSyncListener {
    itemService;
    logger = new common_1.Logger(CalibrationItemAssetSiteSyncListener_1.name);
    constructor(itemService) {
        this.itemService = itemService;
    }
    async onAssetSiteChanged(payload) {
        await tenant_context_1.tenantContextStorage.run({ tenantId: payload.tenantId }, async () => {
            try {
                await this.itemService.syncSiteId(payload.assetId, payload.newSiteId);
            }
            catch (err) {
                this.logger.error(`Gagal sinkron calibration_items.site_id utk asset=${payload.assetId}: ${err instanceof Error ? err.message : err}`);
            }
        });
    }
};
exports.CalibrationItemAssetSiteSyncListener = CalibrationItemAssetSiteSyncListener;
__decorate([
    (0, event_emitter_1.OnEvent)(asset_transfer_service_1.ASSET_SITE_CHANGED_EVENT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CalibrationItemAssetSiteSyncListener.prototype, "onAssetSiteChanged", null);
exports.CalibrationItemAssetSiteSyncListener = CalibrationItemAssetSiteSyncListener = CalibrationItemAssetSiteSyncListener_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [calibration_item_service_1.CalibrationItemService])
], CalibrationItemAssetSiteSyncListener);
//# sourceMappingURL=calibration-item-asset-site-sync.listener.js.map