import { IconArrowDown, IconArrowRight, IconArrowUp } from "../icons";

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

// Ubin ikon 48px bergradien di sudut kanan atas adalah unsur paling dikenali
// dari Soft UI Dashboard. Di sana isinya ikon hiasan yang dipilih perancang
// satu per satu per kartu — di sini isinya PANAH ARAH TREN.
//
// Bedanya nyata: kartu KPI di aplikasi ini dibangkitkan dari katalog metrik,
// bukan ditulis satu per satu, jadi tidak ada tempat untuk memilih ikon per
// kartu tanpa menambah kolom "ikon" ke seluruh katalog. Arah tren sudah ada
// datanya dan sudah punya arti.
const ARROW = {
  up: IconArrowUp,
  down: IconArrowDown,
  flat: IconArrowRight,
} as const;

// Panah tetap ikut tercetak di baris tren sebagai huruf, BUKAN hanya di ubin.
// Ubinnya aria-hidden (ia hiasan), dan sebagian teks tren tidak menyebutkan
// arahnya sendiri — "25% vs semester lalu" tidak mengatakan naik atau turun.
// Kalau panahnya hanya ada di ubin, arah itu hilang sama sekali bagi pembaca
// layar, dan warna saja bukan penyampai informasi yang sah.
const GLYPH: Record<"up" | "down" | "flat", string> = {
  up: "↑",
  down: "↓",
  flat: "→",
};

// DESIGN.md §7.4 — angka hero (text-display), label metrik (text-body-sm
// muted), delta tren pakai warna diverging §3.5 (biru membaik / merah
// memburuk), bukan warna status §3.3 (itu untuk severity, bukan tren).
export function KpiCard({ label, value, target, trend }: KpiCardProps) {
  const Arrow = trend ? ARROW[trend.direction] : null;
  return (
    <div className="qhse-kpi-card">
      <div className="qhse-kpi-card__top">
        <div className="qhse-kpi-card__text">
          <div className="qhse-kpi-card__label">{label}</div>
          <div className="qhse-kpi-card__row">
            <span className="qhse-kpi-card__value">{value}</span>
            {target && <span className="qhse-kpi-card__target">{target}</span>}
          </div>
        </div>
        {/* Ubin hanya digambar kalau ada trennya. Ubin kosong hanya akan jadi
            kotak berwarna yang tidak mengatakan apa-apa, dan sebagian metrik
            memang tidak punya periode pembanding. */}
        {Arrow && (
          <span
            className={`qhse-kpi-card__tile qhse-kpi-card__tile--${trend!.sentiment}`}
            aria-hidden="true"
          >
            <Arrow size={20} />
          </span>
        )}
      </div>
      {trend && (
        <div className={`qhse-kpi-card__trend qhse-kpi-card__trend--${trend.sentiment}`}>
          {GLYPH[trend.direction]} {trend.text}
        </div>
      )}
    </div>
  );
}
