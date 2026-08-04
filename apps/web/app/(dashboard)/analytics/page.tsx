"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BarList, Button, DonutChart, LineChart, StatusBadge } from "@qhse/ui-components";
import { ApiError } from "../../../lib/api-client";
import { useLocale } from "../../../lib/locale";
import {
  DEFAULT_ANALYTICS_WIDGETS,
  defaultAnalyticsLayout,
  fetchCatalog,
  fetchLayout,
  fetchMetric,
  formatMetricValue,
  saveLayout,
  sliceColor,
  sliceLabel,
  type AnalyticsLayout,
  type MetricCatalogEntry,
  type MetricResult,
} from "../../../lib/analytics";
import "../dashboards.css";

// Dashboard analitik yang susunannya diatur pengguna.
//
// Tiga hal yang membentuk berkas ini:
//
// 1. SUSUNAN DISIMPAN DI SERVER, bukan di localStorage. Susunan di
//    localStorage hilang begitu orang membuka aplikasi dari laptop lain —
//    dan yang paling sering terjadi saat presentasi justru itu: disusun di
//    satu mesin, ditampilkan dari mesin lain.
//
// 2. SETIAP WIDGET MEMUAT DIRINYA SENDIRI. Tidak ada satu permintaan besar
//    yang mengembalikan seluruh metrik sekaligus. Konsekuensinya satu widget
//    yang gagal hanya menggagalkan dirinya sendiri, dan sisanya tetap
//    tampil — kebalikan dari halaman yang seluruhnya kosong karena satu
//    agregat bermasalah.
//
// 3. PERIODE YANG TIDAK BERLAKU DINYATAKAN DI WIDGETNYA. Sebagian metrik
//    adalah potret saat ini (status dokumen, status kontraktor) dan tidak
//    terpengaruh penyaring periode sama sekali. Widget semacam itu
//    mengatakannya sendiri alih-alih diam — pembaca yang mengira penyaringnya
//    berlaku akan menyimpulkan angka yang salah tanpa punya cara mengetahuinya.

type WidgetState =
  | { kind: "loading" }
  | { kind: "ok"; result: MetricResult }
  | { kind: "error"; message: string };

type SaveState = "idle" | "saving" | "saved" | "error";

