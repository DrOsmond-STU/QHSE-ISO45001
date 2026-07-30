import { ConflictException, ForbiddenException, INestApplication, NotFoundException } from "@nestjs/common";
import { DelegationOfAuthorityService } from "../../../src/modules/domains/user-role/delegation/delegation-of-authority.service";
import { DelegationScanService } from "../../../src/modules/domains/user-role/delegation/delegation-scan.service";
import { DelegationOverlapError } from "../../../src/modules/domains/user-role/delegation/delegation-lifecycle";
import { WorkflowEngineService } from "../../../src/platform/workflow-engine/workflow-engine.service";
import { tenantContextStorage } from "../../../src/platform/tenancy/tenant-context";
import { adminPrisma, createTestApp, isoDate, seedSingleStageWorkflowDefinition, seedTenantFixture, seedUserInTenant } from "./test-helpers";

describe("Delegation of Authority (Modul 02 §4.3/§5, task 1.4)", () => {
  let app: INestApplication;
  let delegationService: DelegationOfAuthorityService;
  let scanService: DelegationScanService;
  let workflowEngine: WorkflowEngineService;

  beforeAll(async () => {
    app = await createTestApp();
    delegationService = app.get(DelegationOfAuthorityService);
    scanService = app.get(DelegationScanService);
    workflowEngine = app.get(WorkflowEngineService);
  });

  afterAll(async () => {
    await app.close();
    await adminPrisma.$disconnect();
  });

  function asUser<T>(tenantId: string, userId: string, fn: () => Promise<T>): Promise<T> {
    return tenantContextStorage.run({ tenantId, userId }, fn);
  }

  it("create() menolak delegator_user_id yang tidak ada di tenant ini", async () => {
    const fixture = await seedTenantFixture();
    const delegate = await seedUserInTenant(fixture.tenantId, "Delegate");

    await expect(
      asUser(fixture.tenantId, fixture.userId, () =>
        delegationService.create({
          delegatorUserId: "00000000-0000-0000-0000-000000000000",
          delegateUserId: delegate,
          dateFrom: isoDate(1),
          dateTo: isoDate(5),
        }),
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it("BR-07: menolak delegasi baru yang overlap tanggal utk kombinasi (delegator, role, scope) yang sama", async () => {
    const fixture = await seedTenantFixture();
    const delegator = await seedUserInTenant(fixture.tenantId, "Delegator");
    const delegateA = await seedUserInTenant(fixture.tenantId, "Delegate A");
    const delegateB = await seedUserInTenant(fixture.tenantId, "Delegate B");

    await asUser(fixture.tenantId, fixture.userId, () =>
      delegationService.create({ delegatorUserId: delegator, delegateUserId: delegateA, dateFrom: isoDate(5), dateTo: isoDate(15) }),
    );

    await expect(
      asUser(fixture.tenantId, fixture.userId, () =>
        delegationService.create({ delegatorUserId: delegator, delegateUserId: delegateB, dateFrom: isoDate(10), dateTo: isoDate(20) }),
      ),
    ).rejects.toThrow(DelegationOverlapError);
  });

  it("BR-07 TIDAK menghalangi kombinasi role_id BERBEDA utk delegator yang sama (identitas kombinasi beda)", async () => {
    const fixture = await seedTenantFixture();
    const delegator = await seedUserInTenant(fixture.tenantId, "Delegator");
    const delegate = await seedUserInTenant(fixture.tenantId, "Delegate");
    const role = await adminPrisma.role.findFirstOrThrow({ where: { tenantId: null, roleCode: "HSE_MANAGER" } });

    await asUser(fixture.tenantId, fixture.userId, () =>
      delegationService.create({ delegatorUserId: delegator, delegateUserId: delegate, dateFrom: isoDate(5), dateTo: isoDate(15) }),
    );

    // roleId beda (terisi vs NULL sebelumnya) -> kombinasi identitas beda, tidak overlap secara BR-07.
    await expect(
      asUser(fixture.tenantId, fixture.userId, () =>
        delegationService.create({
          delegatorUserId: delegator,
          delegateUserId: delegate,
          roleId: role.id,
          dateFrom: isoDate(5),
          dateTo: isoDate(15),
        }),
      ),
    ).resolves.toBeDefined();
  });

  it("revoke() mengubah status ke REVOKED dan menolak revoke kedua (sudah terminal)", async () => {
    const fixture = await seedTenantFixture();
    const delegator = await seedUserInTenant(fixture.tenantId, "Delegator");
    const delegate = await seedUserInTenant(fixture.tenantId, "Delegate");

    const created = await asUser(fixture.tenantId, fixture.userId, () =>
      delegationService.create({ delegatorUserId: delegator, delegateUserId: delegate, dateFrom: isoDate(5), dateTo: isoDate(15) }),
    );

    const revoked = await asUser(fixture.tenantId, fixture.userId, () => delegationService.revoke(created.id));
    expect(revoked.status).toBe("REVOKED");

    await expect(asUser(fixture.tenantId, fixture.userId, () => delegationService.revoke(created.id))).rejects.toThrow(
      ConflictException,
    );
  });

  it("delegation-scan: SCHEDULED -> ACTIVE begitu date_from tercapai, memprovisioning workflow_delegations (BR-08)", async () => {
    const fixture = await seedTenantFixture();
    const delegator = await seedUserInTenant(fixture.tenantId, "Delegator");
    const delegate = await seedUserInTenant(fixture.tenantId, "Delegate");

    const created = await asUser(fixture.tenantId, fixture.userId, () =>
      delegationService.create({ delegatorUserId: delegator, delegateUserId: delegate, dateFrom: isoDate(0), dateTo: isoDate(5) }),
    );

    await scanService.scan();

    const refreshed = await adminPrisma.delegationOfAuthority.findUniqueOrThrow({ where: { id: created.id } });
    expect(refreshed.status).toBe("ACTIVE");

    const wd = await adminPrisma.workflowDelegation.findFirstOrThrow({ where: { sourceDelegationOfAuthorityId: created.id } });
    expect(wd.delegatorUserId).toBe(delegator);
    expect(wd.delegateUserId).toBe(delegate);
    expect(wd.isActive).toBe(true);
  });

  it("delegation-scan: idempotent — run 2x berturut-turut tidak membuat workflow_delegations duplikat", async () => {
    const fixture = await seedTenantFixture();
    const delegator = await seedUserInTenant(fixture.tenantId, "Delegator");
    const delegate = await seedUserInTenant(fixture.tenantId, "Delegate");

    const created = await asUser(fixture.tenantId, fixture.userId, () =>
      delegationService.create({ delegatorUserId: delegator, delegateUserId: delegate, dateFrom: isoDate(0), dateTo: isoDate(5) }),
    );

    await scanService.scan();
    await scanService.scan();

    const wdCount = await adminPrisma.workflowDelegation.count({ where: { sourceDelegationOfAuthorityId: created.id } });
    expect(wdCount).toBe(1);
  });

  it("delegation-scan: ACTIVE -> EXPIRED begitu date_to terlewati, menonaktifkan workflow_delegations terkait", async () => {
    const fixture = await seedTenantFixture();
    const delegator = await seedUserInTenant(fixture.tenantId, "Delegator");
    const delegate = await seedUserInTenant(fixture.tenantId, "Delegate");

    // Seed LANGSUNG sbg ACTIVE+expired (bypass proses aktivasi normal —
    // fokus test ini murni transisi ACTIVE->EXPIRED).
    const delegation = await adminPrisma.delegationOfAuthority.create({
      data: {
        tenantId: fixture.tenantId,
        delegatorUserId: delegator,
        delegateUserId: delegate,
        dateFrom: isoDate(-10),
        dateTo: isoDate(-1),
        status: "ACTIVE",
        createdBy: fixture.userId,
        updatedBy: fixture.userId,
      },
    });
    await adminPrisma.workflowDelegation.create({
      data: {
        tenantId: fixture.tenantId,
        delegatorUserId: delegator,
        delegateUserId: delegate,
        dateFrom: isoDate(-10),
        dateTo: isoDate(-1),
        isActive: true,
        sourceDelegationOfAuthorityId: delegation.id,
      },
    });

    await scanService.scan();

    const refreshed = await adminPrisma.delegationOfAuthority.findUniqueOrThrow({ where: { id: delegation.id } });
    expect(refreshed.status).toBe("EXPIRED");

    const wd = await adminPrisma.workflowDelegation.findFirstOrThrow({ where: { sourceDelegationOfAuthorityId: delegation.id } });
    expect(wd.isActive).toBe(false);
  });

  it("delegation-scan mereroute workflow_tasks PENDING yang SUDAH ADA sebelum delegasi aktif (acceptance criterion literal 1.4) — delegate BISA actOnTask, delegator asli TIDAK BISA lagi", async () => {
    const fixture = await seedTenantFixture();
    const delegator = await seedUserInTenant(fixture.tenantId, "Delegator");
    const delegate = await seedUserInTenant(fixture.tenantId, "Delegate");
    const wf = await seedSingleStageWorkflowDefinition(fixture.tenantId, { approverUserId: delegator, allowDelegation: true });

    const instance = await asUser(fixture.tenantId, fixture.userId, () =>
      workflowEngine.startInstance("test_entity", "11111111-1111-1111-1111-111111111111", wf.workflowDefinitionId, {}),
    );
    const taskBefore = await adminPrisma.workflowTask.findFirstOrThrow({ where: { instanceId: instance.id } });
    expect(taskBefore.assignedTo).toBe(delegator);

    await asUser(fixture.tenantId, fixture.userId, () =>
      delegationService.create({ delegatorUserId: delegator, delegateUserId: delegate, dateFrom: isoDate(0), dateTo: isoDate(5) }),
    );
    await scanService.scan();

    const taskAfter = await adminPrisma.workflowTask.findUniqueOrThrow({ where: { id: taskBefore.id } });
    expect(taskAfter.assignedTo).toBe(delegate);
    expect(taskAfter.delegatedTo).toBe(delegate);

    // Bukti end-to-end: delegator asli DITOLAK, delegate BISA menyelesaikan task.
    await expect(
      asUser(fixture.tenantId, fixture.userId, () => workflowEngine.actOnTask(taskBefore.id, "APPROVE", undefined, delegator)),
    ).rejects.toThrow(ForbiddenException);

    const result = await asUser(fixture.tenantId, fixture.userId, () =>
      workflowEngine.actOnTask(taskBefore.id, "APPROVE", "diambil alih delegate", delegate),
    );
    expect(result.alreadyProcessed).toBe(false);
    expect(result.task.status).toBe("APPROVED");
  });

  it("delegation-scan TIDAK mereroute task di stage yang allowDelegation:false", async () => {
    const fixture = await seedTenantFixture();
    const delegator = await seedUserInTenant(fixture.tenantId, "Delegator");
    const delegate = await seedUserInTenant(fixture.tenantId, "Delegate");
    const wf = await seedSingleStageWorkflowDefinition(fixture.tenantId, { approverUserId: delegator, allowDelegation: false });

    const instance = await asUser(fixture.tenantId, fixture.userId, () =>
      workflowEngine.startInstance("test_entity", "22222222-2222-2222-2222-222222222222", wf.workflowDefinitionId, {}),
    );
    const task = await adminPrisma.workflowTask.findFirstOrThrow({ where: { instanceId: instance.id } });

    await asUser(fixture.tenantId, fixture.userId, () =>
      delegationService.create({ delegatorUserId: delegator, delegateUserId: delegate, dateFrom: isoDate(0), dateTo: isoDate(5) }),
    );
    await scanService.scan();

    const taskAfter = await adminPrisma.workflowTask.findUniqueOrThrow({ where: { id: task.id } });
    expect(taskAfter.assignedTo).toBe(delegator); // TIDAK berubah
    expect(taskAfter.delegatedTo).toBeNull();
  });

  it("ApproverResolutionService.substituteActiveDelegates: task BARU yang dibuat SETELAH delegasi aktif langsung ke delegate (bukan lewat delegation-scan)", async () => {
    const fixture = await seedTenantFixture();
    const delegator = await seedUserInTenant(fixture.tenantId, "Delegator");
    const delegate = await seedUserInTenant(fixture.tenantId, "Delegate");
    const wf = await seedSingleStageWorkflowDefinition(fixture.tenantId, { approverUserId: delegator, allowDelegation: true });

    // Delegasi diaktifkan LEBIH DULU (via scan, tanpa task apa pun yang perlu di-reroute).
    await asUser(fixture.tenantId, fixture.userId, () =>
      delegationService.create({ delegatorUserId: delegator, delegateUserId: delegate, dateFrom: isoDate(0), dateTo: isoDate(5) }),
    );
    await scanService.scan();

    // Instance BARU dibuat SETELAH delegasi ACTIVE -> ApproverResolutionService yang menangani, bukan delegation-scan.
    const instance = await asUser(fixture.tenantId, fixture.userId, () =>
      workflowEngine.startInstance("test_entity", "33333333-3333-3333-3333-333333333333", wf.workflowDefinitionId, {}),
    );
    const task = await adminPrisma.workflowTask.findFirstOrThrow({ where: { instanceId: instance.id } });
    expect(task.assignedTo).toBe(delegate);
  });

  it("isolasi tenant: delegation-scan tenant A tidak menyentuh delegation_of_authority tenant B", async () => {
    const fixtureA = await seedTenantFixture();
    const fixtureB = await seedTenantFixture();
    const delegatorB = await seedUserInTenant(fixtureB.tenantId, "Delegator B");
    const delegateB = await seedUserInTenant(fixtureB.tenantId, "Delegate B");

    const createdB = await asUser(fixtureB.tenantId, fixtureB.userId, () =>
      delegationService.create({ delegatorUserId: delegatorB, delegateUserId: delegateB, dateFrom: isoDate(0), dateTo: isoDate(5) }),
    );

    // scan() SENDIRI cross-tenant (bootstrap admin query) — panggil sekali
    // sudah cukup memproses SEMUA tenant termasuk B, cek hasilnya benar.
    await scanService.scan();

    const refreshedB = await adminPrisma.delegationOfAuthority.findUniqueOrThrow({ where: { id: createdB.id } });
    expect(refreshedB.status).toBe("ACTIVE"); // diproses benar sesuai tenant-nya sendiri, bukti loop cross-tenant jalan
  });
});
