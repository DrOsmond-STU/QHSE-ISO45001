import { AuditTeamRole, AuditorCompetencyStatus } from "@prisma/client";

// BR-01 — "audits.status tidak dapat IN_PROGRESS jika anggota
// audit_team_members dengan role_in_team=LEAD_AUDITOR tidak memiliki
// auditor_competency_records berstatus ACTIVE untuk standard_scope yang
// relevan dengan audit_checklists.standard_code (soft warning minimal;
// hard block configurable per tenant)." "Relevan" dibaca literal string
// SAMA (standardScope === standardCode) — PRD tidak beri aturan fuzzy-
// match/sinonim (mis. "ISO 45001" vs "ISO45001"), gap TDD §26. Fungsi ini
// SELALU mengembalikan warning (tidak pernah throw) — PRD §13 Open
// Question #1 SENDIRI belum menjawab wajib hard-block Phase 1 atau tidak,
// dan TIDAK ADA kolom tenant-config utk toggle "hard block" di skema —
// diinterpretasikan sbg SELALU soft-warning (paling literal dari "soft
// warning minimal").
export interface CompetencyRecordForCheck {
  userId: string;
  standardScope: string;
  status: AuditorCompetencyStatus;
  expiryDate: Date | null;
}

export interface TeamMemberForCompetencyCheck {
  userId: string;
  roleInTeam: AuditTeamRole;
}

export function checkLeadAuditorCompetencyWarnings(
  teamMembers: TeamMemberForCompetencyCheck[],
  competencyRecords: CompetencyRecordForCheck[],
  standardCode: string,
  now: Date,
): string[] {
  const leadAuditors = teamMembers.filter((m) => m.roleInTeam === "LEAD_AUDITOR");
  const warnings: string[] = [];
  for (const lead of leadAuditors) {
    const hasActiveMatch = competencyRecords.some(
      (c) =>
        c.userId === lead.userId &&
        c.standardScope === standardCode &&
        c.status === "ACTIVE" &&
        (!c.expiryDate || c.expiryDate.getTime() >= now.getTime()),
    );
    if (!hasActiveMatch) {
      warnings.push(
        `Lead Auditor (user ${lead.userId}) tidak memiliki auditor_competency_records ACTIVE untuk standard_scope="${standardCode}" (BR-01, soft warning).`,
      );
    }
  }
  return warnings;
}
