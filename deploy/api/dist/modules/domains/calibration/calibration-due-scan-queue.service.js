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
var CalibrationDueScanQueueService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalibrationDueScanQueueService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const redis_enabled_helper_1 = require("../../../platform/scheduling/redis-enabled.helper");
const calibration_due_scan_constants_1 = require("./calibration-due-scan.constants");
// REDIS_ENABLED=false (shared hosting cPanel, TDD deployment-adaptation) —
// pemicu jadwal pindah ke CronRunnerController (platform/cron-runner/),
// dipanggil cPanel Cron Job, BUKAN BullMQ repeatable job. Class ini jadi
// no-op total supaya tidak mencoba connect Redis yang tidak ada (queue.add()
// dgn maxRetriesPerRequest:null akan HANG selamanya kalau dibiarkan jalan,
// memblokir onApplicationBootstrap seluruh app).
let CalibrationDueScanQueueService = CalibrationDueScanQueueService_1 = class CalibrationDueScanQueueService {
    logger = new common_1.Logger(CalibrationDueScanQueueService_1.name);
    connection;
    queue;
    constructor() {
        if (!(0, redis_enabled_helper_1.isRedisEnabled)()) {
            this.connection = null;
            this.queue = null;
            return;
        }
        this.connection = new ioredis_1.default(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });
        this.queue = new bullmq_1.Queue(calibration_due_scan_constants_1.CALIBRATION_DUE_SCAN_QUEUE, { connection: this.connection });
    }
    async onApplicationBootstrap() {
        if (!this.queue)
            return;
        await this.queue.add(calibration_due_scan_constants_1.CALIBRATION_DUE_SCAN_JOB_NAME, {}, {
            repeat: { pattern: calibration_due_scan_constants_1.CALIBRATION_DUE_SCAN_CRON },
            jobId: calibration_due_scan_constants_1.CALIBRATION_DUE_SCAN_JOB_NAME,
            removeOnComplete: true,
            removeOnFail: 50,
        });
        this.logger.log(`Repeatable job "${calibration_due_scan_constants_1.CALIBRATION_DUE_SCAN_QUEUE}" terdaftar (cron: ${calibration_due_scan_constants_1.CALIBRATION_DUE_SCAN_CRON}).`);
    }
    async onModuleDestroy() {
        if (!this.queue || !this.connection)
            return;
        await this.queue.close();
        await this.connection.quit();
    }
};
exports.CalibrationDueScanQueueService = CalibrationDueScanQueueService;
exports.CalibrationDueScanQueueService = CalibrationDueScanQueueService = CalibrationDueScanQueueService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], CalibrationDueScanQueueService);
//# sourceMappingURL=calibration-due-scan-queue.service.js.map