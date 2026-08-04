import { apiFetch } from "./api-client";
import { statusTone, humanizeEnum } from "./status-tone";

// Tipe dan pemuat data untuk dashboard analitik & Balanced Scorecard.
//
// KATALOG WIDGET DATANG DARI SERVER, tidak disalin ke sini. Registri modul
// (lib/modules.ts) memang digandakan di kedua sisi karena memuat hal yang
// hanya diketahui klien — judul kolom, urutan field, pesan kosong. Katalog
// metrik tidak begitu: satu-satunya isinya adalah metrik apa yang bisa
// DIHITUNG, dan itu sepenuhnya urusan server. Menyalinnya ke sini akan
// menghasilkan menu "tambah widget" yang menawarkan metrik yang kemudian
// gagal dimuat — persis jenis kesalahan yang paling membingungkan pemakai,
// karena pilihannya ada di layar dan tetap tidak bisa dipakai.

export type MetricKind = "scalar" | "series" | "breakdown";

export interface MetricCatalogEntry {
  key: string;
  title: string;
  caption: string;
  group: string;
  kind: MetricKind;
  unit: string;
  format: "currency" | "percent" | null;
  /** "inverse" = makin besar makin buruk. */
  tone: "inverse" | null;
  periodApplies: boolean;
}

export interface MetricResult extends MetricCatalogEntry {
  period: { from: string; to: string };
  value?: number;
  points?: Array<{ label: string; value: number }>;
  slices?: Array<{ code: string; value: number }>;
}

export interface ScorecardObjective {
  id: string;
  objectiveCode: string;
  objectiveTitle: string;
  description: string | null;
  isoClauseRef: string;
  kpiMetricName: string;
  targetValue: number | null;
  targetUnit: string | null;
  baselineValue: number | null;
  currentValue: number | null;
  measurementFrequency: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  bscPerspective: string | null;
  weight: number | null;
  ownerLabel: string | null;
  direction: "HIGHER_IS_BETTER" | "LOWER_IS_BETTER";
  attainmentPercent: number | null;
  score: number | null;
  trend: Array<{ label: string; value: number }>;
}

export interface ScorecardPerspective {
  code: string;
  title: string;
  caption: string;
  objectives: ScorecardObjective[];
  score: number | null;
  weightTotal: number;
}

export interface Scorecard {
  perspectives: ScorecardPerspective[];
  unmapped: ScorecardObjective[];
  totalScore: number | null;
  objectiveCount: number;
}

export function fetchCatalog(): Promise<MetricCatalogEntry[]> {
  return apiFetch<MetricCatalogEntry[]>("/analytics/catalog");
}

export function fetchMetric(key: string, period: { from: string; to: string }): Promise<MetricResult> {
  return apiFetch<MetricResult>(`/analytics/${key}`, { query: { from: period.from, to: period.to } });
}

export function fetchScorecard(): Promise<Scorecard> {
  return apiFetch<Scorecard>("/scorecard");
}

// --- Tata letak --------------------------------------------------------------

export interface AnalyticsLayout {
  widgets: Array<{ key: string; width: 1 | 2 }>;
  period: { from: string; to: string };
}

export interface ScorecardLayout {
  /** Perspektif yang disembunyikan pengguna, dengan kode BSC-nya. */
  hidden: string[];
  /** Urutan perspektif; kode yang tidak disebut menyusul di belakang. */
  order: string[];
  showTrend: boolean;
}

export type DashboardKey = "analytics" | "scorecard" | "executive";

export function fetchLayout<T>(key: DashboardKey): Promise<{ key: string; layout: T | null }> {
  return apiFetch<{ key: string; layout: T | null }>(`/dashboard-layouts/${key}`);
}

export function saveLayout<T>(key: DashboardKey, layout: T): Promise<unknown> {
  return apiFetch(`/dashboard-layouts/${key}`, { method: "PUT", body: { layout } });
}

// --- Bawaan ------------------------------------------------------------------

export function defaultPeriod(): { from: string; to: string } {
  const today = new Date();
  const to = today.toISOString().slice(0, 10);
  const from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 11, 1)).toISOString().slice(0, 10);
  return { from, to };
}

