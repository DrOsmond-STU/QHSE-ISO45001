// Data demo Inspection Management (Modul 08, task 3.6) — 5 tipe inspeksi +
// checklist, lintas status (COMPLETED+FAIL+foto BR-02, IN_PROGRESS+temuan+
// skor, auto-generate dari jadwal WEEKLY->OVERDUE, SCHEDULED template v1
// sebelum naik v2 BR-07, IN_PROGRESS+temuan HIGH breach SLA). SATU-SATUNYA
// modul domain TANPA Workflow Engine (PRD §4 poin 9, lihat banner comment
// integration-spec-nya) — TIDAK ADA workflowInstanceId di alur mana pun.
// 3 scan job dipanggil SUNGGUHAN di akhir (bukan disimulasi manual) supaya
// efek otomatisnya (generate record, OVERDUE, notifikasi eskalasi SLA)
// genuinely tercermin — pola sama statisticsRecalcScanService dipakai
// langsung di modul lain.
import { INestApplicationContext } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { InspectionChecklistTemplateService } from "../../src/modules/domains/inspection/inspection-checklist-template.service";
import { InspectionFindingService } from "../../src/modules/domains/inspection/inspection-finding.service";
import { InspectionFindingSlaScanService } from "../../src/modules/domains/inspection/inspection-finding-sla-scan.service";
import { InspectionRecordGenerationScanService } from "../../src/modules/domains/inspection/inspection-record-generation-scan.service";
import { InspectionRecordOverdueScanService } from "../../src/modules/domains/inspection/inspection-record-overdue-scan.service";
import { InspectionRecordService } from "../../src/modules/domains/inspection/inspection-record.service";
import { InspectionScheduleService } from "../../src/modules/domains/inspection/inspection-schedule.service";
import { InspectionScoreService } from "../../src/modules/domains/inspection/inspection-score.service";
import { InspectionTypeService } from "../../src/modules/domains/inspection/inspection-type.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import { actor, actors, daysAgo, daysFromNow, DemoContext } from "./context";
import { uploadDemoFile } from "./shared";

