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
var EmergencyPlanReviewOverdueScanQueueService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmergencyPlanReviewOverdueScanQueueService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const redis_enabled_helper_1 = require("../../../platform/scheduling/redis-enabled.helper");
const emergency_plan_review_overdue_scan_constants_1 = require("./emergency-plan-review-overdue-scan.constants");
// REDIS_ENABLED=false (shared hosting cPanel, TDD deployment-adaptation) —
// pemicu jadwal pindah ke CronRunnerController (platform/cron-runner/),
// dipanggil cPanel Cron Job, BUKAN BullMQ repeatable job. Class ini jadi
// no-op total supaya tidak mencoba connect Redis yang tidak ada (queue.add()
// dgn maxRetriesPerRequest:null akan HANG selamanya kalau dibiarkan jalan,
// memblokir onApplicationBootstrap seluruh app).
let EmergencyPlanReviewOverdueScanQueueService = EmergencyPlanReviewOverdueScanQueueService_1 = class EmergencyPlanReviewOverdueScanQueueService {
    logger = new common_1.Logger(EmergencyPlanReviewOverdueScanQueueService_1.name);
    connection;
    queue;
    constructor() {
        if (!(0, redis_enabled_helper_1.isRedisEnabled)()) {
            this.connection = null;
            this.queue = null;
            return;
        }
        this.connection = new ioredis_1.default(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });
        this.queue = new bullmq_1.Queue(emergency_plan_review_overdue_scan_constants_1.EMERGENCY_PLAN_REVIEW_OVERDUE_SCAN_QUEUE, { connection: this.connection });
    }
    async onApplicationBootstrap() {
        if (!this.queue)
            return;
        await this.queue.add(emergency_plan_review_overdue_scan_constants_1.EMERGENCY_PLAN_REVIEW_OVERDUE_SCAN_JOB_NAME, {}, {
            repeat: { pattern: emergency_plan_review_overdue_scan_constants_1.EMERGENCY_PLAN_REVIEW_OVERDUE_SCAN_CRON },
            jobId: emergency_plan_review_overdue_scan_constants_1.EMERGENCY_PLAN_REVIEW_OVERDUE_SCAN_JOB_NAME,
            removeOnComplete: true,
            removeOnFail: 50,
        });
        this.logger.log(`Repeatable job "${emergency_plan_review_overdue_scan_constants_1.EMERGENCY_PLAN_REVIEW_OVERDUE_SCAN_QUEUE}" terdaftar (cron: ${emergency_plan_review_overdue_scan_constants_1.EMERGENCY_PLAN_REVIEW_OVERDUE_SCAN_CRON}).`);
    }
    async onModuleDestroy() {
        if (!this.queue || !this.connection)
            return;
        await this.queue.close();
        await this.connection.quit();
    }
};
exports.EmergencyPlanReviewOverdueScanQueueService = EmergencyPlanReviewOverdueScanQueueService;
exports.EmergencyPlanReviewOverdueScanQueueService = EmergencyPlanReviewOverdueScanQueueService = EmergencyPlanReviewOverdueScanQueueService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], EmergencyPlanReviewOverdueScanQueueService);
//# sourceMappingURL=emergency-plan-review-overdue-scan-queue.service.js.map