"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const client_1 = require("@prisma/client");
const prom_client_1 = require("prom-client");
const attachment_constants_1 = require("../attachment/attachment.constants");
const notification_constants_1 = require("../notification/notification.constants");
const workflow_engine_constants_1 = require("../workflow-engine/workflow-engine.constants");
const audit_log_constants_1 = require("../audit-log/audit-log.constants");
const redis_enabled_helper_1 = require("../scheduling/redis-enabled.helper");
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
let MetricsService = class MetricsService {
    registry = new prom_client_1.Registry();
    httpRequestsTotal;
    httpRequestDuration;
    adminPrisma;
    queueConnection;
    queues;
    constructor() {
        (0, prom_client_1.collectDefaultMetrics)({ register: this.registry, prefix: "qhse_api_" });
        this.httpRequestsTotal = new prom_client_1.Counter({
            name: "http_requests_total",
            help: "Total permintaan HTTP diterima",
            labelNames: ["method", "route", "status"],
            registers: [this.registry],
        });
        this.httpRequestDuration = new prom_client_1.Histogram({
            name: "http_request_duration_seconds",
            help: "Durasi permintaan HTTP (detik)",
            labelNames: ["method", "route", "status"],
            buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5, 10],
            registers: [this.registry],
        });
        // Koneksi ioredis SENDIRI, maxRetriesPerRequest:null (pola sama
        // WorkflowSlaQueueService 0.9) — Queue di sini HANYA dipakai baca
        // getJobCounts(), tidak pernah .add()/proses job.
        //
        // REDIS_ENABLED=false (shared hosting cPanel) — koneksi DAN Map Queue
        // TIDAK dibuat sama sekali, pola sama seluruh *-queue.service.ts.
        // CATATAN PENTING (diverifikasi empiris, jangan diganti balik jadi
        // sekadar `lazyConnect:true`): `lazyConnect` pada instance ioredis TIDAK
        // cukup — constructor `new Queue()` BullMQ langsung memicu koneksi
        // sendiri (status ioredis berubah `wait` -> `connecting` tepat setelah
        // `new Queue()`), sehingga di mode shared-hosting dulu menghasilkan loop
        // retry ECONNREFUSED tak terbatas ke 127.0.0.1:6379 sejak boot
        // (maxRetriesPerRequest:null = retry selamanya) — ribuan baris error
        // mentah ke stderr pada satu siklus boot+cron, membanjiri log hosting.
        // Guard di `collect()` saja tidak menolong krn koneksinya sudah terjadi
        // di constructor, jauh sebelum gauge pertama kali di-collect.
        if (!(0, redis_enabled_helper_1.isRedisEnabled)()) {
            this.queueConnection = null;
            this.queues = new Map();
        }
        else {
            this.queueConnection = new ioredis_1.default(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", {
                maxRetriesPerRequest: null,
            });
            this.queues = new Map([
                workflow_engine_constants_1.WORKFLOW_SLA_SCAN_QUEUE,
                notification_constants_1.NOTIFICATION_QUEUE,
                notification_constants_1.NOTIFICATION_DEAD_LETTER_QUEUE,
                attachment_constants_1.ATTACHMENT_SCAN_QUEUE,
                audit_log_constants_1.AUDIT_LOG_PARTITION_MAINTENANCE_QUEUE,
                // "reminder-scan" (task 1.1, modules/domains/organization) di-HARDCODE
                // (bukan import konstanta REMINDER_SCAN_QUEUE) SENGAJA — observability
                // adalah modul platform, mengimpor dari modul domain akan membalik
                // arah dependency modular monolith (domain boleh impor platform,
                // TIDAK sebaliknya, lihat banner comment
                // prisma-scope-hierarchy.resolver.ts). Modul Phase 2+ yang menambah
                // queue baru sertakan juga nama literalnya di sini.
                "reminder-scan",
            ].map((name) => [name, new bullmq_1.Queue(name, { connection: this.queueConnection })]));
        }
        // Bootstrap read-only cross-tenant (pola sama WorkflowSlaScanService 0.9)
        // — metrik bisnis agregat lintas tenant, bukan data satu tenant.
        this.adminPrisma = new client_1.PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
        const queues = this.queues;
        new prom_client_1.Gauge({
            name: "bullmq_queue_depth",
            help: "Jumlah job per state per BullMQ queue",
            labelNames: ["queue", "state"],
            registers: [this.registry],
            async collect() {
                // REDIS_ENABLED=false (shared hosting) — tidak ada BullMQ sama
                // sekali di mode ini (lihat redis-enabled.helper.ts), gauge ini
                // genuinely tidak berlaku, di-skip total (bukan 0 palsu).
                if (!(0, redis_enabled_helper_1.isRedisEnabled)())
                    return;
                for (const [name, queue] of queues) {
                    const counts = await queue.getJobCounts("waiting", "active", "delayed", "failed");
                    for (const [state, count] of Object.entries(counts)) {
                        this.set({ queue: name, state }, count);
                    }
                }
            },
        });
        const adminPrisma = this.adminPrisma;
        new prom_client_1.Gauge({
            name: "qhse_workflow_instances_active",
            help: "Jumlah workflow_instances berstatus IN_PROGRESS (lintas tenant)",
            registers: [this.registry],
            async collect() {
                const rows = await adminPrisma.$queryRaw `
          SELECT count(*) AS count FROM workflow_instances WHERE status = 'IN_PROGRESS'
        `;
                this.set(Number(rows[0]?.count ?? 0));
            },
        });
        new prom_client_1.Gauge({
            name: "qhse_notifications_failed",
            help: "Jumlah notification_logs berstatus FAILED (lintas tenant)",
            registers: [this.registry],
            async collect() {
                const rows = await adminPrisma.$queryRaw `
          SELECT count(*) AS count FROM notification_logs WHERE status = 'FAILED'
        `;
                this.set(Number(rows[0]?.count ?? 0));
            },
        });
    }
    recordHttpRequest(method, route, status, durationSeconds) {
        const labels = { method, route, status: String(status) };
        this.httpRequestsTotal.inc(labels);
        this.httpRequestDuration.observe(labels, durationSeconds);
    }
    async onModuleDestroy() {
        for (const queue of this.queues.values()) {
            await queue.close();
        }
        await this.queueConnection?.quit();
        await this.adminPrisma.$disconnect();
    }
};
exports.MetricsService = MetricsService;
exports.MetricsService = MetricsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], MetricsService);