export async function seedInspection(app: INestApplicationContext, adminPrisma: PrismaClient, ctx: DemoContext): Promise<void> {
  const typeService = app.get(InspectionTypeService);
  const templateService = app.get(InspectionChecklistTemplateService);
  const scheduleService = app.get(InspectionScheduleService);
  const recordService = app.get(InspectionRecordService);
  const findingService = app.get(InspectionFindingService);
  const scoreService = app.get(InspectionScoreService);
  const generationScanService = app.get(InspectionRecordGenerationScanService);
  const overdueScanService = app.get(InspectionRecordOverdueScanService);
  const findingSlaScanService = app.get(InspectionFindingSlaScanService);

  const hseManager = actor(ctx, "HSE_MANAGER");
  const [inspector1, inspector2] = actors(ctx, "HSE_OFFICER");
  const run = <T>(userId: string, fn: () => Promise<T>) => tenantContextStorage.run({ tenantId: ctx.tenantId, userId }, fn);

  // 1. APAR — WEIGHTED_SCORE, BR-01 (mandatory gate) + BR-02 (foto wajib
  // jika FAIL) ditegakkan penuh -> COMPLETED, overall_result FAIL.
  const typeApar = await run(hseManager.id, () => typeService.create({ code: "APAR", name: "Inspeksi APAR" }));
  const templateApar = await run(hseManager.id, () =>
    templateService.create({
      inspectionTypeId: typeApar.id,
      name: "Checklist APAR v1",
      scoringMethod: "WEIGHTED_SCORE",
      passingScoreThreshold: 50,
      effectiveDate: daysAgo(30),
      items: [
        { sequenceNo: 1, itemText: "Tekanan APAR normal (hijau)", responseType: "PASS_FAIL", weight: 2, isMandatory: true, requiresPhotoIfFail: true },
        { sequenceNo: 2, itemText: "Segel belum rusak", responseType: "YES_NO", weight: 1, isMandatory: true },
        { sequenceNo: 3, itemText: "Kondisi tabung (1-5)", responseType: "SCALE_1_5", weight: 1, isMandatory: false },
      ],
    }),
  );
  const aparItems = await run(hseManager.id, () => templateService.listItemsByTemplate(templateApar.id));
  const aparItemPressure = aparItems.find((i) => i.sequenceNo === 1)!;
  const aparItemSeal = aparItems.find((i) => i.sequenceNo === 2)!;
  const recordApar = await run(inspector1.id, () =>
    recordService.create({ inspectionChecklistTemplateId: templateApar.id, siteId: ctx.siteIdCepu, plannedDate: daysAgo(3), inspectorId: inspector1.id }),
  );
  await run(inspector1.id, () => recordService.start(recordApar.id));
  await run(inspector1.id, () => recordService.submitItemResponse(recordApar.id, { templateItemId: aparItemSeal.id, responseValue: "YES" }));
  const aparItemResponse = await run(inspector1.id, () =>
    recordService.submitItemResponse(recordApar.id, { templateItemId: aparItemPressure.id, responseValue: "FAIL", comment: "Jarum tekanan di area merah" }),
  );
  await uploadDemoFile(app, ctx.tenantId, inspector1.id, {
    entityType: "inspection_record_item",
    entityId: aparItemResponse.id,
    fileName: "foto-apar-tekanan-rendah.jpg",
  });
  await run(inspector1.id, () => recordService.complete(recordApar.id));

  // 2. Housekeeping — CHECKLIST_NO_SCORE, dibiarkan IN_PROGRESS (planned_date
  // MASA DEPAN spy tidak tersapu overdue-scan) + 1 temuan OPEN (event stub
  // inspection.finding_created) + skor breakdown 2 kategori.
  const typeHk = await run(hseManager.id, () => typeService.create({ code: "HK", name: "Housekeeping 5R" }));
  const templateHk = await run(hseManager.id, () =>
    templateService.create({
      inspectionTypeId: typeHk.id,
      name: "Checklist Housekeeping v1",
      scoringMethod: "CHECKLIST_NO_SCORE",
      effectiveDate: daysAgo(20),
      items: [{ sequenceNo: 1, itemText: "Area kerja bersih & rapi", responseType: "YES_NO", isMandatory: true }],
    }),
  );
  const recordHk = await run(inspector2.id, () =>
    recordService.create({ inspectionChecklistTemplateId: templateHk.id, siteId: ctx.siteIdHq, plannedDate: daysFromNow(2), inspectorId: inspector2.id }),
  );
  await run(inspector2.id, () => recordService.start(recordHk.id));
  await run(inspector2.id, () =>
    findingService.create({
      inspectionRecordId: recordHk.id,
      title: "Tumpukan kardus bekas di gudang arsip",
      description: "Kardus menumpuk beberapa hari, menghalangi jalur evakuasi",
      severity: "MEDIUM",
      targetCloseDate: daysFromNow(7),
    }),
  );
  await run(inspector2.id, () => scoreService.record({ inspectionRecordId: recordHk.id, category: "5R", scoreObtained: 8, maxPossibleScore: 10 }));
  await run(inspector2.id, () => scoreService.record({ inspectionRecordId: recordHk.id, category: "APD", scoreObtained: 9, maxPossibleScore: 10 }));

  // 3. Patroli rutin — jadwal WEEKLY sudah jatuh tempo KEMARIN, dibangkitkan
  // via generation-scan SUNGGUHAN (bukan create() manual) lalu disapu
  // overdue-scan di akhir (belum ada yang mengerjakan -> OVERDUE otomatis).
  const typePatrol = await run(hseManager.id, () => typeService.create({ code: "PATROL", name: "Patroli K3 Rutin" }));
  const templatePatrol = await run(hseManager.id, () =>
    templateService.create({
      inspectionTypeId: typePatrol.id,
      name: "Checklist Patroli v1",
      scoringMethod: "CHECKLIST_NO_SCORE",
      effectiveDate: daysAgo(10),
      items: [{ sequenceNo: 1, itemText: "Jalur evakuasi bebas hambatan", responseType: "YES_NO", isMandatory: true }],
    }),
  );
  await run(hseManager.id, () =>
    scheduleService.create({
      inspectionChecklistTemplateId: templatePatrol.id,
      siteId: ctx.siteIdCepu,
      recurrencePattern: "WEEKLY",
      defaultAssignedInspectorId: inspector1.id,
      nextGenerationDate: daysAgo(1),
    }),
  );

  // 4. Scaffolding — record LAMA menunjuk template v1 (SCHEDULED, planned_date
  // MASA DEPAN), lalu template naik ke v2 -> BR-07 snapshot (record LAMA
  // TETAP menunjuk v1, v1.isActive jadi false).
  const typeScaff = await run(hseManager.id, () => typeService.create({ code: "SCAFF", name: "Inspeksi Scaffolding" }));
  const templateScaffV1 = await run(hseManager.id, () =>
    templateService.create({
      inspectionTypeId: typeScaff.id,
      name: "Checklist Scaffolding v1",
      scoringMethod: "PASS_FAIL_ONLY",
      effectiveDate: daysAgo(60),
      items: [{ sequenceNo: 1, itemText: "Base plate terpasang", responseType: "PASS_FAIL", isMandatory: true }],
    }),
  );
  await run(inspector1.id, () =>
    recordService.create({
      inspectionChecklistTemplateId: templateScaffV1.id,
      siteId: ctx.siteIdCepu,
      plannedDate: daysFromNow(3),
      inspectorId: inspector1.id,
    }),
  );
  await run(hseManager.id, () =>
    templateService.createNewVersion(typeScaff.id, {
      name: "Checklist Scaffolding v2 (+tag hijau)",
      scoringMethod: "PASS_FAIL_ONLY",
      effectiveDate: new Date(),
      items: [
        { sequenceNo: 1, itemText: "Base plate terpasang", responseType: "PASS_FAIL", isMandatory: true },
        { sequenceNo: 2, itemText: "Tag hijau scaffolding terpasang", responseType: "PASS_FAIL", isMandatory: true },
      ],
    }),
  );

  // 5. Kelistrikan — temuan HIGH dibackdate >24 jam supaya finding-sla-scan
  // (BR-04) mengeskalasi notifikasi ke HSE Manager (record dibiarkan
  // IN_PROGRESS, planned_date MASA DEPAN spy tidak ikut tersapu overdue-scan).
  const typeElectrical = await run(hseManager.id, () => typeService.create({ code: "ELEC", name: "Inspeksi Kelistrikan" }));
  const templateElectrical = await run(hseManager.id, () =>
    templateService.create({
      inspectionTypeId: typeElectrical.id,
      name: "Checklist Kelistrikan v1",
      scoringMethod: "CHECKLIST_NO_SCORE",
      effectiveDate: daysAgo(15),
      items: [{ sequenceNo: 1, itemText: "Panel listrik tertutup rapat", responseType: "YES_NO", isMandatory: true }],
    }),
  );
  const recordElectrical = await run(inspector2.id, () =>
    recordService.create({
      inspectionChecklistTemplateId: templateElectrical.id,
      siteId: ctx.siteIdBalikpapan,
      plannedDate: daysFromNow(1),
      inspectorId: inspector2.id,
    }),
  );
  await run(inspector2.id, () => recordService.start(recordElectrical.id));
  const findingElectrical = await run(inspector2.id, () =>
    findingService.create({
      inspectionRecordId: recordElectrical.id,
      title: "Kabel terbuka dekat panel utama",
      description: "Pekerja tanpa APD berisiko kontak langsung dgn kabel bertegangan",
      severity: "HIGH",
    }),
  );
  await adminPrisma.inspectionFinding.update({ where: { id: findingElectrical.id }, data: { identifiedAt: daysAgo(1.1) } });

  await generationScanService.scan();
  await overdueScanService.scan();
  await findingSlaScanService.scan();

  // eslint-disable-next-line no-console
  console.log(
    "  Inspection Management: 5 tipe (APAR COMPLETED+FAIL+foto BR-02, Housekeeping IN_PROGRESS+temuan+skor, Patroli auto-generate->OVERDUE, Scaffolding v1->v2 BR-07, Kelistrikan IN_PROGRESS+temuan HIGH SLA breach).",
  );
}
