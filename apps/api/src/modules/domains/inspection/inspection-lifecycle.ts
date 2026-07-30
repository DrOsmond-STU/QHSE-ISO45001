import { InspectionRecordStatus } from "@prisma/client";

// PRD §5 enum literal menyebut NILAI TANPA tabel transisi eksplisit — pola
// sama seluruh modul lain. COMPLETED->IN_PROGRESS SENGAJA diizinkan (BR-03
// "reopen oleh HSE Manager dengan jejak audit") — validator murni cek
// EDGE-nya valid, "siapa boleh" (HSE Manager) ditegakkan service layer,
// bukan di sini.
const ALLOWED_TRANSITIONS: Record<InspectionRecordStatus, InspectionRecordStatus[]> = {
  SCHEDULED: ["IN_PROGRESS", "OVERDUE", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "OVERDUE", "CANCELLED"],
  OVERDUE: ["IN_PROGRESS", "COMPLETED", "CANCELLED"],
  COMPLETED: ["IN_PROGRESS"],
  CANCELLED: [],
};

export function validateInspectionRecordStatusTransition(from: InspectionRecordStatus, to: InspectionRecordStatus): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`Transisi inspection_records.status dari ${from} ke ${to} tidak valid.`);
  }
}
