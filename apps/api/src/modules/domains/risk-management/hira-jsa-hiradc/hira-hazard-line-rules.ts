// BR-02 (PRD Modul 05 §6): "hira_hazard_lines/hiradc_lines dengan
// risk_level_after/risk_level masih HIGH/EXTREME wajib mengisi
// additional_controls_required/control_measures dan tidak dapat berstatus
// APPROVED tanpa itu." Dibaca via requiresEscalation (EXTREME) DITAMBAH
// riskLevelAfter==="HIGH" (HIGH TIDAK py flag terstruktur tersendiri, cuma
// EXTREME yang butuh percabangan workflow — tapi BR-02 literal minta
// KEDUANYA HIGH/EXTREME dicek, jadi klausa HIGH tetap string-compare
// thd nilai band DEFAULT "HIGH", didokumentasikan gap TDD §26 sbg
// keterbatasan yang SAMA dgn requiresEscalation sendiri utk tenant yang
// mengustomisasi label matriksnya).
export interface HiraHazardLineControlCandidate {
  riskLevelAfter: string;
  requiresEscalationAfter: boolean;
  additionalControlsRequired: string | null;
}

export function assertControlsPresentIfStillHighRisk(line: HiraHazardLineControlCandidate): void {
  const stillHighRisk = line.requiresEscalationAfter || line.riskLevelAfter === "HIGH";
  if (stillHighRisk && !line.additionalControlsRequired) {
    throw new Error(
      `hira_hazard_lines dengan risk_level_after=${line.riskLevelAfter} wajib mengisi additional_controls_required sebelum HIRA dapat disetujui (BR-02).`,
    );
  }
}

export function assertAllControlsPresentIfStillHighRisk(lines: HiraHazardLineControlCandidate[]): void {
  for (const line of lines) {
    assertControlsPresentIfStillHighRisk(line);
  }
}
