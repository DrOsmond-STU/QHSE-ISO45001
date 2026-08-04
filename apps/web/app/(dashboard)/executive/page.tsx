"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BarList, DonutChart, GaugeChart, LineChart, shortMonthLabel } from "@qhse/ui-components";
import { ApiError } from "../../../lib/api-client";
import { localeTag, useLocale } from "../../../lib/locale";
import {
  fetchCatalog,
  fetchLayout,
  fetchMetric,
  formatMetricValue,
  sliceColor,
  sliceLabel,
  type MetricCatalogEntry,
  type MetricResult,
} from "../../../lib/analytics";
import {
  GAUGE_SPEC,
  bandsLokal,
  defaultExecutiveLayout,
  type ExecutiveLayout,
  type ExecutiveWidget,
} from "../../../lib/executive";
import "./executive.css";

// Dashboard Eksekutif — hanya MENAMPILKAN.
//
// Penyusunannya ada di menu Pengaturan, bukan di halaman ini, dan itu
// keputusan yang disengaja: halaman ini dibuka di layar rapat dan sering
// diproyeksikan. Tombol "hapus widget" yang bisa tersenggol di depan direksi
// bukan kenyamanan, dan menyusun ulang dashboard bukan pekerjaan yang
// dilakukan sambil membaca angkanya.
//
// Konsekuensinya satu: halaman ini harus mengatakan DI MANA susunannya diatur,
// karena kalau tidak, orang akan menyimpulkan susunannya memang tidak bisa
// diubah.

type WidgetState =
  | { kind: "loading" }
  | { kind: "ok"; result: MetricResult }
  | { kind: "error"; message: string };

export default function ExecutivePage() {
  const { locale, t } = useLocale();
  const [catalog, setCatalog] = useState<MetricCatalogEntry[] | null>(null);
  const [layout, setLayout] = useState<ExecutiveLayout | null>(null);
  const [results, setResults] = useState<Record<string, WidgetState>>({});
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchCatalog(locale), fetchLayout<ExecutiveLayout>("executive")])
      .then(([entries, stored]) => {
        if (cancelled) return;
        const known = new Set(entries.map((entry) => entry.key));
        const bawaan = defaultExecutiveLayout(locale);
        const saved = stored.layout;
        // Widget yang metriknya tidak ada lagi dibuang saat DIBACA, bukan
        // ditolak saat disimpan — katalog boleh menyusut tanpa membuat
        // susunan lama menggagalkan seluruh halaman.
        const widgets = (Array.isArray(saved?.widgets) ? saved.widgets : bawaan.widgets).filter((w) =>
          known.has(w.key),
        );
        setCatalog(entries);
        setLayout({
          widgets: widgets.length > 0 ? widgets : bawaan.widgets.filter((w) => known.has(w.key)),
          period: saved?.period?.from && saved?.period?.to ? saved.period : bawaan.period,
          judul: saved?.judul || bawaan.judul,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(error instanceof ApiError ? error.message : t("API tidak terjangkau.", "API unreachable."));
      });
    return () => {
      cancelled = true;
    };
  }, [locale, t]);

  const widgetKeys = layout?.widgets.map((w) => w.key).join(",") ?? "";
  const periodFrom = layout?.period.from;
  const periodTo = layout?.period.to;

  useEffect(() => {
    if (!widgetKeys || !periodFrom || !periodTo) return;
    let cancelled = false;
    const keys = widgetKeys.split(",");
    setResults((prev) => {
      const next: Record<string, WidgetState> = {};
      for (const key of keys) next[key] = prev[key] ?? { kind: "loading" };
      return next;
    });
    for (const key of keys) {
      fetchMetric(key, { from: periodFrom, to: periodTo }, locale)
        .then((result) => {
          if (!cancelled) setResults((prev) => ({ ...prev, [key]: { kind: "ok", result } }));
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          const message = error instanceof ApiError ? error.message : t("gagal dimuat", "failed to load");
          setResults((prev) => ({ ...prev, [key]: { kind: "error", message } }));
        });
    }
    return () => {
      cancelled = true;
    };
  }, [widgetKeys, periodFrom, periodTo, locale, t]);

  const byKey = useMemo(() => new Map((catalog ?? []).map((entry) => [entry.key, entry])), [catalog]);

  if (loadError) return <p className="qhse-exec__bad">{loadError}</p>;
  if (!layout) return <p className="qhse-exec__kosong">{t("Memuat…", "Loading…")}</p>;

  return (
    <div className="qhse-exec">
      <header className="qhse-exec__head">
        <div>
          <h1 className="qhse-exec__title">{layout.judul}</h1>
          <p className="qhse-exec__periode">
            {t("Periode", "Period")} {layout.period.from} — {layout.period.to}
          </p>
        </div>
        <Link href="/settings/dashboard" className="qhse-exec__atur">
          {t("Atur komponen", "Configure widgets")}
        </Link>
      </header>

      <div className="qhse-exec__grid">
        {layout.widgets.map((widget) => (
          <Widget
            key={widget.key}
            widget={widget}
            entry={byKey.get(widget.key) ?? null}
            state={results[widget.key] ?? { kind: "loading" }}
          />
        ))}
      </div>
    </div>
  );
}

