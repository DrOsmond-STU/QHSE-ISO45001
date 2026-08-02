import { WorkPermitRiskLevel } from "@prisma/client";
/**
 * BR-04 (PRD Modul 06 §6) — "Permit dengan risk_level=HIGH atau tipe
 * dengan requires_hse_approval=TRUE wajib melalui Stage 2 HSE Approval —
 * tidak dapat dilewati meski Issuer menyetujui." Dipakai sbg
 * contextData.hasHseStage utk percabangan kondisional workflow_transitions
 * (JSON Logic, pola PERSIS HiraAssessmentService.submitForApproval()'s
 * hasExtremeHazard, task 3.2) — BEDA dari HIRA: work_permits.risk_level
 * ADALAH Prisma enum TERTUTUP (LOW/MEDIUM/HIGH), bukan VARCHAR bebas spt
 * risk_matrix_cells.risk_level (Modul 05), jadi perbandingan string
 * literal "HIGH" di sini AMAN — tidak butuh flag terstruktur terpisah spt
 * requiresEscalation Modul 05.
 */
export declare function computeHasHseStage(riskLevel: WorkPermitRiskLevel, requiresHseApproval: boolean): boolean;
