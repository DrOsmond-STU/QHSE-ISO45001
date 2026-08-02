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
exports.NotificationQueueService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const redis_enabled_helper_1 = require("../scheduling/redis-enabled.helper");
const notification_constants_1 = require("./notification.constants");
// Sisi producer BullMQ (TDD §13.1), pola sama persis
// workflow-sla-queue.service.ts (task 0.9): koneksi ioredis SENDIRI (bukan
// reuse auth/redis.provider.ts) — BullMQ WAJIB maxRetriesPerRequest:null.
// BEDA dari workflow-sla-queue: queue ini REAKTIF (satu job per pengiriman,
// dipicu event), bukan repeatable cron — jadi tidak ada
// onApplicationBootstrap, cuma method enqueue dipanggil NotificationService
// per event.
// REDIS_ENABLED=false (shared hosting) — enqueueDelivery() jadi no-op,
// NotificationPollService (cron-runner) yang memproses baris QUEUED
// langsung dari DB (subject/body sudah dipersist NotificationService.enqueue(),
// lihat banner comment NotificationLog schema.prisma).
let NotificationQueueService = class NotificationQueueService {
    connection;
    queue;
    constructor() {
        if (!(0, redis_enabled_helper_1.isRedisEnabled)()) {
            this.connection = null;
            this.queue = null;
            return;
        }
        this.connection = new ioredis_1.default(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });
        this.queue = new bullmq_1.Queue(notification_constants_1.NOTIFICATION_QUEUE, { connection: this.connection });
    }
    /**
     * TASK_INSTRUCTION.md §0.11 — "retry exponential backoff max 5x". Job
     * TIDAK di-remove otomatis saat gagal (`removeOnFail: false`) — tetap
     * ada di failed-set BullMQ sebagai jejak tambahan di luar dead-letter
     * queue eksplisit (lihat worker.on('failed') di
     * apps/worker/src/notification.worker.ts) dan notification_logs status
     * FAILED, supaya "tidak hilang diam-diam" (acceptance criterion) benar
     * di tiga tempat sekaligus.
     */
    async enqueueDelivery(payload) {
        if (!this.queue)
            return;
        await this.queue.add(notification_constants_1.NOTIFICATION_DELIVERY_JOB_NAME, payload, {
            attempts: notification_constants_1.NOTIFICATION_MAX_ATTEMPTS,
            backoff: { type: "exponential", delay: notification_constants_1.NOTIFICATION_BACKOFF_BASE_DELAY_MS },
            removeOnComplete: true,
            removeOnFail: false,
        });
    }
    async onModuleDestroy() {
        if (!this.queue || !this.connection)
            return;
        await this.queue.close();
        await this.connection.quit();
    }
};
exports.NotificationQueueService = NotificationQueueService;
exports.NotificationQueueService = NotificationQueueService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], NotificationQueueService);
//# sourceMappingURL=notification-queue.service.js.map