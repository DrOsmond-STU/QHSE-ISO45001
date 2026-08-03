"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BulletChart, Button, LineChart, StatusBadge } from "@qhse/ui-components";
import { ApiError } from "../../../lib/api-client";
import {
  defaultScorecardLayout,
  fetchLayout,
  fetchScorecard,
  saveLayout,
  scoreColor,
  scoreTone,
  type Scorecard,
  type ScorecardLayout,
  type ScorecardObjective,
  type ScorecardPerspective,
} from "../../../lib/analytics";
import { humanizeEnum } from "../../../lib/status-tone";
import "../dashboards.css";

// Balanced Scorecard.
//
// Sumbernya sasaran mutu ISO 9001 klausul 6.2 yang memang wajib ada, bukan
// tabel KPI tersendiri — lihat banner migrasi 20260803120000. Yang bisa
// disusun pengguna di sini: urutan perspektif, perspektif mana yang
// ditampilkan, dan apakah grafik tren ikut digambar. Ketiganya tersimpan per
// akun, sama seperti susunan di halaman analitik.
//
// YANG SENGAJA TIDAK BISA DIUBAH PENGGUNA: bobot KPI dan targetnya. Keduanya
// data sasaran perusahaan, bukan preferensi tampilan — mengubahnya lewat
// dashboard berarti mengubah sasaran mutu tanpa melewati persetujuan, dan itu
// justru yang wajib terkendali menurut klausul yang sama.

const FREQUENCY_LABEL: Record<string, string> = {
  MONTHLY: "Bulanan",
  QUARTERLY: "Triwulanan",
  SEMI_ANNUAL: "Semesteran",
  ANNUAL: "Tahunan",
};

