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
var WorkflowSlaQueueService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowSlaQueueService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const redis_enabled_helper_1 = require("../scheduling/redis-enabled.helper");
const workflow_engine_constants_1 = require("./workflow-engine.constants");
// Sisi producer BullMQ (TDD §13.1). Koneksi ioredis SENDIRI (bukan reuse
// auth/redis.provider.ts) — BullMQ WAJIB maxRetriesPerRequest:null utk
// operasi blocking-nya, konflik kalau dicampur trafik cache/session lain
// (pola "satu koneksi per module" yang sama dipakai task 0.8 RBAC).
// REDIS_ENABLED=false (shared hosting cPanel, TDD deployment-adaptation) —
// pemicu jadwal pindah ke CronRunnerController (platform/cron-runner/),
// dipanggil cPanel Cron Job, BUKAN BullMQ repeatable job. Class ini jadi
// no-op total supaya tidak mencoba connect Redis yang tidak ada (queue.add()
// dgn maxRetriesPerRequest:null akan HANG selamanya kalau dibiarkan jalan,
// memblokir onApplicationBootstrap seluruh app).
let WorkflowSlaQueueService = WorkflowSlaQueueService_1 = class WorkflowSlaQueueService {
    logger = new common_1.Logger(WorkflowSlaQueueService_1.name);
    connection;
    queue;
    constructor() {
        if (!(0, redis_enabled_helper_1.isRedisEnabled)()) {
            this.connection = null;
            this.queue = null;
            return;
        }
        this.connection = new ioredis_1.default(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });
        this.queue = new bullmq_1.Queue(workflow_engine_constants_1.WORKFLOW_SLA_SCAN_QUEUE, { connection: this.connection });
    }
    async onApplicationBootstrap() {
        if (!this.queue)
            return;
        // BullMQ dedupe repeatable job berdasarkan {name, repeat options} — panggil
        // .add() berulang dgn jobId+opsi identik meng-upsert jadwal yang sama,
        // BUKAN menduplikasi. Aman dipanggil tanpa syarat setiap kali app restart.
        await this.queue.add(workflow_engine_constants_1.WORKFLOW_SLA_SCAN_JOB_NAME, {}, {
            repeat: { every: workflow_engine_constants_1.WORKFLOW_SLA_SCAN_INTERVAL_MS },
            jobId: workflow_engine_constants_1.WORKFLOW_SLA_SCAN_JOB_NAME,
            removeOnComplete: true,
            removeOnFail: 50,
        });
        this.logger.log(`Repeatable job "${workflow_engine_constants_1.WORKFLOW_SLA_SCAN_QUEUE}" terdaftar (tiap ${workflow_engine_constants_1.WORKFLOW_SLA_SCAN_INTERVAL_MS}ms).`);
    }
    async onModuleDestroy() {
        if (!this.queue || !this.connection)
            return;
        await this.queue.close();
        await this.connection.quit();
    }
};
exports.WorkflowSlaQueueService = WorkflowSlaQueueService;
exports.WorkflowSlaQueueService = WorkflowSlaQueueService = WorkflowSlaQueueService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], WorkflowSlaQueueService);
