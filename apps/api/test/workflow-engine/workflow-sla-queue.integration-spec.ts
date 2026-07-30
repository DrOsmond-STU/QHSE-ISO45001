import { Queue } from "bullmq";
import Redis from "ioredis";
import { WorkflowSlaQueueService } from "../../src/platform/workflow-engine/workflow-sla-queue.service";
import { WORKFLOW_SLA_SCAN_QUEUE } from "../../src/platform/workflow-engine/workflow-engine.constants";

// Bukti wiring BullMQ (bukan salah satu dari 6 skenario TESTING §9, tapi
// dibutuhkan utk membuktikan job workflow-sla-scan sungguhan terdaftar) —
// re-bootstrap TIDAK menduplikasi jadwal (BullMQ dedupe by {name, repeat}).
describe("WorkflowSlaQueueService — registrasi repeatable job", () => {
  let inspectorConnection: Redis;
  let inspectorQueue: Queue;

  beforeAll(() => {
    inspectorConnection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });
    inspectorQueue = new Queue(WORKFLOW_SLA_SCAN_QUEUE, { connection: inspectorConnection });
  });

  afterAll(async () => {
    await inspectorQueue.close();
    await inspectorConnection.quit();
  });

  it("onApplicationBootstrap dipanggil 2x (simulasi 2x restart app) -> TETAP cuma 1 repeatable job terdaftar", async () => {
    const serviceA = new WorkflowSlaQueueService();
    await serviceA.onApplicationBootstrap();
    await serviceA.onModuleDestroy();

    const serviceB = new WorkflowSlaQueueService();
    await serviceB.onApplicationBootstrap();

    const repeatableJobs = await inspectorQueue.getRepeatableJobs();
    const ourJobs = repeatableJobs.filter((j) => j.name === "scan");
    expect(ourJobs).toHaveLength(1);

    await serviceB.onModuleDestroy();
  });
});
