import { DocumentVersionStatus } from "@prisma/client";

// PRD Modul 03 §5 enum status: "DRAFT -> PENDING_APPROVAL -> APPROVED ->
// PUBLISHED -> SUPERSEDED, atau PENDING_APPROVAL -> REJECTED". APPROVED
// murni transisi ANTARA (workflow instance selesai) sebelum
// DocumentWorkflowCompletionListener menuliskan PUBLISHED dalam transaksi
// yang sama — tidak ada baris yang PERNAH berhenti lama di APPROVED.
const ALLOWED_TRANSITIONS: Record<DocumentVersionStatus, DocumentVersionStatus[]> = {
  DRAFT: ["PENDING_APPROVAL"],
  PENDING_APPROVAL: ["APPROVED", "REJECTED"],
  APPROVED: ["PUBLISHED"],
  PUBLISHED: ["SUPERSEDED"],
  SUPERSEDED: [],
  REJECTED: [],
};

export function validateDocumentVersionStatusTransition(from: DocumentVersionStatus, to: DocumentVersionStatus): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`Transisi document_versions.status dari ${from} ke ${to} tidak valid.`);
  }
}

// BR-02 (PRD §6): documents.current_version_id HANYA boleh diarahkan ke
// document_versions berstatus PUBLISHED.
export function assertCanBeCurrentVersion(status: DocumentVersionStatus): void {
  if (status !== "PUBLISHED") {
    throw new Error(`document_versions berstatus ${status} tidak boleh jadi documents.current_version_id (BR-02, wajib PUBLISHED).`);
  }
}

// PRD §5 "major_version/minor_version — kombinasi tampil sbg mis. '2.1'".
// BR-01 (versi baru SELALU baris baru) — fungsi ini murni MENGHITUNG nomor
// versi berikutnya, tidak menyentuh DB; caller (DocumentVersionService)
// yang menjamin selalu INSERT baris baru, tidak pernah UPDATE versi lama.
export type VersionBump = "MAJOR" | "MINOR";

export interface VersionNumber {
  majorVersion: number;
  minorVersion: number;
}

export function computeNextVersionNumber(previous: VersionNumber | null, bump: VersionBump): VersionNumber {
  if (previous === null) {
    return { majorVersion: 1, minorVersion: 0 };
  }
  if (bump === "MAJOR") {
    return { majorVersion: previous.majorVersion + 1, minorVersion: 0 };
  }
  return { majorVersion: previous.majorVersion, minorVersion: previous.minorVersion + 1 };
}