export default function AnalyticsPage() {
  const [catalog, setCatalog] = useState<MetricCatalogEntry[] | null>(null);
  const [layout, setLayout] = useState<AnalyticsLayout | null>(null);
  const [results, setResults] = useState<Record<string, WidgetState>>({});
  const [editing, setEditing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const { locale, t } = useLocale();
  const [loadError, setLoadError] = useState<string | null>(null);

  // Penyimpanan pertama DILEWATI. Tanpa penjaga ini, susunan bawaan akan
  // langsung tertulis ke server saat halaman pertama kali dibuka, sehingga
  // "belum pernah disusun" berubah jadi "sudah disusun" tanpa pengguna
  // melakukan apa pun — dan perubahan bawaan di kemudian hari tidak akan
  // pernah sampai ke mereka.
  const hydrated = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchCatalog(locale), fetchLayout<AnalyticsLayout>("analytics")])
      .then(([entries, stored]) => {
        if (cancelled) return;
        const known = new Set(entries.map((entry) => entry.key));
        const fallback = defaultAnalyticsLayout();
        const saved = stored.layout;
        // Widget yang kuncinya tidak ada lagi di katalog DIBUANG saat dibaca,
        // bukan ditolak saat disimpan. Katalog bisa menyusut ketika sebuah
        // metrik dicabut, dan susunan lama yang menyebutnya tidak boleh
        // membuat seluruh halaman gagal.
        const widgets = Array.isArray(saved?.widgets)
          ? saved.widgets.filter((widget) => known.has(widget.key))
          : fallback.widgets.filter((widget) => known.has(widget.key));
        setCatalog(entries);
        setLayout({
          widgets: widgets.length > 0 ? widgets : fallback.widgets.filter((w) => known.has(w.key)),
          period: saved?.period?.from && saved?.period?.to ? saved.period : fallback.period,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(error instanceof ApiError ? error.message : t("API tidak terjangkau.", "API unreachable."));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Memuat ulang seluruh widget setiap kali daftar kunci atau periodenya
  // berubah. Daftar kunci digabung jadi satu string supaya efek ini tidak
  // ikut berjalan saat yang berubah hanya lebar widget — lebar tidak
  // mengubah angkanya sama sekali.
  const widgetKeys = layout?.widgets.map((widget) => widget.key).join(",") ?? "";
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
          const message = error instanceof ApiError ? `HTTP ${error.status}` : t("API tidak terjangkau", "API unreachable");
          setResults((prev) => ({ ...prev, [key]: { kind: "error", message } }));
        });
    }
    return () => {
      cancelled = true;
    };
  }, [widgetKeys, periodFrom, periodTo]);

  // Simpan otomatis, ditunda 700 ms. Menggeser widget tiga kali berturut-turut
  // seharusnya menghasilkan satu penyimpanan, bukan tiga.
  useEffect(() => {
    if (!layout) return;
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveLayout("analytics", layout)
        .then(() => setSaveState("saved"))
        .catch(() => setSaveState("error"));
    }, 700);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [layout]);

  const catalogByKey = useMemo(() => new Map((catalog ?? []).map((entry) => [entry.key, entry])), [catalog]);

  const move = useCallback((from: number, to: number) => {
    setLayout((prev) => {
      if (!prev) return prev;
      if (to < 0 || to >= prev.widgets.length || from === to) return prev;
      const widgets = [...prev.widgets];
      const [moved] = widgets.splice(from, 1);
      widgets.splice(to, 0, moved);
      return { ...prev, widgets };
    });
  }, []);

  const setWidth = useCallback((key: string, width: 1 | 2) => {
    setLayout((prev) =>
      prev ? { ...prev, widgets: prev.widgets.map((w) => (w.key === key ? { ...w, width } : w)) } : prev,
    );
  }, []);

  const remove = useCallback((key: string) => {
    setLayout((prev) => (prev ? { ...prev, widgets: prev.widgets.filter((w) => w.key !== key) } : prev));
  }, []);

  const add = useCallback((key: string) => {
    setLayout((prev) => {
      if (!prev || prev.widgets.some((w) => w.key === key)) return prev;
      return { ...prev, widgets: [...prev.widgets, { key, width: 1 }] };
    });
  }, []);

  const resetLayout = useCallback(() => {
    setLayout((prev) => (prev ? { ...prev, widgets: [...DEFAULT_ANALYTICS_WIDGETS] } : prev));
  }, []);

  if (loadError) {
    return (
      <section>
        <PageHeader />
        <p className="qhse-dash__error">Gagal memuat dashboard: {loadError}</p>
      </section>
    );
  }

  if (!layout || !catalog) {
    return (
      <section>
        <PageHeader />
        <p className="qhse-dash__muted">Memuat…</p>
      </section>
    );
  }

  const chosen = new Set(layout.widgets.map((widget) => widget.key));

  return (
    <section>
      <PageHeader />

      <div className="qhse-dash__toolbar">
        <div className="qhse-dash__period">
          <label htmlFor="dari">{t("Dari", "From")}</label>
          <input
            id="dari"
            type="date"
            value={layout.period.from}
            max={layout.period.to}
            onChange={(event) => setLayout({ ...layout, period: { ...layout.period, from: event.target.value } })}
          />
          <label htmlFor="sampai">{t("sampai", "to")}</label>
          <input
            id="sampai"
            type="date"
            value={layout.period.to}
            min={layout.period.from}
            onChange={(event) => setLayout({ ...layout, period: { ...layout.period, to: event.target.value } })}
          />
        </div>
        <span className="qhse-dash__spacer" />
        <SaveIndicator state={saveState} />
        <Button variant={editing ? "accent" : "default"} onClick={() => setEditing((value) => !value)}>
          {editing ? t("Selesai menyusun", "Done arranging") : t("Susun dashboard", "Arrange dashboard")}
        </Button>
      </div>

      {editing && (
        <div className="qhse-dash__editbar">
          <p className="qhse-dash__edithint">
            {t(
              "Seret kartu untuk memindahkannya, atau pakai tombol ‹ ›. Tombol ⤢ mengubah lebar, ✕ melepas widget. Susunan tersimpan otomatis untuk akun Anda.",
              "Drag a card to move it, or use the ‹ › buttons. ⤢ changes the width, ✕ removes the widget. The layout is saved automatically for your account.",
            )}
          </p>
          <Button variant="default" onClick={() => setPickerOpen((value) => !value)}>
            {pickerOpen
              ? t("Tutup katalog", "Close catalogue")
              : t(`Tambah widget (${catalog.length - chosen.size} tersedia)`, `Add widget (${catalog.length - chosen.size} available)`)}
          </Button>
          <Button variant="default" onClick={resetLayout}>
            {t("Kembalikan bawaan", "Restore defaults")}
          </Button>
        </div>
      )}

      {editing && pickerOpen && <WidgetPicker catalog={catalog} chosen={chosen} onAdd={add} onRemove={remove} />}

      {layout.widgets.length === 0 ? (
        <p className="qhse-dash__muted">
          {t("Belum ada widget. Buka", "No widgets yet. Open")}{" "}
          <strong>{t("Susun dashboard → Tambah widget", "Arrange dashboard → Add widget")}</strong>{" "}
          {t(`untuk memilih dari ${catalog.length} metrik yang tersedia.`, `to choose from the ${catalog.length} available metrics.`)}
        </p>
      ) : (
        <div className="qhse-dash__grid">
          {layout.widgets.map((widget, index) => {
            const entry = catalogByKey.get(widget.key);
            if (!entry) return null;
            return (
              <MetricWidget
                key={widget.key}
                index={index}
                total={layout.widgets.length}
                width={widget.width}
                entry={entry}
                state={results[widget.key]}
                editing={editing}
                onMove={move}
                onWidth={setWidth}
                onRemove={remove}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

function PageHeader() {
  const { t } = useLocale();
  return (
    <header className="qhse-page__header">
      <div>
        <p className="qhse-page__eyebrow">{t("Analitik", "Analytics")}</p>
        <h1 className="qhse-page__title">{t("Dashboard Analitik", "Analytics Dashboard")}</h1>
        <p className="qhse-page__subtitle">
          {t(
            "Angka dihitung langsung dari data tenant yang sedang aktif. Pilih widget yang Anda perlukan dan susun sendiri urutannya.",
            "Figures are computed directly from the active tenant's data. Pick the widgets you need and arrange them yourself.",
          )}
        </p>
      </div>
    </header>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  const { t } = useLocale();
  if (state === "idle") return null;
  const text =
    state === "saving"
      ? t("Menyimpan susunan…", "Saving layout…")
      : state === "saved"
        ? t("Susunan tersimpan", "Layout saved")
        : t("Susunan gagal disimpan", "Layout could not be saved");
  return <span className={`qhse-dash__save qhse-dash__save--${state}`}>{text}</span>;
}

function WidgetPicker({
  catalog,
  chosen,
  onAdd,
  onRemove,
}: {
  catalog: MetricCatalogEntry[];
  chosen: Set<string>;
  onAdd: (key: string) => void;
  onRemove: (key: string) => void;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, MetricCatalogEntry[]>();
    for (const entry of catalog) {
      if (!map.has(entry.group)) map.set(entry.group, []);
      map.get(entry.group)!.push(entry);
    }
    return [...map.entries()];
  }, [catalog]);

  return (
    <div className="qhse-picker">
      {groups.map(([group, entries]) => (
        <div key={group} className="qhse-picker__group">
          <h3 className="qhse-picker__heading">{group}</h3>
          <ul className="qhse-picker__list">
            {entries.map((entry) => {
              const active = chosen.has(entry.key);
              return (
                <li key={entry.key}>
                  <label className={`qhse-picker__item${active ? " qhse-picker__item--on" : ""}`}>
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => (active ? onRemove(entry.key) : onAdd(entry.key))}
                    />
                    <span>
                      <span className="qhse-picker__title">{entry.title}</span>
                      <span className="qhse-picker__caption">{entry.caption}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function MetricWidget({
  index,
  total,
  width,
  entry,
  state,
  editing,
  onMove,
  onWidth,
  onRemove,
}: {
  index: number;
  total: number;
  width: 1 | 2;
  entry: MetricCatalogEntry;
  state: WidgetState | undefined;
  editing: boolean;
  onMove: (from: number, to: number) => void;
  onWidth: (key: string, width: 1 | 2) => void;
  onRemove: (key: string) => void;
}) {
  const { t } = useLocale();
  return (
    <article
      className={`qhse-widget qhse-widget--w${width}${editing ? " qhse-widget--editing" : ""}`}
      draggable={editing}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", String(index));
        event.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={(event) => {
        if (editing) event.preventDefault();
      }}
      onDrop={(event) => {
        if (!editing) return;
        event.preventDefault();
        const from = Number(event.dataTransfer.getData("text/plain"));
        if (Number.isInteger(from)) onMove(from, index);
      }}
    >
      <header className="qhse-widget__head">
        <div className="qhse-widget__titles">
          <h3 className="qhse-widget__title">{entry.title}</h3>
          <p className="qhse-widget__caption">{entry.caption}</p>
        </div>
        {editing && (
          <div className="qhse-widget__tools">
            <button type="button" aria-label={t("Pindah ke kiri", "Move left")} disabled={index === 0} onClick={() => onMove(index, index - 1)}>
              ‹
            </button>
            <button
              type="button"
              aria-label={t("Pindah ke kanan", "Move right")}
              disabled={index === total - 1}
              onClick={() => onMove(index, index + 1)}
            >
              ›
            </button>
            <button
              type="button"
              aria-label={width === 1 ? t("Perlebar", "Widen") : t("Persempit", "Narrow")}
              onClick={() => onWidth(entry.key, width === 1 ? 2 : 1)}
            >
              ⤢
            </button>
            <button type="button" aria-label={t("Lepas widget", "Remove widget")} onClick={() => onRemove(entry.key)}>
              ✕
            </button>
          </div>
        )}
      </header>

      <WidgetBody entry={entry} state={state} />

      <footer className="qhse-widget__foot">
        {state?.kind === "ok" && (
          <span>
            {entry.periodApplies
              ? t(
                  `Periode ${state.result.period.from} s.d. ${state.result.period.to}`,
                  `Period ${state.result.period.from} — ${state.result.period.to}`,
                )
              : t("Potret saat ini — tidak terpengaruh penyaring periode", "Current snapshot — not affected by the period filter")}
          </span>
        )}
      </footer>
    </article>
  );
}

function WidgetBody({ entry, state }: { entry: MetricCatalogEntry; state: WidgetState | undefined }) {
  const { locale, t } = useLocale();
  if (!state || state.kind === "loading")
    return <p className="qhse-widget__placeholder">{t("Memuat…", "Loading…")}</p>;
  if (state.kind === "error") {
    return (
      <p className="qhse-widget__placeholder qhse-widget__placeholder--error">
        {t(`Gagal memuat (${state.message}).`, `Failed to load (${state.message}).`)}
      </p>
    );
  }

  const result = state.result;

  if (result.kind === "scalar") {
    const value = result.value ?? 0;
    // `tone: "inverse"` menandai metrik yang makin besar makin buruk (CAPA
    // lewat tenggat, temuan belum ditutup). Angka nol pada metrik semacam itu
    // adalah kabar baik dan diberi lencana hijau; pada metrik biasa, nol
    // tidak berarti apa-apa dan tidak diberi lencana sama sekali.
    const badge = entry.tone === "inverse" ? (value === 0 ? "good" : value <= 5 ? "warning" : "serious") : null;
    return (
      <div className="qhse-widget__scalar">
        <span className="qhse-widget__number">{formatMetricValue(value, entry.format, locale)}</span>
        <span className="qhse-widget__unit">{entry.format === "percent" ? "" : entry.unit}</span>
        {badge && (
          <span className="qhse-widget__badge">
            <StatusBadge tone={badge} label={value === 0 ? t("Bersih", "Clear") : t("Perlu tindakan", "Needs action")} />
          </span>
        )}
      </div>
    );
  }

  if (result.kind === "series") {
    const points = result.points ?? [];
    const total = points.reduce((sum, point) => sum + point.value, 0);
    return (
      <div className="qhse-widget__series">
        <div className="qhse-widget__seriestotal">
          <span className="qhse-widget__number">{formatMetricValue(total, entry.format, locale)}</span>
          <span className="qhse-widget__unit">{entry.format === "currency" ? t("total", "total") : t(`${entry.unit} total`, `${entry.unit} total`)}</span>
        </div>
        <LineChart points={points} ariaLabel={entry.title} />
      </div>
    );
  }

  const slices = (result.slices ?? []).map((slice, index) => ({
    label: sliceLabel(slice.code),
    value: slice.value,
    color: sliceColor(slice.code, index),
  }));
  // Donat untuk komposisi yang sedikit irisannya, daftar batang untuk yang
  // banyak: donat dengan delapan irisan tidak bisa dibaca, dan legendanya
  // memakan lebih banyak ruang daripada grafiknya sendiri.
  return slices.length <= 4 ? (
    <DonutChart slices={slices} ariaLabel={entry.title} />
  ) : (
    <BarList slices={slices} ariaLabel={entry.title} />
  );
}
