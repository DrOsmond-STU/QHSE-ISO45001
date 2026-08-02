"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedInspection = seedInspection;
const inspection_checklist_template_service_1 = require("../../src/modules/domains/inspection/inspection-checklist-template.service");
const inspection_finding_service_1 = require("../../src/modules/domains/inspection/inspection-finding.service");
const inspection_finding_sla_scan_service_1 = require("../../src/modules/domains/inspection/inspection-finding-sla-scan.service");
const inspection_record_generation_scan_service_1 = require("../../src/modules/domains/inspection/inspection-record-generation-scan.service");
const inspection_record_overdue_scan_service_1 = require("../../src/modules/domains/inspection/inspection-record-overdue-scan.service");
const inspection_record_service_1 = require("../../src/modules/domains/inspection/inspection-record.service");
const inspection_schedule_service_1 = require("../../src/modules/domains/inspection/inspection-schedule.service");
const inspection_score_service_1 = require("../../src/modules/domains/inspection/inspection-score.service");
const inspection_type_service_1 = require("../../src/modules/domains/inspection/inspection-type.service");
const tenant_context_1 = require("../../src/platform/tenancy/tenant-context");
const context_1 = require("./context");
const shared_1 = require("./shared");
async function seedInspection(app, adminPrisma, ctx) {
    const typeService = app.get(inspection_type_service_1.InspectionTypeService);
    const templateService = app.get(inspection_checklist_template_service_1.InspectionChecklistTemplateService);
    const scheduleService = app.get(inspection_schedule_service_1.InspectionScheduleService);
    const recordService = app.get(inspection_record_service_1.InspectionRecordService);
    const findingService = app.get(inspection_finding_service_1.InspectionFindingService);
    const scoreService = app.get(inspection_score_service_1.InspectionScoreService);
    const generationScanService = app.get(inspection_record_generation_scan_service_1.InspectionRecordGenerationScanService);
    const overdueScanService = app.get(inspection_record_overdue_scan_service_1.InspectionRecordOverdueScanService);
    const findingSlaScanService = app.get(inspection_finding_sla_scan_service_1.InspectionFindingSlaScanService);
    const hseManager = (0, context_1.actor)(ctx, "HSE_MANAGER");
    const [inspector1, inspector2] = (0, context_1.actors)(ctx, "HSE_OFFICER");
    const run = (userId, fn) => tenant_context_1.tenantContextStorage.run({ tenantId: ctx.tenantId, userId }, fn);
    // 1. APAR — WEIGHTED_SCORE, BR-01 (mandatory gate) + BR-02 (foto wajib
    // jika FAIL) ditegakkan penuh -> COMPLETED, overall_result FAIL.
    const typeApar = await run(hseManager.id, () => typeService.create({ code: "APAR", name: "Inspeksi APAR" }));
    const templateApar = await run(hseManager.id, () => templateService.create({
        inspectionTypeId: typeApar.id,
        name: "Checklist APAR v1",
        scoringMethod: "WEIGHTED_SCORE",
        passingScoreThreshold: 50,
        effectiveDate: (0, context_1.daysAgo)(30),
        items: [
            { sequenceNo: 1, itemText: "Tekanan APAR normal (hijau)", responseType: "PASS_FAIL", weight: 2, isMandatory: true, requiresPhotoIfFail: true },
            { sequenceNo: 2, itemText: "Segel belum rusak", responseType: "YES_NO", weight: 1, isMandatory: true },
            { sequenceNo: 3, itemText: "Kondisi tabung (1-5)", responseType: "SCALE_1_5", weight: 1, isMandatory: false },
        ],
    }));
    const aparItems = await run(hseManager.id, () => templateService.listItemsByTemplate(templateApar.id));
    const aparItemPressure = aparItems.find((i) => i.sequenceNo === 1);
    const aparItemSeal = aparItems.find((i) => i.sequenceNo === 2);
    const recordApar = await run(inspector1.id, () => recordService.create({ inspectionChecklistTemplateId: templateApar.id, siteId: ctx.siteIdCepu, plannedDate: (0, context_1.daysAgo)(3), inspectorId: inspector1.id }));
    await run(inspector1.id, () => recordService.start(recordApar.id));
    await run(inspector1.id, () => recordService.submitItemResponse(recordApar.id, { templateItemId: aparItemSeal.id, responseValue: "YES" }));
    const aparItemResponse = await run(inspector1.id, () => recordService.submitItemResponse(recordApar.id, { templateItemId: aparItemPressure.id, responseValue: "FAIL", comment: "Jarum tekanan di area merah" }));
    await (0, shared_1.uploadDemoFile)(app, ctx.tenantId, inspector1.id, {
        entityType: "inspection_record_item",
        entityId: aparItemResponse.id,
        fileName: "foto-apar-tekanan-rendah.jpg",
    });
    await run(inspector1.id, () => recordService.complete(recordApar.id));
    // 2. Housekeeping — CHECKLIST_NO_SCORE, dibiarkan IN_PROGRESS (planned_date
    // MASA DEPAN spy tidak tersapu overdue-scan) + 1 temuan OPEN (event stub
    // inspection.finding_created) + skor breakdown 2 kategori.
    const typeHk = await run(hseManager.id, () => typeService.create({ code: "HK", name: "Housekeeping 5R" }));
    const templateHk = await run(hseManager.id, () => templateService.create({
        inspectionTypeId: typeHk.id,
        name: "Checklist Housekeeping v1",
        scoringMethod: "CHECKLIST_NO_SCORE",
        effectiveDate: (0, context_1.daysAgo)(20),
        items: [{ sequenceNo: 1, itemText: "Area kerja bersih & rapi", responseType: "YES_NO", isMandatory: true }],
    }));
    const recordHk = await run(inspector2.id, () => recordService.create({ inspectionChecklistTemplateId: templateHk.id, siteId: ctx.siteIdHq, plannedDate: (0, context_1.daysFromNow)(2), inspectorId: inspector2.id }));
    await run(inspector2.id, () => recordService.start(recordHk.id));
    await run(inspector2.id, () => findingService.create({
        inspectionRecordId: recordHk.id,
        title: "Tumpukan kardus bekas di gudang arsip",
        description: "Kardus menumpuk beberapa hari, menghalangi jalur evakuasi",
        severity: "MEDIUM",
        targetCloseDate: (0, context_1.daysFromNow)(7),
    }));
    await run(inspector2.id, () => scoreService.record({ inspectionRecordId: recordHk.id, category: "5R", scoreObtained: 8, maxPossibleScore: 10 }));
    await run(inspector2.id, () => scoreService.record({ inspectionRecordId: recordHk.id, category: "APD", scoreObtained: 9, maxPossibleScore: 10 }));
    // 3. Patroli rutin — jadwal WEEKLY sudah jatuh tempo KEMARIN, dibangkitkan
    // via generation-scan SUNGGUHAN (bukan create() manual) lalu disapu
    // overdue-scan di akhir (belum ada yang mengerjakan -> OVERDUE otomatis).
    const typePatrol = await run(hseManager.id, () => typeService.create({ code: "PATROL", name: "Patroli K3 Rutin" }));
    const templatePatrol = await run(hseManager.id, () => templateService.create({
        inspectionTypeId: typePatrol.id,
        name: "Checklist Patroli v1",
        scoringMethod: "CHECKLIST_NO_SCORE",
        effectiveDate: (0, context_1.daysAgo)(10),
        items: [{ sequenceNo: 1, itemText: "Jalur evakuasi bebas hambatan", responseType: "YES_NO", isMandatory: true }],
    }));
    await run(hseManager.id, () => scheduleService.create({
        inspectionChecklistTemplateId: templatePatrol.id,
        siteId: ctx.siteIdCepu,
        recurrencePattern: "WEEKLY",
        defaultAssignedInspectorId: inspector1.id,
        nextGenerationDate: (0, context_1.daysAgo)(1),
    }));
    // 4. Scaffolding — record LAMA menunjuk template v1 (SCHEDULED, planned_date
    // MASA DEPAN), lalu template naik ke v2 -> BR-07 snapshot (record LAMA
    // TETAP menunjuk v1, v1.isActive jadi false).
    const typeScaff = await run(hseManager.id, () => typeService.create({ code: "SCAFF", name: "Inspeksi Scaffolding" }));
    const templateScaffV1 = await run(hseManager.id, () => templateService.create({
        inspectionTypeId: typeScaff.id,
        name: "Checklist Scaffolding v1",
        scoringMethod: "PASS_FAIL_ONLY",
        effectiveDate: (0, context_1.daysAgo)(60),
        items: [{ sequenceNo: 1, itemText: "Base plate terpasang", responseType: "PASS_FAIL", isMandatory: true }],
    }));
    await run(inspector1.id, () => recordService.create({
        inspectionChecklistTemplateId: templateScaffV1.id,
        siteId: ctx.siteIdCepu,
        plannedDate: (0, context_1.daysFromNow)(3),
        inspectorId: inspector1.id,
    }));
    await run(hseManager.id, () => templateService.createNewVersion(typeScaff.id, {
        name: "Checklist Scaffolding v2 (+tag hijau)",
        scoringMethod: "PASS_FAIL_ONLY",
        effectiveDate: new Date(),
        items: [
            { sequenceNo: 1, itemText: "Base plate terpasang", responseType: "PASS_FAIL", isMandatory: true },
            { sequenceNo: 2, itemText: "Tag hijau scaffolding terpasang", responseType: "PASS_FAIL", isMandatory: true },
        ],
    }));
    // 5. Kelistrikan — temuan HIGH dibackdate >24 jam supaya finding-sla-scan
    // (BR-04) mengeskalasi notifikasi ke HSE Manager (record dibiarkan
    // IN_PROGRESS, planned_date MASA DEPAN spy tidak ikut tersapu overdue-scan).
    const typeElectrical = await run(hseManager.id, () => typeService.create({ code: "ELEC", name: "Inspeksi Kelistrikan" }));
    const templateElectrical = await run(hseManager.id, () => templateService.create({
        inspectionTypeId: typeElectrical.id,
        name: "Checklist Kelistrikan v1",
        scoringMethod: "CHECKLIST_NO_SCORE",
        effectiveDate: (0, context_1.daysAgo)(15),
        items: [{ sequenceNo: 1, itemText: "Panel listrik tertutup rapat", responseType: "YES_NO", isMandatory: true }],
    }));
    const recordElectrical = await run(inspector2.id, () => recordService.create({
        inspectionChecklistTemplateId: templateElectrical.id,
        siteId: ctx.siteIdBalikpapan,
        plannedDate: (0, context_1.daysFromNow)(1),
        inspectorId: inspector2.id,
    }));
    await run(inspector2.id, () => recordService.start(recordElectrical.id));
    const findingElectrical = await run(inspector2.id, () => findingService.create({
        inspectionRecordId: recordElectrical.id,
        title: "Kabel terbuka dekat panel utama",
        description: "Pekerja tanpa APD berisiko kontak langsung dgn kabel bertegangan",
        severity: "HIGH",
    }));
    await adminPrisma.inspectionFinding.update({ where: { id: findingElectrical.id }, data: { identifiedAt: (0, context_1.daysAgo)(1.1) } });
    await generationScanService.scan();
    await overdueScanService.scan();
    await findingSlaScanService.scan();
    // eslint-disable-next-line no-console
    console.log("  Inspection Management: 5 tipe (APAR COMPLETED+FAIL+foto BR-02, Housekeeping IN_PROGRESS+temuan+skor, Patroli auto-generate->OVERDUE, Scaffolding v1->v2 BR-07, Kelistrikan IN_PROGRESS+temuan HIGH SLA breach).");
}
