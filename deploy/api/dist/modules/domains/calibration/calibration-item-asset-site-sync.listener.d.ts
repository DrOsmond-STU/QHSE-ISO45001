import { AssetSiteChangedEvent } from "../asset-equipment/asset-transfer.service";
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
export declare class CalibrationItemAssetSiteSyncListener {
    private readonly itemService;
    private readonly logger;
    constructor(itemService: CalibrationItemService);
    onAssetSiteChanged(payload: AssetSiteChangedEvent): Promise<void>;
}
