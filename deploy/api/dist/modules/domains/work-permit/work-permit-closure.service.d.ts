import { Prisma, WorkPermitClosure } from "@prisma/client";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export interface SubmitWorkPermitClosureInput {
    areaSafetyChecklist: Prisma.InputJsonValue;
    isolationRemovedConfirmed: boolean;
    requesterSignoffBy: string;
}
export declare class WorkPermitClosureService {
    private readonly prisma;
    private readonly notificationService;
    constructor(prisma: PrismaService, notificationService: NotificationService);
    /**
     * PRD §5 "1 record penutupan final per permit (percobaan return dicatat
     * via status)" — upsert-by-workPermitId: baris PERTAMA (belum ada
     * closure) ATAU REVISI setelah RETURNED (baris SAMA, status kembali
     * SUBMITTED) — KEDUANYA berangkat dari work_permits.status=ACTIVE
     * (RETURNED sudah mengembalikan permit ke ACTIVE, lihat verify() di
     * bawah), jadi SATU validasi transisi ACTIVE->PENDING_CLOSURE cukup
     * utk kedua jalur.
     */
    submit(workPermitId: string, input: SubmitWorkPermitClosureInput): Promise<WorkPermitClosure>;
    /**
     * BR-06 — decision=VERIFIED menegakkan gate SEBELUM tulis apa pun
     * (assertClosureReadyForClosed) lalu menaikkan closure.status=VERIFIED
     * DAN work_permits.status=CLOSED SATU TRANSAKSI (PRD §6 membaca kedua
     * syarat sbg SATU gate compound utk transisi yang SAMA, bukan 2 langkah
     * terpisah) — actualEndDatetime diisi di sini. decision=RETURNED
     * mengembalikan work_permits ke ACTIVE, Requester merevisi & submit()
     * ulang baris closure yang SAMA (lihat banner comment submit() di atas).
     */
    verify(workPermitId: string, verifiedBy: string, decision: "VERIFIED" | "RETURNED", notes?: string): Promise<WorkPermitClosure>;
    /**
     * PRD §8 "Permit ditutup -> Requester, HSE -> 'Permit {permit_number}
     * telah CLOSED'". "HSE" diresolusi via role HSE_MANAGER (pola sama
     * risk-register-review-scan.service.ts, 3.2) — panggil method ini
     * SETELAH verify() berhasil dgn decision=VERIFIED (TIDAK digabung ke
     * dalam verify() itu sendiri supaya verify() tetap murni transisi
     * status, notifikasi terpisah spt WorkPermitWorkflowCompletionListener
     * memisahkan status-write dari enqueue()).
     */
    notifyClosed(workPermitId: string): Promise<void>;
    getByPermit(workPermitId: string): Promise<WorkPermitClosure>;
}
