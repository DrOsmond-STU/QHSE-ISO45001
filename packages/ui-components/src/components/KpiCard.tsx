export type TrendSentiment = "improving" | "worsening" | "neutral";

export interface KpiCardProps {
  label: string;
  value: string;
  target?: string;
  trend?: {
    direction: "up" | "down" | "flat";
    text: string;
    sentiment: TrendSentiment;
  };
}

const ARROW: Record<"up" | "down" | "flat", string> = {
  up: "↑",
  down: "↓",
  flat: "→",
};

// DESIGN.md §7.4 — angka hero (text-display), label metrik (text-body-sm
// muted), delta tren pakai warna diverging §3.5 (biru membaik / merah
// memburuk), bukan warna status §3.3 (itu untuk severity, bukan tren).
export function KpiCard({ label, value, target, trend }: KpiCardProps) {
  return (
    <div className="qhse-kpi-card">
      <div className="qhse-kpi-card__label">{label}</div>
      <div className="qhse-kpi-card__row">
        <span className="qhse-kpi-card__value">{value}</span>
        {target && <span className="qhse-kpi-card__target">{target}</span>}
      </div>
      {trend && (
        <div className={`qhse-kpi-card__trend qhse-kpi-card__trend--${trend.sentiment}`}>
          {ARROW[trend.direction]} {trend.text}
        </div>
      )}
    </div>
  );
}
