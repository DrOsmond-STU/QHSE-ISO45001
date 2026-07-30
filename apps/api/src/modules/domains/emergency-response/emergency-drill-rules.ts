import { EmergencyDrillStatus, EmergencyDrillType } from "@prisma/client";

const ALLOWED_TRANSITIONS: Record<EmergencyDrillStatus, EmergencyDrillStatus[]> = {
  PLANNED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function validateEmergencyDrillStatusTransition(from: EmergencyDrillStatus, to: EmergencyDrillStatus): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`Transisi emergency_drills.status dari ${from} ke ${to} tidak valid.`);
  }
}

// BR-04 — "emergency_drills dengan drill_type=FULL_SCALE_EVACUATION wajib
// menghasilkan minimal satu emergency_activations (untuk mengaktifkan
// muster_point_checkins) sebelum status dapat COMPLETED." Drill TABLETOP/
// FUNCTIONAL TIDAK kena gate ini sama sekali (vacuously true).
export function assertActivationExistsIfFullScaleEvacuation(drillType: EmergencyDrillType, activationCount: number): void {
  if (drillType !== "FULL_SCALE_EVACUATION") return;
  if (activationCount < 1) {
    throw new Error(
      "emergency_drills tidak dapat COMPLETED — drill_type=FULL_SCALE_EVACUATION wajib memiliki minimal 1 emergency_activations (BR-04).",
    );
  }
}

// BR-08 — "emergency_drills.capa_id wajib diisi jika gaps_identified tidak
// kosong, sebelum status dapat COMPLETED — menutup loop temuan drill."
export function assertCapaLinkedIfGapsIdentified(gapsIdentified: string | null | undefined, capaId: string | null | undefined): void {
  const hasGaps = typeof gapsIdentified === "string" && gapsIdentified.trim().length > 0;
  if (hasGaps && !capaId) {
    throw new Error("emergency_drills tidak dapat COMPLETED — gaps_identified terisi tapi capa_id belum diisi (BR-08).");
  }
}
