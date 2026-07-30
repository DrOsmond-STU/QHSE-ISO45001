import { BadRequestException, INestApplication } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { seedIndustryTemplates } from "../../prisma/seed-industry-templates";
import { seedRegulatoryFrameworks } from "../../prisma/seed-regulatory-frameworks";
import { ComplianceEvaluationService } from "../../src/modules/domains/regulatory-compliance/compliance-evaluation.service";
import { ComplianceObligationService } from "../../src/modules/domains/regulatory-compliance/compliance-obligation.service";
import { LicenseExpiryScanService } from "../../src/modules/domains/regulatory-compliance/license-expiry-scan.service";
import { LicensePermitService } from "../../src/modules/domains/regulatory-compliance/license-permit.service";
import { ObligationDueScanService } from "../../src/modules/domains/regulatory-compliance/obligation-due-scan.service";
import { RegulatoryRegisterService } from "../../src/modules/domains/regulatory-compliance/regulatory-register.service";
import { WorkflowEngineService } from "../../src/platform/workflow-engine/workflow-engine.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import { adminPrisma, assignRole, createTestApp, flushTestRedis, seedRegulatoryRegister, seedSite, seedTenantFixture, seedUserInTenant } from "./test-helpers";

/**
 * Task 2.2 (Modul 04 Regulatory & Compliance Management) — cakupan: BR-01/
 * BR-02 (license expiry scan + notifikasi bertingkat H-90/H-30/H-7), BR-03
 * (CAPA wajib sebelum CLOSED), BR-04 (register SUPERSEDED/REVOKED tidak
 * bisa diacu obligation baru), BR-06 (next_due_date recompute), BR-07
 * (applicable_scope konsistensi), alur approval 1-stage (ROLE_IN_SCOPE HSE
 * Manager) via WorkflowEngineService (0.9) SUNGGUHAN,
 * ComplianceEvaluationWorkflowCompletionListener, path reject, renewal
 * chain licenses_permits, kedua scan job (license-expiry-scan/
 * obligation-due-scan), isolasi tenant RLS.
 */
