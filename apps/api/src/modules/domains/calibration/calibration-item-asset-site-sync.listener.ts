import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { AssetSiteChangedEvent, ASSET_SITE_CHANGED_EVENT } from "../asset-equipment/asset-transfer.service";
import { tenantContextStorage } from "../../../platform/tenancy/tenant-context";
import { CalibrationItemService } from "./calibration-item.service";

/**
 * Task 6.2 — BR-08 Modul 16, konsumen ASSET_SITE_CHANGED_EVENT (stub baru
 * ditambah retroaktif ke AssetTransferService.transfer() 6.1, lihat banner
 * comment di sana). Payload-only, pola PERSIS listener modul lain sesi ini.
 * Arah impor SEARAH (Calibration -> Asset Equipment, HANYA tipe event +
 * konstanta nama event, BUKAN service Asset Equipment manapun) — Calibration
 * "bergantung penuh" pada Asset Equipment (PRD §1 literal), jadi arah ini
 * konsisten dgn dependency Modul 15 (LEBIH TUA) <- Modul 16 (LEBIH BARU).
 */
@Injectable()
export class CalibrationItemAssetSiteSyncListener {
  private readonly logger = new Logger(CalibrationItemAssetSiteSyncListener.name);

  constructor(private readonly itemService: CalibrationItemService) {}

  @OnEvent(ASSET_SITE_CHANGED_EVENT)
  async onAssetSiteChanged(payload: AssetSiteChangedEvent): Promise<void> {
    await tenantContextStorage.run({ tenantId: payload.tenantId }, async () => {
      try {
        await this.itemService.syncSiteId(payload.assetId, payload.newSiteId);
      } catch (err) {
        this.logger.error(`Gagal sinkron calibration_items.site_id utk asset=${payload.assetId}: ${err instanceof Error ? err.message : err}`);
      }
    });
  }
}
