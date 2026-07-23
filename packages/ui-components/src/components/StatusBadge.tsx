import { IconCheck, IconWarningOutline, IconWarningSolid, IconCross } from "../icons";

export type StatusTone = "good" | "warning" | "serious" | "critical";

const TONE_ICON: Record<StatusTone, typeof IconCheck> = {
  good: IconCheck,
  warning: IconWarningOutline,
  serious: IconWarningSolid,
  critical: IconCross,
};

export interface StatusBadgeProps {
  tone: StatusTone;
  /**
   * WAJIB diisi (bukan opsional) — DESIGN.md §3.3/§7.5: status severity
   * TIDAK PERNAH cuma warna/ikon, harus ada label teks. Membuat prop ini
   * required menegakkan aturan itu di level tipe, bukan cuma konvensi lisan.
   */
  label: string;
}

export function StatusBadge({ tone, label }: StatusBadgeProps) {
  const Icon = TONE_ICON[tone];
  return (
    <span className={`qhse-status-badge qhse-status-badge--${tone}`}>
      <Icon size={12} />
      <span>{label}</span>
    </span>
  );
}
