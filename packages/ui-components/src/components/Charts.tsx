// Grafik untuk dashboard analitik dan Balanced Scorecard.
//
// DIGAMBAR SENDIRI DENGAN SVG, TANPA PUSTAKA GRAFIK. Itu bukan soal selera:
// build apps/web berjalan di shared hosting yang sudah beberapa kali mati
// karena batas memori DAN batas jumlah proses (lihat banner next.config.js).
// Recharts menarik masuk d3-scale, d3-shape, dan belasan paket lain; setiap
// paket tambahan memperbesar langkah build yang justru paling rapuh di sana.
// Yang dibutuhkan halaman ini — garis, batang, donat, dan bullet chart —
// seluruhnya beberapa lusin baris aritmetika, dan tidak sepadan ditukar
// dengan satu titik gagal baru pada langkah yang menentukan situsnya menyala
// atau tidak.
//
// Semua grafik memakai viewBox + preserveAspectRatio, jadi ukurannya
// mengikuti lebar widget tanpa satu pun pengukuran di sisi JavaScript. Tidak
// ada ResizeObserver, tidak ada render ulang saat jendela diubah ukurannya.
//
// Warna diambil dari CSS custom property lewat `stroke="var(--qhse-brand)"`,
// bukan dari konstanta di berkas ini — sehingga mode gelap bekerja tanpa
// komponen ini tahu-menahu soal tema.

export interface ChartPoint {
  label: string;
  value: number;
}

export interface ChartSlice {
  label: string;
  value: number;
  /** Warna irisan; pemanggil menentukannya dari tone status. */
  color: string;
}

