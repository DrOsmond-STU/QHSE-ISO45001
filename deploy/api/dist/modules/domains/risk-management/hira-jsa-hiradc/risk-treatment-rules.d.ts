import { RiskTreatmentStrategy } from "@prisma/client";
/**
 * BR-06 (PRD Modul 05 §6) — "risk_treatment_plans dengan
 * treatment_strategy=ACCEPT pada risiko risk_level=EXTREME wajib approval
 * eksplisit dari Top Management (tidak dapat 'accept' sendiri oleh risk
 * owner biasa) — guardrail governance risiko." "risiko EXTREME" dibaca via
 * flag terstruktur requiresEscalation milik SOURCE (risk_register/
 * hira_hazard_lines/hiradc_lines, diresolusi caller scr polymorphic sesuai
 * source_type SEBELUM memanggil fungsi ini) — bukan string compare, sama
 * alasan requiresEscalation di risk_matrix_cells. Guardrail ini HANYA
 * memvalidasi "field topManagementApprovedBy terisi", TIDAK memvalidasi
 * SIAPA pengisinya genuinely Top Management (tanggung jawab RBAC/controller
 * masa depan, permission risk.corporate_risk.approve — gap TDD §26, lihat
 * banner comment kolom topManagementApprovedBy schema.prisma).
 */
export declare function assertAcceptRequiresTopManagementApproval(treatmentStrategy: RiskTreatmentStrategy, sourceRequiresEscalation: boolean, topManagementApprovedBy: string | null): void;
