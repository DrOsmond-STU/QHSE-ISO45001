import { randomUUID } from "node:crypto";
import { INestApplication } from "@nestjs/common";
import { seedEnvironmentalNotificationTemplates } from "../../prisma/seed-environmental-notification-templates";
import { CapaRegisterService } from "../../src/modules/domains/capa/capa-register.service";
import { EnvironmentalAspectImpactService } from "../../src/modules/domains/environmental/environmental-aspect-impact.service";
import { EnvironmentalMonitoringRecordService } from "../../src/modules/domains/environmental/environmental-monitoring-record.service";
import { EnvironmentalPermitService } from "../../src/modules/domains/environmental/environmental-permit.service";
import { ProperSelfAssessmentService } from "../../src/modules/domains/environmental/proper-self-assessment.service";
import { WasteGenerationLogService } from "../../src/modules/domains/environmental/waste-generation-log.service";
import { WasteManifestService } from "../../src/modules/domains/environmental/waste-manifest.service";
import { WasteStorageDurationScanService } from "../../src/modules/domains/environmental/waste-storage-duration-scan.service";
import { LicensePermitService } from "../../src/modules/domains/regulatory-compliance/license-permit.service";
import { WorkflowEngineService } from "../../src/platform/workflow-engine/workflow-engine.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import { adminPrisma, assignRole, createTestApp, flushTestRedis, seedSite, seedTenantFixture, seedUserInTenant } from "./test-helpers";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Task 5.2 (Modul 12 Environmental Management) — cakupan: Aspect Impact
 * siklus penuh (DRAFT->UNDER_REVIEW 2-stage workflow->ACTIVE, BR-01 gate,
 * notifikasi SIGNIFICANT tanpa kontrol), Monitoring (BR-02 auto-CAPA via
 * event stub saat EXCEED, BR-07 gate lampiran lab), Waste Generation Log +
 * Manifest (BR-08 waste_code wajib, BR-03 scan H-7, siklus manifest 7-tahap),
 * PROPER Self-Assessment (BR-06 agregasi terbobot + override, 2-stage
 * workflow), Environmental Permit (BR-05 1:1 licenses_permits), isolasi
 * tenant RLS.
 */