export default function ScorecardPage() {
  const [data, setData] = useState<Scorecard | null>(null);
  const [layout, setLayout] = useState<ScorecardLayout>(defaultScorecardLayout());
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hydrated = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchScorecard(), fetchLayout<ScorecardLayout>("scorecard")])
      .then(([scorecard, stored]) => {
        if (cancelled) return;
        setData(scorecard);
        if (stored.layout) {
          setLayout({
            hidden: Array.isArray(stored.layout.hidden) ? stored.layout.hidden : [],
            order: Array.isArray(stored.layout.order) ? stored.layout.order : [],
            showTrend: stored.layout.showTrend !== false,
          });
        }
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(cause instanceof ApiError ? cause.message : "API tidak terjangkau.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveLayout("scorecard", layout).catch(() => {
        /* Gagal menyimpan preferensi tampilan tidak boleh menutupi
           scorecard-nya sendiri; angkanya tetap benar dan tetap terlihat. */
      });
    }, 700);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [layout]);

  // Urutan tersimpan diterapkan lebih dulu; perspektif yang tidak disebut di
  // dalamnya menyusul dengan urutan aslinya, sehingga perspektif baru yang
  // ditambahkan kemudian tetap muncul alih-alih hilang diam-diam.
  const ordered = useMemo(() => {
    if (!data) return [];
    const byCode = new Map(data.perspectives.map((p) => [p.code, p]));
    const seen = new Set<string>();
    const result: ScorecardPerspective[] = [];
    for (const code of layout.order) {
      const found = byCode.get(code);
      if (found && !seen.has(code)) {
        result.push(found);
        seen.add(code);
      }
    }
    for (const perspective of data.perspectives) {
      if (!seen.has(perspective.code)) result.push(perspective);
    }
    return result;
  }, [data, layout.order]);

  const movePerspective = useCallback(
    (code: string, delta: number) => {
      const codes = ordered.map((p) => p.code);
      const index = codes.indexOf(code);
      const next = index + delta;
      if (index < 0 || next < 0 || next >= codes.length) return;
      const reordered = [...codes];
      const [moved] = reordered.splice(index, 1);
      reordered.splice(next, 0, moved);
      setLayout((prev) => ({ ...prev, order: reordered }));
    },
    [ordered],
  );

  const toggleHidden = useCallback((code: string) => {
    setLayout((prev) => ({
      ...prev,
      hidden: prev.hidden.includes(code) ? prev.hidden.filter((item) => item !== code) : [...prev.hidden, code],
    }));
  }, []);

  if (error) {
    return (
      <section>
        <ScorecardHeader />
        <p className="qhse-dash__error">Gagal memuat scorecard: {error}</p>
      </section>
    );
  }

  if (!data) {
    return (
      <section>
        <ScorecardHeader />
        <p className="qhse-dash__muted">Memuat…</p>
      </section>
    );
  }

  if (data.objectiveCount === 0) {
    return (
      <section>
        <ScorecardHeader />
        <p className="qhse-dash__muted">
          Belum ada sasaran mutu yang terdaftar, jadi scorecard belum bisa dihitung. Scorecard ini membaca sasaran mutu
          ISO 9001 klausul 6.2 — bukan daftar KPI tersendiri.
        </p>
      </section>
    );
  }

  const visible = ordered.filter((perspective) => !layout.hidden.includes(perspective.code));

  return (
    <section>
      <ScorecardHeader />

      <div className="qhse-dash__toolbar">
        <TotalScore score={data.totalScore} count={data.objectiveCount} />
        <span className="qhse-dash__spacer" />
        <label className="qhse-dash__switch">
          <input
            type="checkbox"
            checked={layout.showTrend}
            onChange={(event) => setLayout({ ...layout, showTrend: event.target.checked })}
          />
          Tampilkan grafik tren
        </label>
        <Button variant={editing ? "accent" : "default"} onClick={() => setEditing((value) => !value)}>
          {editing ? "Selesai menyusun" : "Susun perspektif"}
        </Button>
      </div>

      {editing && (
        <div className="qhse-dash__editbar">
          <p className="qhse-dash__edithint">
            Atur urutan perspektif dan sembunyikan yang tidak sedang ditinjau. Bobot dan target KPI tidak diubah dari
            sini — keduanya sasaran perusahaan yang perubahannya harus lewat persetujuan.
          </p>
          <div className="qhse-dash__chips">
            {ordered.map((perspective, index) => (
              <span key={perspective.code} className="qhse-chip">
                <button
                  type="button"
                  aria-label={`Naikkan ${perspective.title}`}
                  disabled={index === 0}
                  onClick={() => movePerspective(perspective.code, -1)}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="qhse-chip__name"
                  onClick={() => toggleHidden(perspective.code)}
                  aria-pressed={!layout.hidden.includes(perspective.code)}
                >
                  {layout.hidden.includes(perspective.code) ? "☐" : "☑"} {perspective.title}
                </button>
                <button
                  type="button"
                  aria-label={`Turunkan ${perspective.title}`}
                  disabled={index === ordered.length - 1}
                  onClick={() => movePerspective(perspective.code, 1)}
                >
                  ›
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {visible.length === 0 && <p className="qhse-dash__muted">Semua perspektif sedang disembunyikan.</p>}

      {visible.map((perspective) => (
        <PerspectiveBlock key={perspective.code} perspective={perspective} showTrend={layout.showTrend} />
      ))}

      {data.unmapped.length > 0 && (
        <div className="qhse-perspective">
          <header className="qhse-perspective__head">
            <div>
              <h2 className="qhse-perspective__title">Belum dipetakan ke perspektif</h2>
              <p className="qhse-perspective__caption">
                Sasaran ini terdaftar tapi belum ditempatkan di salah satu dari empat perspektif, jadi belum ikut
                menentukan skor. Ditampilkan terpisah agar tidak luput — bukan disembunyikan.
              </p>
            </div>
          </header>
          <div className="qhse-kpi-list">
            {data.unmapped.map((objective) => (
              <ObjectiveRow key={objective.id} objective={objective} showTrend={false} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function ScorecardHeader() {
  return (
    <header className="qhse-page__header">
      <div>
        <p className="qhse-page__eyebrow">Kinerja</p>
        <h1 className="qhse-page__title">Balanced Scorecard</h1>
        <p className="qhse-page__subtitle">
          Sasaran mutu ISO 9001 klausul 6.2 dikelompokkan ke empat perspektif. Skor tiap perspektif dihitung dari
          capaian terhadap target, ditimbang bobot masing-masing KPI.
        </p>
      </div>
    </header>
  );
}

function TotalScore({ score, count }: { score: number | null; count: number }) {
  return (
    <div className="qhse-total">
      <span className="qhse-total__label">Skor total</span>
      <span className="qhse-total__value" style={{ color: scoreColor(score) }}>
        {score === null ? "—" : score.toFixed(1)}
      </span>
      <span className="qhse-total__caption">rata-rata empat perspektif · {count} sasaran</span>
    </div>
  );
}

function PerspectiveBlock({ perspective, showTrend }: { perspective: ScorecardPerspective; showTrend: boolean }) {
  const tone = scoreTone(perspective.score);
  return (
    <div className="qhse-perspective">
      <header className="qhse-perspective__head">
        <div>
          <h2 className="qhse-perspective__title">{perspective.title}</h2>
          <p className="qhse-perspective__caption">{perspective.caption}</p>
        </div>
        <div className="qhse-perspective__score">
          <span className="qhse-perspective__number" style={{ color: scoreColor(perspective.score) }}>
            {perspective.score === null ? "—" : perspective.score.toFixed(1)}
          </span>
          {tone && <StatusBadge tone={tone} label={scoreWord(perspective.score)} />}
        </div>
      </header>

      {perspective.objectives.length === 0 ? (
        <p className="qhse-dash__muted">Belum ada sasaran pada perspektif ini.</p>
      ) : (
        <div className="qhse-kpi-list">
          {perspective.objectives.map((objective) => (
            <ObjectiveRow key={objective.id} objective={objective} showTrend={showTrend} />
          ))}
        </div>
      )}
    </div>
  );
}

function scoreWord(score: number | null): string {
  if (score === null) return "Belum terukur";
  if (score >= 100) return "Tercapai";
  if (score >= 90) return "Sesuai rencana";
  if (score >= 75) return "Berisiko";
  if (score >= 50) return "Melenceng";
  return "Jauh tertinggal";
}

function ObjectiveRow({ objective, showTrend }: { objective: ScorecardObjective; showTrend: boolean }) {
  const tone = scoreTone(objective.score);
  const unit = objective.targetUnit ?? "";
  return (
    <article className="qhse-kpi-row">
      <div className="qhse-kpi-row__main">
        <div className="qhse-kpi-row__ident">
          <span className="qhse-kpi-row__code">{objective.objectiveCode}</span>
          <h3 className="qhse-kpi-row__title">{objective.objectiveTitle}</h3>
          <p className="qhse-kpi-row__metric">{objective.kpiMetricName}</p>
        </div>

        <dl className="qhse-kpi-row__figures">
          <div>
            <dt>Baseline</dt>
            <dd>{formatFigure(objective.baselineValue, unit)}</dd>
          </div>
          <div>
            <dt>Capaian</dt>
            <dd className="qhse-kpi-row__actual">{formatFigure(objective.currentValue, unit)}</dd>
          </div>
          <div>
            <dt>Target</dt>
            <dd>{formatFigure(objective.targetValue, unit)}</dd>
          </div>
          <div>
            <dt>Bobot</dt>
            <dd>{objective.weight === null ? "—" : `${objective.weight}%`}</dd>
          </div>
        </dl>

        <div className="qhse-kpi-row__status">
          <span className="qhse-kpi-row__percent" style={{ color: scoreColor(objective.score) }}>
            {objective.attainmentPercent === null ? "—" : `${objective.attainmentPercent.toFixed(0)}%`}
          </span>
          {tone && <StatusBadge tone={tone} label={humanizeEnum(objective.status)} />}
        </div>
      </div>

      <BulletChart
        actual={objective.currentValue ?? 0}
        target={objective.targetValue ?? 0}
        baseline={objective.baselineValue}
        color={scoreColor(objective.score)}
        ariaLabel={`${objective.kpiMetricName}: capaian ${objective.currentValue} dari target ${objective.targetValue}`}
      />

      <p className="qhse-kpi-row__meta">
        {/* Arah "baik" tidak ada di basis data; ia disimpulkan dari target
            terhadap baseline. Dinyatakan di layar supaya pembaca tahu dasar
            perhitungan capaiannya — tanpa ini, capaian 167% pada sasaran yang
            angkanya turun terbaca seperti salah hitung. */}
        {objective.direction === "LOWER_IS_BETTER" ? "Makin rendah makin baik" : "Makin tinggi makin baik"}
        {" · "}
        {FREQUENCY_LABEL[objective.measurementFrequency] ?? humanizeEnum(objective.measurementFrequency)}
        {objective.ownerLabel ? ` · PIC ${objective.ownerLabel}` : ""}
        {` · ISO ${objective.isoClauseRef}`}
      </p>

      {showTrend && objective.trend.length > 0 && (
        <div className="qhse-kpi-row__trend">
          <LineChart points={objective.trend} ariaLabel={`Tren ${objective.kpiMetricName}`} zeroBased={false} />
        </div>
      )}
    </article>
  );
}

const NUMBER = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });

function formatFigure(value: number | null, unit: string): string {
  if (value === null) return "—";
  if (unit === "IDR") {
    if (Math.abs(value) >= 1_000_000_000) return `Rp${NUMBER.format(value / 1_000_000_000)} M`;
    if (Math.abs(value) >= 1_000_000) return `Rp${NUMBER.format(value / 1_000_000)} jt`;
    return `Rp${NUMBER.format(value)}`;
  }
  if (unit === "%") return `${NUMBER.format(value)}%`;
  return `${NUMBER.format(value)}${unit ? ` ${unit}` : ""}`;
}
