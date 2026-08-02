import { WorkPermitClosureStatus } from "@prisma/client";
/**
 * BR-06 (PRD Modul 06 §6) — "Status CLOSED hanya tercapai setelah
 * work_permit_closures.status=VERIFIED dan (jika requires_loto=TRUE)
 * isolation_removed_confirmed=TRUE."
 */
export declare function assertClosureReadyForClosed(closureStatus: WorkPermitClosureStatus, requiresLoto: boolean, isolationRemovedConfirmed: boolean): void;