function Widget({
  widget,
  entry,
  state,
}: {
  widget: ExecutiveWidget;
  entry: MetricCatalogEntry | null;
  state: WidgetState;
}) {
  const { t } = useLocale();
  const kelas = `qhse-exec__card qhse-exec__card--w${widget.width}`;
  return (
    <section className={kelas}>
      <header className="qhse-exec__cardHead">
        <h2 className="qhse-exec__cardTitle">{entry?.title ?? widget.key}</h2>
        {entry?.caption && <p className="qhse-exec__cardCaption">{entry.caption}</p>}
      </header>
      {/* Badan dipisahkan dari pita kepala supaya jaraknya sendiri dan pita
          kepala bisa berlatar sampai ke tepi kartu. */}
      <div className="qhse-exec__badan">
        {state.kind === "loading" && <p className="qhse-exec__kosong">{t("Memuat…", "Loading…")}</p>}
        {state.kind === "error" && <p className="qhse-exec__bad">{state.message}</p>}
        {state.kind === "ok" && <Isi widget={widget} result={state.result} />}
        {/* Metrik yang TIDAK terpengaruh penyaring periode mengatakannya
            sendiri. Penyaring yang diam-diam tidak berlaku pada sebagian
            widget membuat pembacanya menyimpulkan angka yang salah tanpa
            punya cara mengetahuinya. */}
        {state.kind === "ok" && !state.result.periodApplies && (
          <p className="qhse-exec__catatan">
            {t("Potret saat ini — tidak mengikuti penyaring periode.", "Current snapshot — not affected by the period filter.")}
          </p>
        )}
      </div>
    </section>
  );
}

function Isi({ widget, result }: { widget: ExecutiveWidget; result: MetricResult }) {
  const { locale, t } = useLocale();
  const viz = widget.viz;

  if (viz === "gauge") {
    const spec = GAUGE_SPEC[result.key];
    if (!spec) return <p className="qhse-exec__bad">{t("Zona gauge belum ditetapkan untuk metrik ini.", "Gauge bands have not been defined for this metric.")}</p>;
    return (
      <GaugeChart
        // value === undefined terjadi ketika pembaginya belum terisi (mis.
        // LTIFR tanpa jam kerja). Dibedakan dari nol dengan sengaja: nol
        // berarti "tidak ada kecelakaan", kosong berarti "belum bisa dihitung".
        value={result.value ?? null}
        // Dua angka di belakang koma, bukan satu: LTIFR 1,04 dan 1,4 adalah
        // dua keadaan yang berbeda, dan formatMetricValue membulatkan
        // keduanya menjadi "1". Pada indikator kekerapan justru angka di
        // belakang koma itu yang dibandingkan orang antar periode.
        valueText={
          result.value === undefined
            ? undefined
            : result.format === "percent"
              ? `${result.value.toLocaleString(localeTag(locale), { maximumFractionDigits: 1 })}%`
              : result.value.toLocaleString(localeTag(locale), { maximumFractionDigits: 2 })
        }
        max={spec.max}
        bands={bandsLokal(spec.bands, locale)}
        // Satuan TIDAK diulang ketika sudah menempel pada angkanya — gauge
        // persentase sempat tercetak "70%" dengan baris "%" di bawahnya.
        label={result.format === "percent" ? undefined : result.unit}
        ariaLabel={result.title}
      />
    );
  }

  if (viz === "angka" || result.kind === "scalar") {
    const kosong = result.value === undefined || result.value === null;
    return (
      <div className="qhse-exec__angka">
        <span className={kosong ? "qhse-exec__nilai qhse-exec__nilai--kosong" : "qhse-exec__nilai"}>
          {kosong ? "—" : formatMetricValue(result.value as number, result.format, locale)}
        </span>
        <span className="qhse-exec__satuan">{kosong ? t("belum bisa dihitung", "not computable yet") : result.unit}</span>
      </div>
    );
  }

  if (viz === "garis" || result.kind === "series") {
    const points = (result.points ?? []).map((p) => ({ label: shortMonthLabel(p.label), value: p.value }));
    if (points.length === 0) return <p className="qhse-exec__kosong">{t("Belum ada data pada periode ini.", "No data in this period yet.")}</p>;
    return <LineChart points={points} ariaLabel={result.title} />;
  }

  const slices = (result.slices ?? []).map((slice, index) => ({
    label: sliceLabel(slice.code),
    value: slice.value,
    color: sliceColor(slice.code, index),
  }));
  if (slices.length === 0) return <p className="qhse-exec__kosong">{t("Belum ada data pada periode ini.", "No data in this period yet.")}</p>;
  return viz === "donat" ? (
    <DonutChart slices={slices} ariaLabel={result.title} />
  ) : (
    <BarList slices={slices} ariaLabel={result.title} />
  );
}