describe("Environmental Management — Modul 12 (task 5.2)", () => {
  let app: INestApplication;
  let aspectImpactService: EnvironmentalAspectImpactService;
  let monitoringRecordService: EnvironmentalMonitoringRecordService;
  let wasteGenerationLogService: WasteGenerationLogService;
  let wasteManifestService: WasteManifestService;
  let wasteStorageDurationScanService: WasteStorageDurationScanService;
  let properSelfAssessmentService: ProperSelfAssessmentService;
  let environmentalPermitService: EnvironmentalPermitService;
  let licensePermitService: LicensePermitService;
  let capaRegisterService: CapaRegisterService;
  let workflowEngineService: WorkflowEngineService;

  beforeAll(async () => {
    await flushTestRedis();
    app = await createTestApp();
    aspectImpactService = app.get(EnvironmentalAspectImpactService);
    monitoringRecordService = app.get(EnvironmentalMonitoringRecordService);
    wasteGenerationLogService = app.get(WasteGenerationLogService);
    wasteManifestService = app.get(WasteManifestService);
    wasteStorageDurationScanService = app.get(WasteStorageDurationScanService);
    properSelfAssessmentService = app.get(ProperSelfAssessmentService);
    environmentalPermitService = app.get(EnvironmentalPermitService);
    licensePermitService = app.get(LicensePermitService);
    capaRegisterService = app.get(CapaRegisterService);
    workflowEngineService = app.get(WorkflowEngineService);
    await seedEnvironmentalNotificationTemplates(adminPrisma);
  });

  afterAll(async () => {
    await app.close();
    await adminPrisma.$disconnect();
  });

  async function setupTenant() {
    const fixture = await seedTenantFixture();
    const envOfficer = await seedUserInTenant(fixture.tenantId, "Environmental Officer");
    await assignRole(fixture.tenantId, envOfficer.id, "ENVIRONMENTAL_OFFICER");
    const hseManager = await seedUserInTenant(fixture.tenantId, "HSE Manager");
    await assignRole(fixture.tenantId, hseManager.id, "HSE_MANAGER");
    const tpsOfficer = await seedUserInTenant(fixture.tenantId, "TPS LB3 Officer");
    await assignRole(fixture.tenantId, tpsOfficer.id, "TPS_LB3_OFFICER");
    const companyAdmin = await seedUserInTenant(fixture.tenantId, "Company Admin");
    await assignRole(fixture.tenantId, companyAdmin.id, "COMPANY_ADMIN");
    const { companyId, siteId } = await seedSite(fixture.tenantId, fixture.userId);
    return { fixture, envOfficer, hseManager, tpsOfficer, companyAdmin, companyId, siteId };
  }

  async function pendingTaskFor(instanceId: string) {
    return adminPrisma.workflowTask.findFirstOrThrow({ where: { instanceId, status: "PENDING" } });
  }

  async function approveAllStages(tenantId: string, workflowInstanceId: string, approverIds: string[]) {
    for (const approverId of approverIds) {
      const task = await pendingTaskFor(workflowInstanceId);
      await tenantContextStorage.run({ tenantId, userId: approverId }, () => workflowEngineService.actOnTask(task.id, "APPROVE", undefined, approverId));
    }
    await sleep(300);
  }

  describe("Aspect Impact — siklus penuh DRAFT->UNDER_REVIEW(2-stage)->ACTIVE, BR-01", () => {
    it("SIGNIFICANT dgn existing_controls: create->submit->approve keduanya->ACTIVE+next_review_date", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.envOfficer.id };

      const aspect = await tenantContextStorage.run(actorCtx, () =>
        aspectImpactService.create({
          companyId: t.companyId,
          siteId: t.siteId,
          conditionType: "NORMAL",
          activityProcessArea: "Genset diesel darurat",
          environmentalAspect: "Emisi udara dari genset diesel",
          environmentalImpact: "Penurunan kualitas udara ambien",
          impactType: "AIR",
          scores: { likelihoodScore: 5, severityScore: 5, frequencyScore: 4, regulatoryScore: 4, stakeholderConcernScore: 4 },
          existingControls: "Filter udara terpasang, jadwal maintenance rutin",
        }),
      );
      expect(aspect.status).toBe("DRAFT");
      expect(aspect.significanceLevel).toBe("SIGNIFICANT");
      expect(aspect.registerNumber).toContain("EA");

      const submitted = await tenantContextStorage.run(actorCtx, () => aspectImpactService.submitForReview(aspect.id));
      expect(submitted.status).toBe("UNDER_REVIEW");
      expect(submitted.workflowInstanceId).not.toBeNull();

      await approveAllStages(t.fixture.tenantId, submitted.workflowInstanceId!, [t.envOfficer.id, t.hseManager.id]);

      const active = await adminPrisma.environmentalAspectImpact.findUniqueOrThrow({ where: { id: aspect.id } });
      expect(active.status).toBe("ACTIVE");
      expect(active.workflowInstanceId).toBeNull();
      expect(active.nextReviewDate).not.toBeNull();
    }, 30000);

    it("BR-01: SIGNIFICANT tanpa existing_controls/capa_id ditolak saat markApproved; notifikasi terkirim saat create()", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.envOfficer.id };

      const aspect = await tenantContextStorage.run(actorCtx, () =>
        aspectImpactService.create({
          companyId: t.companyId,
          siteId: t.siteId,
          conditionType: "ABNORMAL",
          activityProcessArea: "Pembuangan limbah cair proses",
          environmentalAspect: "Effluen air limbah proses",
          environmentalImpact: "Pencemaran badan air",
          impactType: "WATER",
          scores: { likelihoodScore: 5, severityScore: 5, frequencyScore: 5, regulatoryScore: 5, stakeholderConcernScore: 5 },
        }),
      );
      expect(aspect.significanceLevel).toBe("SIGNIFICANT");

      const notif = await adminPrisma.notification.findFirst({
        where: { tenantId: t.fixture.tenantId, eventType: "ENVIRONMENTAL_ASPECT_SIGNIFICANT_NO_CONTROLS", recipientUserId: t.hseManager.id },
      });
      expect(notif).not.toBeNull();

      const submitted = await tenantContextStorage.run(actorCtx, () => aspectImpactService.submitForReview(aspect.id));
      await approveAllStages(t.fixture.tenantId, submitted.workflowInstanceId!, [t.envOfficer.id, t.hseManager.id]);

      const stillNotActive = await adminPrisma.environmentalAspectImpact.findUniqueOrThrow({ where: { id: aspect.id } });
      expect(stillNotActive.status).toBe("UNDER_REVIEW"); // markApproved() gagal (BR-01), workflow_instance_id sudah null tapi status tak berubah dari listener try/catch
    }, 30000);
  });

  describe("Monitoring — BR-02 auto-CAPA via event stub + notifikasi, BR-07 gate", () => {
    it("EXCEED: capa_register(source_type=ENVIRONMENTAL_MONITORING) dibuat otomatis + capaRegisterId ditautkan balik", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.envOfficer.id };

      const record = await tenantContextStorage.run(actorCtx, () =>
        monitoringRecordService.create({
          siteId: t.siteId,
          monitoringType: "AIR_EMISSION",
          monitoringPointCode: "CEROBONG-01",
          monitoringPointName: "Cerobong Genset",
          parameterName: "SO2",
          unitOfMeasure: "mg/Nm3",
          resultValue: 800,
          bakuMutuMin: 0,
          bakuMutuMax: 500,
          samplingDate: new Date(),
        }),
      );
      expect(record.complianceStatus).toBe("EXCEED");

      await sleep(500); // event stub async — beri waktu EnvironmentalMonitoringCapaTriggerListener memproses.

      const linked = await adminPrisma.environmentalMonitoringRecord.findUniqueOrThrow({ where: { id: record.id } });
      expect(linked.capaRegisterId).not.toBeNull();

      const capa = await adminPrisma.capaRegister.findUniqueOrThrow({ where: { id: linked.capaRegisterId! } });
      expect(capa.sourceType).toBe("ENVIRONMENTAL_MONITORING");
      expect(capa.sourceId).toBe(record.id);

      const notif = await adminPrisma.notification.findFirst({
        where: { tenantId: t.fixture.tenantId, eventType: "ENVIRONMENTAL_MONITORING_EXCEED", recipientUserId: t.hseManager.id },
      });
      expect(notif).not.toBeNull();
    }, 30000);

    it("BR-07: verify() ditolak tanpa lampiran, lolos setelah attachments dibuat", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.envOfficer.id };

      const record = await tenantContextStorage.run(actorCtx, () =>
        monitoringRecordService.create({
          siteId: t.siteId,
          monitoringType: "WASTEWATER_EFFLUENT",
          monitoringPointCode: "IPAL-OUT",
          monitoringPointName: "Outlet IPAL",
          parameterName: "COD",
          unitOfMeasure: "mg/L",
          resultValue: 80,
          bakuMutuMax: 100,
          samplingDate: new Date(),
        }),
      );
      expect(record.complianceStatus).toBe("COMPLIANT");

      await expect(tenantContextStorage.run(actorCtx, () => monitoringRecordService.verify(record.id))).rejects.toThrow(/BR-07/);

      await adminPrisma.attachment.create({
        data: {
          tenantId: t.fixture.tenantId,
          entityType: "environmental_monitoring_record",
          entityId: record.id,
          fileName: "lab-report.pdf",
          fileUrl: `attachments/${randomUUID()}.pdf`,
          fileSize: 1024,
          mimeType: "application/pdf",
          scanStatus: "CLEAN",
          uploadedBy: t.envOfficer.id,
        },
      });

      const verified = await tenantContextStorage.run(actorCtx, () => monitoringRecordService.verify(record.id));
      expect(verified.status).toBe("VERIFIED");
    }, 30000);
  });

  describe("Waste — generation log + manifest siklus 7-tahap, BR-08, BR-03 scan", () => {
    it("BR-08: waste_manifest HAZARDOUS_B3 tanpa waste_code ditolak", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.tpsOfficer.id };

      await expect(
        tenantContextStorage.run(actorCtx, () =>
          wasteManifestService.create({
            siteId: t.siteId,
            wasteType: "HAZARDOUS_B3",
            wasteName: "Oli bekas",
            quantity: 200,
            unitOfMeasure: "KG",
            packagingType: "DRUM",
            generationDate: new Date(),
          }),
        ),
      ).rejects.toThrow(/BR-08/);
    });

    it("siklus penuh: log->manifest tertaut->ISSUED->IN_TRANSIT->RECEIVED_BY_TRANSPORTER->RECEIVED_BY_PROCESSOR->COMPLETED+festronik", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.tpsOfficer.id };

      const log = await tenantContextStorage.run(actorCtx, () =>
        wasteGenerationLogService.create({
          siteId: t.siteId,
          logDate: new Date(),
          wasteCode: "A102d",
          wasteName: "Oli bekas",
          wasteType: "HAZARDOUS_B3",
          quantityGenerated: 200,
          unitOfMeasure: "KG",
          storageLocation: "TPS LB3 Blok A",
        }),
      );

      const manifest = await tenantContextStorage.run(actorCtx, () =>
        wasteManifestService.create({
          siteId: t.siteId,
          wasteType: "HAZARDOUS_B3",
          wasteCode: "A102d",
          wasteName: "Oli bekas",
          quantity: 200,
          unitOfMeasure: "KG",
          packagingType: "DRUM",
          generationDate: new Date(),
          linkedGenerationLogIds: [log.id],
        }),
      );
      expect(manifest.manifestStatus).toBe("DRAFT");
      expect(manifest.manifestNumber).toContain("WM");

      const linkedLog = await adminPrisma.wasteGenerationLog.findUniqueOrThrow({ where: { id: log.id } });
      expect(linkedLog.linkedWasteManifestId).toBe(manifest.id);

      await tenantContextStorage.run(actorCtx, () => wasteManifestService.issue(manifest.id));
      await tenantContextStorage.run(actorCtx, () =>
        wasteManifestService.markInTransit(manifest.id, {
          transporterName: "PT Angkut Aman",
          transporterLicenseNo: "TRANS-001",
          transporterVehicleNo: "B 1234 XYZ",
          transportDate: new Date(),
        }),
      );
      await tenantContextStorage.run(actorCtx, () => wasteManifestService.markReceivedByTransporter(manifest.id));
      await tenantContextStorage.run(actorCtx, () =>
        wasteManifestService.markReceivedByProcessor(manifest.id, {
          destinationFacilityName: "PT Pengolah Limbah",
          destinationFacilityLicenseNo: "PROC-001",
          receivingConfirmationDate: new Date(),
        }),
      );
      const completed = await tenantContextStorage.run(actorCtx, () => wasteManifestService.complete(manifest.id));
      expect(completed.manifestStatus).toBe("COMPLETED");

      // festronikManifestNo @unique — pakai suffix acak (bukan literal tetap) krn DB
      // dev shared TIDAK PERNAH direset antar run, pola sama seluruh fixture lain
      // di test-helpers.ts (site/company code).
      const festronikNo = `FTR-2026-${randomUUID().slice(0, 8)}`;
      const withFestronik = await tenantContextStorage.run(actorCtx, () => wasteManifestService.recordFestronikNumber(manifest.id, festronikNo));
      expect(withFestronik.festronikManifestNo).toBe(festronikNo);
      expect(withFestronik.festronikSyncStatus).toBe("SYNCED");
    }, 30000);

    it("BR-03: waste-storage-duration-scan mengirim notifikasi H-7 + idempotency", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.tpsOfficer.id };

      const storageStartDate = new Date();
      storageStartDate.setDate(storageStartDate.getDate() - 84); // dueDate = +90d dari start = 6 hari lagi, dalam window H-7.

      const log = await tenantContextStorage.run(actorCtx, () =>
        wasteGenerationLogService.create({
          siteId: t.siteId,
          logDate: storageStartDate,
          wasteCode: "B105d",
          wasteName: "Majun terkontaminasi",
          wasteType: "HAZARDOUS_B3",
          quantityGenerated: 15,
          unitOfMeasure: "KG",
          storageLocation: "TPS LB3 Blok B",
          storageStartDate,
          maxStorageDurationDays: 90,
        }),
      );

      await wasteStorageDurationScanService.scan();

      const afterScan = await adminPrisma.wasteGenerationLog.findUniqueOrThrow({ where: { id: log.id } });
      expect(afterScan.storageDurationWarningSentAt).not.toBeNull();

      const notif = await adminPrisma.notification.findFirst({
        where: { tenantId: t.fixture.tenantId, eventType: "ENVIRONMENTAL_WASTE_STORAGE_DURATION_WARNING", recipientUserId: t.tpsOfficer.id },
      });
      expect(notif).not.toBeNull();

      // Idempotency — scan kedua tidak menghasilkan notifikasi duplikat.
      const countBefore = await adminPrisma.notification.count({ where: { tenantId: t.fixture.tenantId, eventType: "ENVIRONMENTAL_WASTE_STORAGE_DURATION_WARNING" } });
      await wasteStorageDurationScanService.scan();
      const countAfter = await adminPrisma.notification.count({ where: { tenantId: t.fixture.tenantId, eventType: "ENVIRONMENTAL_WASTE_STORAGE_DURATION_WARNING" } });
      expect(countAfter).toBe(countBefore);
    }, 30000);
  });

  describe("PROPER Self-Assessment — siklus penuh 2-stage workflow, BR-06", () => {
    it("create->criteria scores->rating auto-calc->submit->approve keduanya->submitToKlhk->recordOfficialResult", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.hseManager.id };

      const assessment = await tenantContextStorage.run(actorCtx, () =>
        properSelfAssessmentService.create({
          companyId: t.companyId,
          siteId: t.siteId,
          assessmentPeriod: "2026",
          assessmentType: "INTERNAL_SELF_ASSESSMENT",
          assessmentDate: new Date(),
        }),
      );
      expect(assessment.submissionStatus).toBe("DRAFT");

      await tenantContextStorage.run(actorCtx, () =>
        properSelfAssessmentService.recordCriteriaScore(assessment.id, {
          criteriaCategory: "AIR_POLLUTION_CONTROL",
          criteriaDescription: "Pengendalian emisi udara",
          complianceStatus: "FULLY_COMPLIANT",
          scoreValue: 90,
          weightPercentage: 50,
        }),
      );
      const scored = await tenantContextStorage.run(actorCtx, () =>
        properSelfAssessmentService.recordCriteriaScore(assessment.id, {
          criteriaCategory: "HAZARDOUS_WASTE_MANAGEMENT",
          criteriaDescription: "Tata kelola limbah B3",
          complianceStatus: "PARTIALLY_COMPLIANT",
          scoreValue: 70,
          weightPercentage: 50,
        }),
      );
      expect(Number(scored.complianceScorePercentage)).toBe(80);
      expect(scored.overallPredictedRating).toBe("EMAS");

      const overridden = await tenantContextStorage.run(actorCtx, () =>
        properSelfAssessmentService.overrideRating(assessment.id, "HIJAU", "Data sampling terbaru kuartal ini belum masuk sistem"),
      );
      expect(overridden.overallPredictedRating).toBe("HIJAU");
      expect(overridden.overrideJustification).not.toBeNull();

      const submitted = await tenantContextStorage.run(actorCtx, () => properSelfAssessmentService.submitForInternalReview(assessment.id));
      expect(submitted.submissionStatus).toBe("INTERNAL_REVIEWED");
      expect(submitted.workflowInstanceId).not.toBeNull();

      await approveAllStages(t.fixture.tenantId, submitted.workflowInstanceId!, [t.hseManager.id, t.companyAdmin.id]);

      const afterApproval = await adminPrisma.properSelfAssessment.findUniqueOrThrow({ where: { id: assessment.id } });
      expect(afterApproval.submissionStatus).toBe("INTERNAL_REVIEWED");
      expect(afterApproval.workflowInstanceId).toBeNull();

      const submittedToKlhk = await tenantContextStorage.run(actorCtx, () => properSelfAssessmentService.submitToKlhk(assessment.id));
      expect(submittedToKlhk.submissionStatus).toBe("SUBMITTED_TO_KLHK");

      const withResult = await tenantContextStorage.run(actorCtx, () => properSelfAssessmentService.recordOfficialResult(assessment.id, "HIJAU"));
      expect(withResult.submissionStatus).toBe("RESULT_RECEIVED");
      expect(withResult.klhkOfficialRating).toBe("HIJAU");
      expect(withResult.klhkRatingReceivedDate).not.toBeNull();
    }, 30000);

    it("BR-06: overrideRating tanpa justification ditolak", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.hseManager.id };
      const assessment = await tenantContextStorage.run(actorCtx, () =>
        properSelfAssessmentService.create({ companyId: t.companyId, siteId: t.siteId, assessmentPeriod: "2027", assessmentType: "INTERNAL_SELF_ASSESSMENT", assessmentDate: new Date() }),
      );
      await expect(
        tenantContextStorage.run(actorCtx, () => properSelfAssessmentService.overrideRating(assessment.id, "EMAS", "")),
      ).rejects.toThrow(/BR-06/);
    });
  });

  describe("Environmental Permit — BR-05 1:1 licenses_permits", () => {
    it("create() memvalidasi license_permit_id genuinely ada (RLS-scoped) sebelum insert", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.hseManager.id };

      const license = await tenantContextStorage.run(actorCtx, () =>
        licensePermitService.create({
          licenseNumber: "IPLC-001",
          licenseName: "Izin Pembuangan Limbah Cair",
          licenseType: "ENVIRONMENTAL_PERMIT",
          holderType: "SITE",
          holderReferenceId: t.siteId,
          issueDate: new Date("2024-01-01"),
          expiryDate: new Date("2027-01-01"),
        }),
      );

      const envPermit = await tenantContextStorage.run(actorCtx, () =>
        environmentalPermitService.create({
          licensePermitId: license.id,
          permitMedia: "WASTEWATER",
          requiredMonitoringFrequency: "MONTHLY",
          reportingObligationTo: "DLH Kabupaten",
        }),
      );
      expect(envPermit.licensePermitId).toBe(license.id);

      await expect(
        tenantContextStorage.run(actorCtx, () =>
          environmentalPermitService.create({ licensePermitId: randomUUID(), permitMedia: "AIR_EMISSION" }),
        ),
      ).rejects.toThrow();
    });
  });

  describe("Isolasi tenant (RLS)", () => {
    it("environmentalAspectImpactService.getById() tenant lain -> not found", async () => {
      const tenantA = await setupTenant();
      const tenantB = await setupTenant();
      const actorA = { tenantId: tenantA.fixture.tenantId, userId: tenantA.envOfficer.id };
      const actorB = { tenantId: tenantB.fixture.tenantId, userId: tenantB.envOfficer.id };

      const aspect = await tenantContextStorage.run(actorA, () =>
        aspectImpactService.create({
          companyId: tenantA.companyId,
          siteId: tenantA.siteId,
          conditionType: "NORMAL",
          activityProcessArea: "Area A",
          environmentalAspect: "Aspek A",
          environmentalImpact: "Dampak A",
          impactType: "NOISE",
          scores: { likelihoodScore: 1, severityScore: 1, frequencyScore: 1, regulatoryScore: 1, stakeholderConcernScore: 1 },
        }),
      );

      await expect(tenantContextStorage.run(actorB, () => aspectImpactService.getById(aspect.id))).rejects.toThrow();
    });
  });
});
