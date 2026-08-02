"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedAssetEquipment = seedAssetEquipment;
const asset_category_service_1 = require("../../src/modules/domains/asset-equipment/asset-category.service");
const asset_transfer_service_1 = require("../../src/modules/domains/asset-equipment/asset-transfer.service");
const asset_service_1 = require("../../src/modules/domains/asset-equipment/asset.service");
const maintenance_due_scan_service_1 = require("../../src/modules/domains/asset-equipment/maintenance-due-scan.service");
const maintenance_record_service_1 = require("../../src/modules/domains/asset-equipment/maintenance-record.service");
const maintenance_schedule_service_1 = require("../../src/modules/domains/asset-equipment/maintenance-schedule.service");
const tenant_context_1 = require("../../src/platform/tenancy/tenant-context");
const context_1 = require("./context");
const shared_1 = require("./shared");
async function seedAssetEquipment(app, adminPrisma, ctx) {
    const categoryService = app.get(asset_category_service_1.AssetCategoryService);
    const assetService = app.get(asset_service_1.AssetService);
    const scheduleService = app.get(maintenance_schedule_service_1.MaintenanceScheduleService);
    const recordService = app.get(maintenance_record_service_1.MaintenanceRecordService);
    const transferService = app.get(asset_transfer_service_1.AssetTransferService);
    const scanService = app.get(maintenance_due_scan_service_1.MaintenanceDueScanService);
    const supervisor = (0, context_1.actor)(ctx, "SUPERVISOR"); // proxy "Facility Officer" — role sungguhan tidak ada di roster 18 baseline.
    const run = (userId, fn) => tenant_context_1.tenantContextStorage.run({ tenantId: ctx.tenantId, userId }, fn);
    const categorySafety = await run(supervisor.id, () => categoryService.create({ categoryName: "Peralatan Keselamatan & Pemadam Kebakaran", defaultIsSafetyCritical: true, requiresDisposalApproval: true }));
    const categoryGeneral = await run(supervisor.id, () => categoryService.create({ categoryName: "Peralatan Umum & Perkantoran", defaultIsSafetyCritical: false, requiresDisposalApproval: false }));
    const categoryHeavy = await run(supervisor.id, () => categoryService.create({ categoryName: "Alat Berat & Kendaraan Operasional", defaultIsSafetyCritical: false, requiresDisposalApproval: true }));
    // 1. Asset safety-critical bersih — maintenance schedule+record, next_due_date recompute.
    const asset1 = await run(supervisor.id, () => assetService.create({
        siteId: ctx.siteIdCepu,
        assetCategoryId: categorySafety.id,
        assetName: "APAR Gudang Bahan Kimia B3",
        manufacturer: "Chubb",
        modelNumber: "CO2-5KG",
        serialNumber: "APAR-2024-0088",
        purchaseDate: new Date("2024-03-15"),
    }));
    const schedule1 = await run(supervisor.id, () => scheduleService.create({ assetId: asset1.id, maintenanceType: "Inspeksi & isi ulang APAR", intervalType: "MONTHS", intervalValue: 6, nextDueDate: (0, context_1.daysAgo)(2) }));
    await run(supervisor.id, () => recordService.create({ assetId: asset1.id, maintenanceScheduleId: schedule1.id, performedDate: new Date(), performedBy: supervisor.id, resultCondition: "GOOD", findings: "Tekanan normal, segel baru dipasang" }));
    // 2. Asset safety-critical -> OUT_OF_SERVICE (BR-04 alert, dibiarkan terbuka).
    const asset2 = await run(supervisor.id, () => assetService.create({ siteId: ctx.siteIdCepu, assetCategoryId: categorySafety.id, assetName: "Genset Darurat Blok A", manufacturer: "Cummins", modelNumber: "C150D5" }));
    await run(supervisor.id, () => assetService.update(asset2.id, { conditionStatus: "OUT_OF_SERVICE" }));
    // 3. Asset interval RUNNING_HOURS — next_due_date TIDAK berubah oleh record.
    const asset3 = await run(supervisor.id, () => assetService.create({ siteId: ctx.siteIdCepu, assetCategoryId: categoryGeneral.id, assetName: "Forklift Gudang" }));
    const schedule3 = await run(supervisor.id, () => scheduleService.create({ assetId: asset3.id, maintenanceType: "Service 500 jam operasional", intervalType: "RUNNING_HOURS", intervalValue: 500, nextDueDate: (0, context_1.daysFromNow)(45) }));
    await run(supervisor.id, () => recordService.create({ assetId: asset3.id, maintenanceScheduleId: schedule3.id, performedDate: (0, context_1.daysAgo)(1), performedBy: supervisor.id, resultCondition: "GOOD" }));
    // 4. Asset disposal LANGSUNG — kategori tanpa requires_disposal_approval.
    const asset4 = await run(supervisor.id, () => assetService.create({ siteId: ctx.siteIdHq, assetCategoryId: categoryGeneral.id, assetName: "Meja Kantor Rusak" }));
    await run(supervisor.id, () => transferService.requestDisposal(asset4.id));
    // 5. Asset disposal via workflow 1-stage Company Admin (BR-03) -> DISPOSED.
    const asset5 = await run(supervisor.id, () => assetService.create({ siteId: ctx.siteIdCepu, assetCategoryId: categoryHeavy.id, assetName: "Crane Tower Bekas", manufacturer: "Zoomlion", purchaseDate: new Date("2015-06-01") }));
    await run(supervisor.id, () => scheduleService.create({ assetId: asset5.id, maintenanceType: "Kalibrasi tahunan", intervalType: "MONTHS", intervalValue: 12, nextDueDate: (0, context_1.daysFromNow)(60) }));
    const disposalPending = await run(supervisor.id, () => transferService.requestDisposal(asset5.id));
    await (0, shared_1.approveAllPendingStages)(app, adminPrisma, ctx.tenantId, disposalPending.disposalWorkflowInstanceId);
    // 6. Asset transfer antar site.
    const asset6 = await run(supervisor.id, () => assetService.create({ siteId: ctx.siteIdCepu, assetCategoryId: categoryHeavy.id, assetName: "Excavator Mini" }));
    await run(supervisor.id, () => transferService.transfer({ assetId: asset6.id, toSiteId: ctx.siteIdBalikpapan, transferDate: (0, context_1.daysAgo)(5), reason: "Rotasi kebutuhan proyek Balikpapan", requestedBy: supervisor.id }));
    // 7. Asset retire (BR-01, TIDAK digate BR-03 — beda dari disposal).
    const asset7 = await run(supervisor.id, () => assetService.create({ siteId: ctx.siteIdBalikpapan, assetCategoryId: categoryGeneral.id, assetName: "Mesin Las Lama" }));
    await run(supervisor.id, () => scheduleService.create({ assetId: asset7.id, maintenanceType: "Kalibrasi", intervalType: "MONTHS", intervalValue: 6, nextDueDate: (0, context_1.daysFromNow)(30) }));
    await run(supervisor.id, () => transferService.retire(asset7.id));
    // 8-9. maintenance-due-scan — dueSoon (responsibleRoleId eksplisit SUPERVISOR)
    // + overdue (fallback SUPERVISOR + cc HSE_MANAGER), dipanggil di akhir.
    const supervisorRole = await adminPrisma.role.findFirstOrThrow({ where: { tenantId: null, roleCode: "SUPERVISOR" } });
    const asset8 = await run(supervisor.id, () => assetService.create({ siteId: ctx.siteIdCepu, assetCategoryId: categoryGeneral.id, assetName: "Chiller Lantai 2" }));
    await run(supervisor.id, () => scheduleService.create({ assetId: asset8.id, maintenanceType: "Ganti filter & cek freon", intervalType: "MONTHS", intervalValue: 1, nextDueDate: (0, context_1.daysFromNow)(5), responsibleRoleId: supervisorRole.id }));
    const asset9 = await run(supervisor.id, () => assetService.create({ siteId: ctx.siteIdCepu, assetCategoryId: categoryGeneral.id, assetName: "Lift Barang" }));
    await run(supervisor.id, () => scheduleService.create({ assetId: asset9.id, maintenanceType: "Inspeksi tahunan wajib", intervalType: "MONTHS", intervalValue: 12, nextDueDate: (0, context_1.daysAgo)(3) }));
    await scanService.scan();
    // eslint-disable-next-line no-console
    console.log("  Asset & Equipment Management: 3 kategori, 9 aset (safety-critical bersih+maintenance, safety-critical OUT_OF_SERVICE alert, RUNNING_HOURS, disposal langsung, disposal via workflow BR-03, transfer, retire, due-soon+overdue via scan).");
}
