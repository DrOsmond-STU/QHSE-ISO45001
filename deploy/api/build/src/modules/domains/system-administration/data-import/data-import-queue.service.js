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
exports.DataImportQueueService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const redis_enabled_helper_1 = require("../../../../platform/scheduling/redis-enabled.helper");
const data_import_constants_1 = require("./data-import.constants");
// Sisi producer BullMQ (TDD §13.1), pola sama persis
// attachment-queue.service.ts (0.12): koneksi ioredis SENDIRI, BullMQ
// WAJIB maxRetriesPerRequest:null. REDIS_ENABLED=false (shared hosting) —
// enqueueValidate()/enqueueCommit() jadi no-op, DataImportPollService
// (cron-runner) yang memproses job UPLOADED/VALIDATED.
let DataImportQueueService = class DataImportQueueService {
    connection;
    queue;
    constructor() {
        if (!(0, redis_enabled_helper_1.isRedisEnabled)()) {
            this.connection = null;
            this.queue = null;
            return;
        }
        this.connection = new ioredis_1.default(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null });
        this.queue = new bullmq_1.Queue(data_import_constants_1.DATA_IMPORT_QUEUE, { connection: this.connection });
    }
    /**
     * attempts tinggi + backoff exponential — dipakai jadi mekanisme
     * tunggu-hasil-scan-malware (lihat data-import.constants.ts banner
     * comment), BUKAN cuma toleransi error transient biasa.
     */
    async enqueueValidate(payload) {
        if (!this.queue)
            return;
        await this.queue.add(data_import_constants_1.DATA_IMPORT_VALIDATE_JOB_NAME, payload, {
            attempts: data_import_constants_1.DATA_IMPORT_VALIDATE_MAX_ATTEMPTS,
            backoff: { type: "exponential", delay: 3000 },
            removeOnComplete: true,
            removeOnFail: false,
        });
    }
    async enqueueCommit(payload) {
        if (!this.queue)
            return;
        await this.queue.add(data_import_constants_1.DATA_IMPORT_COMMIT_JOB_NAME, payload, {
            attempts: data_import_constants_1.DATA_IMPORT_COMMIT_MAX_ATTEMPTS,
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
exports.DataImportQueueService = DataImportQueueService;
exports.DataImportQueueService = DataImportQueueService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], DataImportQueueService);
