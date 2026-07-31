import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { PrismaClient } from "@prisma/client";
import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from "prom-client";
import { ATTACHMENT_SCAN_QUEUE } from "../attachment/attachment.constants";
import { NOTIFICATION_DEAD_LETTER_QUEUE, NOTIFICATION_QUEUE } from "../notification/notification.constants";
import { WORKFLOW_SLA_SCAN_QUEUE } from "../workflow-engine/workflow-engine.constants";
import { AUDIT_LOG_PARTITION_MAINTENANCE_QUEUE } from "../audit-log/audit-log.constants";
import { isRedisEnabled } from "../scheduling/redis-enabled.helper";

// TDD §15 — "Metrics: Prometheus — metrik standar (request rate/latency/error
// per endpoint, queue depth per BullMQ queue, DB connection pool usage) +
// metrik bisnis kunci (jumlah workflow instance aktif, notifikasi gagal)".
//
// "DB connection pool usage" SENGAJA belum diimplementasikan — Prisma hanya
// mengeksposnya lewat previewFeatures:["metrics"] (masih preview di v5.22,
// butuh ubah schema.prisma generator block yang berlaku utk SELURUH client,
// dipakai 12 task sebelumnya) — perubahan berisiko lebar utk satu metrik
// tambahan, ditunda (gap, lihat TDD §26).
//
// Semua gauge di sini PULL-based (`collect()` dipanggil registry.metrics()
// SAAT di-scrape, prom-client mendukung async collect) — bukan setInterval
// terpisah yang jalan terus-menerus tanpa ada yang butuh nilainya.
@Injectable()
export class MetricsService implements OnModuleDestroy {
  readonly registry = new Registry();

  private readonly httpRequestsTotal: Counter<"method" | "route" | "status">;
  private readonly httpRequestDuration: Histogram<"method" | "route" | "status">;

  private readonly adminPrisma: PrismaClient;
  private readonly queueConnection: Redis;
  private readonly queues: Map<string, Queue>;

  constructor() {
    collectDefaultMetrics({ register: this.registry, prefix: "qhse_api_" });

    this.httpRequestsTotal = new Counter({
      name: "http_requests_total",
      help: "Total permintaan HTTP diterima",
      labelNames: ["method", "route", "status"],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: "http_request_duration_seconds",
      help: "Durasi permintaan HTTP (detik)",
      labelNames: ["method", "route", "status"],
      buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5, 10],
      registers: [this.registry],
    });

    // Koneksi ioredis SENDIRI, maxRetriesPerRequest:null (pola sama
    // WorkflowSlaQueueService 0.9) — Queue di sini HANYA dipakai baca
    // getJobCounts(), tidak pernah .add()/proses job. lazyConnect:true
    // (shared-hosting adaptation) — bullmq_queue_depth gauge di-skip total
    // saat REDIS_ENABLED=false (lihat collect() di bawah), jadi connection
    // ini TIDAK PERNAH benar-benar dipakai pada mode itu; tanpa lazyConnect
    // instance ini tetap akan mencoba connect saat construct meski gauge-nya
    // tidak pernah collect.
    this.queueConnection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", {
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });
    this.queues = new Map(
      [
        WORKFLOW_SLA_SCAN_QUEUE,
        NOTIFICATION_QUEUE,
        NOTIFICATION_DEAD_LETTER_QUEUE,
        ATTACHMENT_SCAN_QUEUE,
        AUDIT_LOG_PARTITION_MAINTENANCE_QUEUE,
        // "reminder-scan" (task 1.1, modules/domains/organization) di-HARDCODE
        // (bukan import konstanta REMINDER_SCAN_QUEUE) SENGAJA — observability
        // adalah modul platform, mengimpor dari modul domain akan membalik
        // arah dependency modular monolith (domain boleh impor platform,
        // TIDAK sebaliknya, lihat banner comment
        // prisma-scope-hierarchy.resolver.ts). Modul Phase 2+ yang menambah
        // queue baru sertakan juga nama literalnya di sini.
        "reminder-scan",
      ].map((name) => [name, new Queue(name, { connection: this.queueConnection })]),
    );

    // Bootstrap read-only cross-tenant (pola sama WorkflowSlaScanService 0.9)
    // — metrik bisnis agregat lintas tenant, bukan data satu tenant.
    this.adminPrisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });

    const queues = this.queues;
    new Gauge({
      name: "bullmq_queue_depth",
      help: "Jumlah job per state per BullMQ queue",
      labelNames: ["queue", "state"],
      registers: [this.registry],
      async collect() {
        // REDIS_ENABLED=false (shared hosting) — tidak ada BullMQ sama
        // sekali di mode ini (lihat redis-enabled.helper.ts), gauge ini
        // genuinely tidak berlaku, di-skip total (bukan 0 palsu).
        if (!isRedisEnabled()) return;
        for (const [name, queue] of queues) {
          const counts = await queue.getJobCounts("waiting", "active", "delayed", "failed");
          for (const [state, count] of Object.entries(counts)) {
            this.set({ queue: name, state }, count);
          }
        }
      },
    });

    const adminPrisma = this.adminPrisma;
    new Gauge({
      name: "qhse_workflow_instances_active",
      help: "Jumlah workflow_instances berstatus IN_PROGRESS (lintas tenant)",
      registers: [this.registry],
      async collect() {
        const rows = await adminPrisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT count(*) AS count FROM workflow_instances WHERE status = 'IN_PROGRESS'
        `;
        this.set(Number(rows[0]?.count ?? 0));
      },
    });

    new Gauge({
      name: "qhse_notifications_failed",
      help: "Jumlah notification_logs berstatus FAILED (lintas tenant)",
      registers: [this.registry],
      async collect() {
        const rows = await adminPrisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT count(*) AS count FROM notification_logs WHERE status = 'FAILED'
        `;
        this.set(Number(rows[0]?.count ?? 0));
      },
    });
  }

  recordHttpRequest(method: string, route: string, status: number, durationSeconds: number): void {
    const labels = { method, route, status: String(status) };
    this.httpRequestsTotal.inc(labels);
    this.httpRequestDuration.observe(labels, durationSeconds);
  }

  async onModuleDestroy(): Promise<void> {
    for (const queue of this.queues.values()) {
      await queue.close();
    }
    await this.queueConnection.quit();
    await this.adminPrisma.$disconnect();
  }
}