/** Format angka ringkas untuk sumbu dan label — 1.2 jt, 24 rb, 3,5. */
export function compactNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${trimZero(value / 1_000_000_000)} M`;
  if (abs >= 1_000_000) return `${trimZero(value / 1_000_000)} jt`;
  if (abs >= 10_000) return `${trimZero(value / 1_000)} rb`;
  if (Number.isInteger(value)) return String(value);
  return trimZero(value);
}

function trimZero(value: number): string {
  return String(Math.round(value * 10) / 10).replace(".", ",");
}

/** Label bulan `2026-03` -> `Mar`. Nilai lain dikembalikan apa adanya. */
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
export function shortMonthLabel(label: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(label);
  if (!match) return label;
  return MONTH_SHORT[Number(match[2]) - 1] ?? label;
}

// ---------------------------------------------------------------------------
// Grafik garis
// ---------------------------------------------------------------------------

const LINE_W = 320;
const LINE_H = 120;
const PAD_L = 4;
const PAD_R = 4;
const PAD_T = 8;
const PAD_B = 18;

export function LineChart({
  points,
  ariaLabel,
  zeroBased = true,
}: {
  points: ChartPoint[];
  ariaLabel: string;
  /**
   * Sumbu Y dimulai dari nol.
   *
   * BENAR untuk deret hitungan dan biaya (jumlah insiden, nilai rupiah):
   * di sana nol punya arti, dan sumbu yang dipotong membuat kenaikan dari 4
   * ke 5 insiden terlihat seperti lonjakan dua kali lipat.
   *
   * SALAH untuk KPI berindeks yang bergerak di rentang sempit (indeks
   * kepuasan 82 -> 88, persentase 93 -> 95). Dipaksa mulai dari nol,
   * seluruh pergerakannya tergencet jadi garis datar, dan grafik tren yang
   * selalu datar tidak memberi tahu apa pun — pembaca berhenti melihatnya.
   */
  zeroBased?: boolean;
}) {
  if (points.length === 0) return <ChartEmpty />;

  const values = points.map((p) => p.value);
  const rawMax = Math.max(...values);
  const rawMin = Math.min(...values);
  // Sedikit ruang di atas dan bawah supaya titik tertinggi dan terendah tidak
  // menempel persis di tepi bidang gambar.
  const padding = (rawMax - rawMin) * 0.12;
  const max = zeroBased ? rawMax : rawMax + padding;
  const min = zeroBased ? Math.min(rawMin, 0) : rawMin - padding;
  // Rentang nol (semua nilai sama, termasuk semuanya nol) akan membuat
  // pembagian di bawah menghasilkan NaN dan garisnya hilang tanpa jejak.
  const span = max - min || 1;
  const innerW = LINE_W - PAD_L - PAD_R;
  const innerH = LINE_H - PAD_T - PAD_B;
  const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;

  const coords = points.map((point, index) => ({
    x: PAD_L + index * stepX,
    y: PAD_T + innerH - ((point.value - min) / span) * innerH,
    point,
  }));

  const line = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const area = `${line} L${coords[coords.length - 1].x.toFixed(1)},${(PAD_T + innerH).toFixed(1)} L${coords[0].x.toFixed(1)},${(PAD_T + innerH).toFixed(1)} Z`;

  // Label sumbu X diberi jarak supaya tidak bertumpuk pada deret 12 bulan di
  // widget selebar satu kolom.
  const labelEvery = points.length > 8 ? 3 : points.length > 5 ? 2 : 1;

  // Label ditempatkan sebagai HTML DI LUAR svg, bukan sebagai <text> di
  // dalamnya. Grafiknya memakai preserveAspectRatio="none" supaya garisnya
  // memenuhi lebar widget berapa pun — dan peregangan itu ikut mengenai
  // setiap elemen di dalam svg, termasuk hurufnya, sehingga label bulan
  // tampak melar mengikuti lebar kartu. Menempatkannya di luar membuat
  // hurufnya tetap tegak tanpa perlu membatalkan transformasi apa pun.
  return (
    <div className="qhse-chart-wrap">
      <svg
        className="qhse-chart"
        viewBox={`0 0 ${LINE_W} ${LINE_H - PAD_B}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={ariaLabel}
      >
        <defs>
          <linearGradient id="qhse-chart-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--qhse-brand-bright)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--qhse-brand-bright)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#qhse-chart-area)" />
        <path
          d={line}
          fill="none"
          stroke="var(--qhse-brand)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {coords.map((c, index) => (
          <circle
            key={c.point.label}
            cx={c.x}
            cy={c.y}
            r={index === coords.length - 1 ? 3.5 : 2}
            fill={index === coords.length - 1 ? "var(--qhse-brand)" : "var(--qhse-surface-1)"}
            stroke="var(--qhse-brand)"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          >
            <title>{`${c.point.label}: ${compactNumber(c.point.value)}`}</title>
          </circle>
        ))}
      </svg>
      <div className="qhse-chart-axis" aria-hidden="true">
        {coords.map((c, index) => (
          <span key={`l-${c.point.label}`} style={{ left: `${(c.x / LINE_W) * 100}%` }}>
            {index % labelEvery === 0 || index === coords.length - 1 ? shortMonthLabel(c.point.label) : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grafik batang horizontal — dipakai untuk komposisi berkategori
// ---------------------------------------------------------------------------

export function BarList({ slices, ariaLabel }: { slices: ChartSlice[]; ariaLabel: string }) {
  if (slices.length === 0) return <ChartEmpty />;
  const max = Math.max(...slices.map((s) => s.value), 1);
  const total = slices.reduce((sum, s) => sum + s.value, 0);

  // Batang horizontal, BUKAN batang vertikal: nama kategori di sini panjang
  // ("Pending issuer approval", "Environmental spill") dan pada batang
  // vertikal label semacam itu harus dimiringkan atau dipotong. Sumbu
  // horizontal memberi setiap label satu baris penuh.
  return (
    <ul className="qhse-barlist" aria-label={ariaLabel}>
      {slices.map((slice) => (
        <li key={slice.label} className="qhse-barlist__row">
          <span className="qhse-barlist__label" title={slice.label}>
            {slice.label}
          </span>
          <span className="qhse-barlist__track">
            <span
              className="qhse-barlist__fill"
              style={{ width: `${(slice.value / max) * 100}%`, background: slice.color }}
            />
          </span>
          <span className="qhse-barlist__value">
            {compactNumber(slice.value)}
            <span className="qhse-barlist__share">{total > 0 ? `${Math.round((slice.value / total) * 100)}%` : "—"}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Donat
// ---------------------------------------------------------------------------

const DONUT = 120;
const DONUT_R = 46;
const DONUT_STROKE = 20;

export function DonutChart({ slices, ariaLabel }: { slices: ChartSlice[]; ariaLabel: string }) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  if (slices.length === 0 || total === 0) return <ChartEmpty />;

  const circumference = 2 * Math.PI * DONUT_R;
  // Celah tipis antar irisan. Warna irisan diturunkan dari MAKNA statusnya,
  // jadi dua kategori yang sama-sama "baik" (mis. Closed dan Active pada izin
  // kerja) memang mendapat hijau yang sama — dan tanpa celah, keduanya
  // menyatu jadi satu busur, sehingga donatnya terbaca seolah satu kategori
  // menguasai 89% padahal isinya dua. Memaksa warnanya berbeda bukan jalan
  // keluarnya: itu akan membuat warna berhenti berarti apa pun.
  const GAP = 1.5;
  let offset = 0;

  return (
    <div className="qhse-donut">
      <svg viewBox={`0 0 ${DONUT} ${DONUT}`} role="img" aria-label={ariaLabel} className="qhse-donut__svg">
        <g transform={`rotate(-90 ${DONUT / 2} ${DONUT / 2})`}>
          {slices.map((slice) => {
            const fraction = slice.value / total;
            const full = fraction * circumference;
            const dash = slices.length > 1 ? Math.max(full - GAP, 0.5) : full;
            const circle = (
              <circle
                key={slice.label}
                cx={DONUT / 2}
                cy={DONUT / 2}
                r={DONUT_R}
                fill="none"
                stroke={slice.color}
                strokeWidth={DONUT_STROKE}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
              >
                <title>{`${slice.label}: ${compactNumber(slice.value)} (${Math.round(fraction * 100)}%)`}</title>
              </circle>
            );
            offset += full;
            return circle;
          })}
        </g>
        <text x={DONUT / 2} y={DONUT / 2 - 2} className="qhse-donut__total" textAnchor="middle">
          {compactNumber(total)}
        </text>
        <text x={DONUT / 2} y={DONUT / 2 + 13} className="qhse-donut__caption" textAnchor="middle">
          total
        </text>
      </svg>
      <ul className="qhse-donut__legend">
        {slices.map((slice) => (
          <li key={slice.label}>
            <span className="qhse-donut__swatch" style={{ background: slice.color }} aria-hidden="true" />
            <span className="qhse-donut__name" title={slice.label}>
              {slice.label}
            </span>
            <span className="qhse-donut__count">{compactNumber(slice.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bullet chart — capaian terhadap target, untuk Balanced Scorecard
// ---------------------------------------------------------------------------

export interface BulletChartProps {
  /** Nilai yang dicapai sekarang. */
  actual: number;
  /** Nilai target periode berjalan. */
  target: number;
  /** Titik awal periode; digambar sebagai penanda pembanding. */
  baseline?: number | null;
  /** Warna batang capaian — ditentukan pemanggil dari status KPI. */
  color: string;
  ariaLabel: string;
}

/**
 * Bullet chart (Stephen Few) dipilih ketimbang gauge setengah lingkaran:
 * gauge memakan tinggi besar untuk satu angka, dan 17 gauge berjajar di satu
 * halaman tidak bisa dibandingkan satu sama lain karena masing-masing punya
 * skala sendiri. Bullet chart tingginya satu baris, dan garis target pada
 * posisi yang sama di setiap baris membuat KPI yang tertinggal langsung
 * terlihat saat mata menyapu ke bawah.
 */
export function BulletChart({ actual, target, baseline, color, ariaLabel }: BulletChartProps) {
  // Skala dibuat memuat ketiga nilai; kalau capaian melampaui target, target
  // tetap terlihat di dalam bidang gambar.
  const upper = Math.max(actual, target, baseline ?? 0) * 1.1 || 1;
  const pct = (value: number) => `${Math.max(0, Math.min(100, (value / upper) * 100))}%`;

  return (
    <div className="qhse-bullet" role="img" aria-label={ariaLabel}>
      <div className="qhse-bullet__track">
        <span className="qhse-bullet__fill" style={{ width: pct(actual), background: color }} />
        {baseline !== null && baseline !== undefined && (
          <span className="qhse-bullet__baseline" style={{ left: pct(baseline) }} title={`Baseline ${compactNumber(baseline)}`} />
        )}
        <span className="qhse-bullet__target" style={{ left: pct(target) }} title={`Target ${compactNumber(target)}`} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

/**
 * Keadaan kosong DIBEDAKAN dari keadaan gagal memuat, dan keduanya dibedakan
 * dari keadaan sedang memuat. Satu widget abu-abu yang berarti tiga hal
 * berbeda adalah cara tercepat membuat orang berhenti mempercayai
 * dashboardnya.
 */
export function ChartEmpty({ message = "Belum ada data pada periode ini." }: { message?: string }) {
  return <p className="qhse-chart__empty">{message}</p>;
}
