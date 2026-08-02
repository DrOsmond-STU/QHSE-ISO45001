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
exports.AttachmentQueueService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const redis_enabled_helper_1 = require("../scheduling/redis-enabled.helper");
const attachment_constants_1 = require("./attachment.constants");
// Sisi producer BullMQ (TDD §13.1), pola sama persis
// notification-queue.service.ts (task 0.11) / workflow-sla-queue.service.ts
// (task 0.9): koneksi ioredis SENDIRI, BullMQ WAJIB maxRetriesPerRequest:null.
// REDIS_ENABLED=false (shared hosting) — enqueueScan() jadi no-op,
// AttachmentPollService (cron-runner) yang memproses baris PENDING_SCAN.
let AttachmentQueueService = class AttachmentQueueService {
    connection;
    queue;
    constructor() {
        if (!(0, redis_enabled_helper_1.isRedisEnabled)()) {
            this.connection = null;
            this.queue = null;
            return;
        }
        this.connection = new ioredis_1.default(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });
        this.queue = new bullmq_1.Queue(attachment_constants_1.ATTACHMENT_SCAN_QUEUE, { connection: this.connection });
    }
    async enqueueScan(payload) {
        if (!this.queue)
            return;
        await this.queue.add(attachment_constants_1.ATTACHMENT_SCAN_JOB_NAME, payload, {
            attempts: attachment_constants_1.ATTACHMENT_SCAN_MAX_ATTEMPTS,
            backoff: { type: "exponential", delay: 2000 },
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
exports.AttachmentQueueService = AttachmentQueueService;
exports.AttachmentQueueService = AttachmentQueueService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], AttachmentQueueService);
//# sourceMappingURL=attachment-queue.service.js.map