/**
 * Susunan bawaan halaman analitik: delapan widget yang bersama-sama menjawab
 * "bagaimana kondisi QHSE bulan ini" tanpa perlu diatur dulu.
 *
 * Sengaja BUKAN seluruh katalog. Dashboard yang dibuka pertama kali dengan 32
 * widget sekaligus tidak bisa dibaca siapa pun, dan orang yang melihatnya
 * menyimpulkan produknya berisik — bukan menyimpulkan bahwa ia bisa
 * menyusunnya sendiri.
 */
export const DEFAULT_ANALYTICS_WIDGETS: AnalyticsLayout["widgets"] = [
  { key: "incident-trend", width: 2 },
  { key: "incident-by-classification", width: 1 },
  { key: "capa-by-status", width: 1 },
  { key: "capa-overdue", width: 1 },
  { key: "capa-closure-rate", width: 1 },
  { key: "inspection-pass-rate", width: 1 },
  { key: "audit-finding-open", width: 1 },
  { key: "permit-by-status", width: 1 },
  { key: "hira-risk-after", width: 1 },
];

export function defaultAnalyticsLayout(): AnalyticsLayout {
  return { widgets: [...DEFAULT_ANALYTICS_WIDGETS], period: defaultPeriod() };
}

export function defaultScorecardLayout(): ScorecardLayout {
  return { hidden: [], order: [], showTrend: true };
}

// --- Penyajian ---------------------------------------------------------------

const TONE_COLOR: Record<string, string> = {
  good: "var(--qhse-status-good)",
  warning: "var(--qhse-status-warning)",
  serious: "var(--qhse-status-serious)",
  critical: "var(--qhse-status-critical)",
};

/**
 * Warna irisan diambil dari tone status kalau kodenya memang status yang
 * dikenal (statusTone sudah memetakan seluruh enum di skema); sisanya memakai
 * gradasi biru merek.
 *
 * Yang TIDAK dilakukan: menebak warna dari urutan irisan. Warna merah untuk
 * irisan ketiga hanya karena kebetulan ketiga akan memberi kesan bahaya pada
 * kategori yang netral — dan pembacanya tidak punya cara tahu bahwa warna itu
 * tidak berarti apa-apa.
 */
const NEUTRAL_RAMP = [
  "var(--qhse-brand)",
  "var(--qhse-brand-bright)",
  "var(--qhse-brand-light)",
  "var(--qhse-brand-navy-soft)",
  "var(--qhse-accent-soft)",
  "var(--qhse-text-muted)",
];

export function sliceColor(code: string, index: number): string {
  const tone = statusTone(code);
  if (tone) return TONE_COLOR[tone];
  return NEUTRAL_RAMP[index % NEUTRAL_RAMP.length];
}

export function sliceLabel(code: string): string {
  return humanizeEnum(code);
}

const CURRENCY = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const DECIMAL = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

export function formatMetricValue(value: number, format: MetricCatalogEntry["format"]): string {
  if (format === "currency") {
    // Nilai rupiah pada kartu KPI dipendekkan — "Rp852.000.000" memaksa
    // ukuran huruf hero mengecil sampai tidak lagi terbaca sebagai angka
    // utama, dan ketelitian sampai satuan rupiah tidak berarti apa pun untuk
    // angka sebesar itu.
    if (Math.abs(value) >= 1_000_000_000) return `Rp${DECIMAL.format(value / 1_000_000_000)} M`;
    if (Math.abs(value) >= 1_000_000) return `Rp${DECIMAL.format(value / 1_000_000)} jt`;
    return CURRENCY.format(value);
  }
  if (format === "percent") return `${DECIMAL.format(value)}%`;
  return DECIMAL.format(value);
}

/** Status skor perspektif/KPI -> tone StatusBadge. Ambangnya sama dengan yang
 * dipakai penyemai saat menetapkan status sasaran, jadi warna dan kata tidak
 * pernah bertentangan. */
export function scoreTone(score: number | null): "good" | "warning" | "serious" | "critical" | null {
  if (score === null) return null;
  if (score >= 100) return "good";
  if (score >= 90) return "good";
  if (score >= 75) return "warning";
  if (score >= 50) return "serious";
  return "critical";
}

export function scoreColor(score: number | null): string {
  const tone = scoreTone(score);
  return tone ? TONE_COLOR[tone] : "var(--qhse-text-muted)";
}