describe("Regulatory & Compliance Management — Modul 04 (task 2.2)", () => {
  let app: INestApplication;
  let registerService: RegulatoryRegisterService;
  let obligationService: ComplianceObligationService;
  let evaluationService: ComplianceEvaluationService;
  let licenseService: LicensePermitService;
  let workflowEngineService: WorkflowEngineService;
  let licenseExpiryScanService: LicenseExpiryScanService;
  let obligationDueScanService: ObligationDueScanService;

  beforeAll(async () => {
    await flushTestRedis();
    app = await createTestApp();
    registerService = app.get(RegulatoryRegisterService);
    obligationService = app.get(ComplianceObligationService);
    evaluationService = app.get(ComplianceEvaluationService);
    licenseService = app.get(LicensePermitService);
    workflowEngineService = app.get(WorkflowEngineService);
    licenseExpiryScanService = app.get(LicenseExpiryScanService);
    obligationDueScanService = app.get(ObligationDueScanService);
    await seedRegulatoryFrameworks(adminPrisma);
    await seedIndustryTemplates(adminPrisma);
  });

  afterAll(async () => {
    await app.close();
    await adminPrisma.$disconnect();
  });

  /** Setup satu tenant lengkap: actor (Compliance Officer) + HSE Manager
   * (Stage 1 ROLE_IN_SCOPE approver evaluasi). */
  async function setupTenant() {
    const fixture = await seedTenantFixture();
    await assignRole(fixture.tenantId, fixture.userId, "COMPLIANCE_OFFICER");
    const hseManager = await seedUserInTenant(fixture.tenantId, "HSE Manager");
    await assignRole(fixture.tenantId, hseManager.id, "HSE_MANAGER");
    return { fixture, hseManager };
  }

  describe("RegulatoryRegisterService — BR-07", () => {
    it("create() menolak SPECIFIC_SITE tanpa applicable_site_id", async () => {
      const { fixture } = await setupTenant();
      // assertApplicableScopeConsistency() (pure function) throw Error polos
      // (bukan BadRequestException) — pola sama document-distribution-rules.ts
      // (2.1), toThrow() generik di sini, bukan toThrow(BadRequestException).
      await expect(
        tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
          registerService.create({
            regulationType: "LOCAL_REGULATION_PERDA",
            regulationNumber: "PERDA-1",
            title: "Perda Lokal",
            applicableScope: "SPECIFIC_SITE",
          }),
        ),
      ).rejects.toThrow();
    });

    it("create() menerima SPECIFIC_SITE dgn applicable_site_id terisi", async () => {
      const { fixture } = await setupTenant();
      const { siteId } = await seedSite(fixture.tenantId, fixture.userId);
      const register = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        registerService.create({
          regulationType: "LOCAL_REGULATION_PERDA",
          regulationNumber: "PERDA-2",
          title: "Perda Lokal Site",
          applicableScope: "SPECIFIC_SITE",
          applicableSiteId: siteId,
        }),
      );
      expect(register.status).toBe("ACTIVE");
    });

    it("retire() mengubah status ACTIVE -> SUPERSEDED, baris tetap tersimpan", async () => {
      const { fixture } = await setupTenant();
      const register = await seedRegulatoryRegister(fixture.tenantId, fixture.userId);
      const retired = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        registerService.retire(register.id, "SUPERSEDED"),
      );
      expect(retired.status).toBe("SUPERSEDED");
      const stillThere = await adminPrisma.regulatoryRegister.findUniqueOrThrow({ where: { id: register.id } });
      expect(stillThere.deletedAt).toBeNull();
    });
  });

  describe("RegulatoryRegisterService.seedFromIndustryTemplate — PRD §4.1 poin 1", () => {
    it("membuat regulatory_register dari default_regulatory_codes template industri", async () => {
      const { fixture } = await setupTenant();
      const template = await adminPrisma.industryTemplate.findFirstOrThrow({ where: { code: "OIL_GAS" } });

      const result = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        registerService.seedFromIndustryTemplate(template.id),
      );

      expect(result.skippedCodes).toEqual([]);
      expect(result.created.length).toBeGreaterThan(0);
      expect(result.created.every((r) => r.status === "ACTIVE")).toBe(true);
    });
  });

  describe("ComplianceObligationService — BR-04", () => {
    it("create() menolak register berstatus SUPERSEDED", async () => {
      const { fixture } = await setupTenant();
      const register = await seedRegulatoryRegister(fixture.tenantId, fixture.userId, { status: "SUPERSEDED" });
      // assertRegisterAcceptsNewObligation() throw Error polos (bukan
      // BadRequestException) — sama alasan BR-07 di atas.
      await expect(
        tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
          obligationService.create({
            regulatoryRegisterId: register.id,
            obligationDescription: "Lapor P2K3 triwulanan",
            obligationType: "REPORTING",
            frequency: "QUARTERLY",
          }),
        ),
      ).rejects.toThrow();
    });

    it("create() menerima register ACTIVE", async () => {
      const { fixture } = await setupTenant();
      const register = await seedRegulatoryRegister(fixture.tenantId, fixture.userId);
      const obligation = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        obligationService.create({
          regulatoryRegisterId: register.id,
          obligationDescription: "Lapor P2K3 triwulanan",
          obligationType: "REPORTING",
          frequency: "QUARTERLY",
        }),
      );
      expect(obligation.status).toBe("ACTIVE");
    });
  });

  describe("Alur evaluasi 1-stage: create -> submit -> HSE Manager approve -> REVIEWED -> close -> CLOSED", () => {
    async function submitAndApprove(evaluationId: string, hseManagerId: string, tenantId: string) {
      const submitted = await tenantContextStorage.run({ tenantId, userId: hseManagerId }, () => evaluationService.submitForApproval(evaluationId));
      const task = await adminPrisma.workflowTask.findFirstOrThrow({ where: { instanceId: submitted.workflowInstanceId!, status: "PENDING" } });
      expect(task.assignedTo).toBe(hseManagerId);
      await tenantContextStorage.run({ tenantId, userId: hseManagerId }, () => workflowEngineService.actOnTask(task.id, "APPROVE", undefined, hseManagerId));
      await new Promise((r) => setTimeout(r, 300));
      return submitted;
    }

    it("evaluasi COMPLIANT: REVIEWED -> close() -> CLOSED, BR-06 next_due_date obligation direkomputasi", async () => {
      const { fixture, hseManager } = await setupTenant();
      const register = await seedRegulatoryRegister(fixture.tenantId, fixture.userId);
      const obligation = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        obligationService.create({
          regulatoryRegisterId: register.id,
          obligationDescription: "Lapor P2K3 triwulanan",
          obligationType: "REPORTING",
          frequency: "QUARTERLY",
        }),
      );

      const evaluation = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        evaluationService.create({
          regulatoryRegisterId: register.id,
          obligationId: obligation.id,
          evaluationPeriodStart: new Date("2026-01-01"),
          evaluationPeriodEnd: new Date("2026-03-31"),
          evaluatorUserId: fixture.userId,
          evaluationDate: new Date(),
          evaluationMethod: "DOCUMENT_REVIEW",
          complianceStatus: "COMPLIANT",
        }),
      );
      expect(evaluation.evaluationNumber).toContain("EVAL");

      await submitAndApprove(evaluation.id, hseManager.id, fixture.tenantId);

      const reviewed = await adminPrisma.complianceEvaluation.findUniqueOrThrow({ where: { id: evaluation.id } });
      expect(reviewed.status).toBe("REVIEWED");

      const closed = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => evaluationService.close(evaluation.id));
      expect(closed.status).toBe("CLOSED");
      expect(closed.nextEvaluationDueDate).not.toBeNull();

      const obligationAfter = await adminPrisma.complianceObligation.findUniqueOrThrow({ where: { id: obligation.id } });
      expect(obligationAfter.nextDueDate).not.toBeNull();
      expect(obligationAfter.nextDueDate!.getTime()).toBe(closed.nextEvaluationDueDate!.getTime());
    }, 15000);

    it("BR-03: evaluasi NON_COMPLIANT tanpa linked_capa_id tidak bisa CLOSED", async () => {
      const { fixture, hseManager } = await setupTenant();
      const register = await seedRegulatoryRegister(fixture.tenantId, fixture.userId);
      const evaluation = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        evaluationService.create({
          regulatoryRegisterId: register.id,
          evaluationPeriodStart: new Date("2026-01-01"),
          evaluationPeriodEnd: new Date("2026-03-31"),
          evaluatorUserId: fixture.userId,
          evaluationDate: new Date(),
          evaluationMethod: "DOCUMENT_REVIEW",
          complianceStatus: "NON_COMPLIANT",
        }),
      );
      await submitAndApprove(evaluation.id, hseManager.id, fixture.tenantId);

      // assertCanCloseEvaluation() throw Error polos (bukan BadRequestException).
      await expect(
        tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => evaluationService.close(evaluation.id)),
      ).rejects.toThrow();

      const withCapa = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        evaluationService.update(evaluation.id, { linkedCapaId: randomUUID() }),
      );
      expect(withCapa.capaTriggered).toBe(true);

      const closed = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => evaluationService.close(evaluation.id));
      expect(closed.status).toBe("CLOSED");
    }, 15000);

    it("path REJECT: HSE Manager reject -> evaluasi kembali DRAFT (bukan status terminal terpisah)", async () => {
      const { fixture, hseManager } = await setupTenant();
      const register = await seedRegulatoryRegister(fixture.tenantId, fixture.userId);
      const evaluation = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        evaluationService.create({
          regulatoryRegisterId: register.id,
          evaluationPeriodStart: new Date("2026-01-01"),
          evaluationPeriodEnd: new Date("2026-03-31"),
          evaluatorUserId: fixture.userId,
          evaluationDate: new Date(),
          evaluationMethod: "DOCUMENT_REVIEW",
          complianceStatus: "COMPLIANT",
        }),
      );
      const submitted = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => evaluationService.submitForApproval(evaluation.id));
      const task = await adminPrisma.workflowTask.findFirstOrThrow({ where: { instanceId: submitted.workflowInstanceId!, status: "PENDING" } });
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: hseManager.id }, () =>
        workflowEngineService.actOnTask(task.id, "REJECT", "Data belum lengkap", hseManager.id),
      );
      await new Promise((r) => setTimeout(r, 300));

      const reverted = await adminPrisma.complianceEvaluation.findUniqueOrThrow({ where: { id: evaluation.id } });
      expect(reverted.status).toBe("DRAFT");
    }, 15000);

    it("submitForApproval menolak evaluasi yang bukan DRAFT", async () => {
      const { fixture, hseManager } = await setupTenant();
      const register = await seedRegulatoryRegister(fixture.tenantId, fixture.userId);
      const evaluation = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        evaluationService.create({
          regulatoryRegisterId: register.id,
          evaluationPeriodStart: new Date("2026-01-01"),
          evaluationPeriodEnd: new Date("2026-03-31"),
          evaluatorUserId: fixture.userId,
          evaluationDate: new Date(),
          evaluationMethod: "DOCUMENT_REVIEW",
          complianceStatus: "COMPLIANT",
        }),
      );
      await submitAndApprove(evaluation.id, hseManager.id, fixture.tenantId);

      await expect(
        tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => evaluationService.submitForApproval(evaluation.id)),
      ).rejects.toThrow(BadRequestException);
    }, 15000);
  });

  describe("LicensePermitService — renewal chain", () => {
    it("createRenewal: baris baru ACTIVE dgn renewal_of_license_id, baris lama tidak dipaksa berubah status", async () => {
      const { fixture } = await setupTenant();
      const original = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        licenseService.create({
          licenseNumber: "SIO-001",
          licenseName: "SIO Forklift",
          licenseType: "SIO_OPERATOR_CERT",
          holderType: "INDIVIDUAL",
          holderReferenceId: fixture.userId,
          issueDate: new Date("2023-01-01"),
          expiryDate: new Date("2026-01-01"),
        }),
      );

      const inRenewal = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        licenseService.markInRenewalProcess(original.id),
      );
      expect(inRenewal.status).toBe("IN_RENEWAL_PROCESS");

      const renewed = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        licenseService.createRenewal(original.id, { licenseNumber: "SIO-002", issueDate: new Date() }),
      );
      expect(renewed.status).toBe("ACTIVE");
      expect(renewed.renewalOfLicenseId).toBe(original.id);
      expect(renewed.licenseType).toBe("SIO_OPERATOR_CERT");
      expect(renewed.holderReferenceId).toBe(fixture.userId);

      const oldAfter = await adminPrisma.licensePermit.findUniqueOrThrow({ where: { id: original.id } });
      expect(oldAfter.status).toBe("IN_RENEWAL_PROCESS");
      expect(oldAfter.deletedAt).toBeNull();
    });

    it("createRenewal menolak izin REVOKED", async () => {
      const { fixture } = await setupTenant();
      const original = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        licenseService.create({
          licenseNumber: "ENV-001",
          licenseName: "Izin Lingkungan",
          licenseType: "ENVIRONMENTAL_PERMIT",
          holderType: "COMPANY",
          issueDate: new Date("2023-01-01"),
        }),
      );
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => licenseService.revoke(original.id));

      await expect(
        tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
          licenseService.createRenewal(original.id, { licenseNumber: "ENV-002", issueDate: new Date() }),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("findExpiredSioCertifications — BR-05 query-only helper", async () => {
      const { fixture } = await setupTenant();
      const cert = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        licenseService.create({
          licenseNumber: "SIO-EXP-001",
          licenseName: "SIO Crane",
          licenseType: "SIO_OPERATOR_CERT",
          holderType: "INDIVIDUAL",
          holderReferenceId: fixture.userId,
          issueDate: new Date("2020-01-01"),
          expiryDate: new Date("2021-01-01"),
        }),
      );
      await adminPrisma.licensePermit.update({ where: { id: cert.id }, data: { status: "EXPIRED" } });

      const expired = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        licenseService.findExpiredSioCertifications(fixture.userId),
      );
      expect(expired.map((c) => c.id)).toContain(cert.id);
    });
  });

  describe("license-expiry-scan — BR-01/BR-02 + notifikasi bertingkat", () => {
    it("BR-01: ACTIVE dalam window renewal_lead_time_days -> EXPIRING_SOON, tier H-30 terisi", async () => {
      const { fixture } = await setupTenant();
      const license = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        licenseService.create({
          licenseNumber: "OPS-001",
          licenseName: "Izin Operasional",
          licenseType: "OPERATIONAL_PERMIT",
          holderType: "SITE",
          issueDate: new Date("2020-01-01"),
          expiryDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
          renewalLeadTimeDays: 90,
        }),
      );

      await licenseExpiryScanService.scan();

      const after = await adminPrisma.licensePermit.findUniqueOrThrow({ where: { id: license.id } });
      expect(after.status).toBe("EXPIRING_SOON");
      expect(after.expiryReminder90SentAt).not.toBeNull();
      expect(after.expiryReminder30SentAt).not.toBeNull();
      expect(after.expiryReminder7SentAt).toBeNull();
    });

    it("BR-02: expiry_date terlewati -> EXPIRED", async () => {
      const { fixture } = await setupTenant();
      const license = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        licenseService.create({
          licenseNumber: "OPS-002",
          licenseName: "Izin Operasional Lewat",
          licenseType: "OPERATIONAL_PERMIT",
          holderType: "SITE",
          issueDate: new Date("2020-01-01"),
          expiryDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        }),
      );

      await licenseExpiryScanService.scan();

      const after = await adminPrisma.licensePermit.findUniqueOrThrow({ where: { id: license.id } });
      expect(after.status).toBe("EXPIRED");
    });

    it("scan kedua tidak mengirim ulang tier yang sudah terkirim (idempotency)", async () => {
      const { fixture } = await setupTenant();
      const license = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        licenseService.create({
          licenseNumber: "OPS-003",
          licenseName: "Izin Idempotent",
          licenseType: "OPERATIONAL_PERMIT",
          holderType: "SITE",
          issueDate: new Date("2020-01-01"),
          expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        }),
      );

      await licenseExpiryScanService.scan();
      const afterFirst = await adminPrisma.licensePermit.findUniqueOrThrow({ where: { id: license.id } });
      expect(afterFirst.expiryReminder7SentAt).not.toBeNull();
      const firstTimestamp = afterFirst.expiryReminder7SentAt;

      await licenseExpiryScanService.scan();
      const afterSecond = await adminPrisma.licensePermit.findUniqueOrThrow({ where: { id: license.id } });
      expect(afterSecond.expiryReminder7SentAt?.getTime()).toBe(firstTimestamp?.getTime());
    });
  });

  describe("obligation-due-scan — jatuh tempo H-30 & overdue", () => {
    it("obligation dgn next_due_date lewat -> overdue_notified_at terisi", async () => {
      const { fixture } = await setupTenant();
      const register = await seedRegulatoryRegister(fixture.tenantId, fixture.userId);
      const obligation = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        obligationService.create({
          regulatoryRegisterId: register.id,
          obligationDescription: "Wajib lapor overdue",
          obligationType: "REPORTING",
          frequency: "MONTHLY",
          responsibleUserId: fixture.userId,
        }),
      );
      await adminPrisma.complianceObligation.update({
        where: { id: obligation.id },
        data: { nextDueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
      });

      await obligationDueScanService.scan();

      const after = await adminPrisma.complianceObligation.findUniqueOrThrow({ where: { id: obligation.id } });
      expect(after.overdueNotifiedAt).not.toBeNull();
    });

    it("obligation dlm window H-30 -> due_reminder_sent_at terisi", async () => {
      const { fixture } = await setupTenant();
      const register = await seedRegulatoryRegister(fixture.tenantId, fixture.userId);
      const obligation = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        obligationService.create({
          regulatoryRegisterId: register.id,
          obligationDescription: "Wajib lapor due soon",
          obligationType: "REPORTING",
          frequency: "MONTHLY",
          responsibleUserId: fixture.userId,
        }),
      );
      await adminPrisma.complianceObligation.update({
        where: { id: obligation.id },
        data: { nextDueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) },
      });

      await obligationDueScanService.scan();

      const after = await adminPrisma.complianceObligation.findUniqueOrThrow({ where: { id: obligation.id } });
      expect(after.dueReminderSentAt).not.toBeNull();
    });
  });

  describe("Isolasi tenant (RLS)", () => {
    it("regulatory_register tenant A tidak terlihat dari context tenant B", async () => {
      const { fixture: tenantA } = await setupTenant();
      const tenantB = await seedTenantFixture();
      const register = await seedRegulatoryRegister(tenantA.tenantId, tenantA.userId);

      await expect(
        tenantContextStorage.run({ tenantId: tenantB.tenantId, userId: tenantB.userId }, () => registerService.getById(register.id)),
      ).rejects.toThrow();
    });
  });
});
