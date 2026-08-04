"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@qhse/ui-components";
import { ApiError } from "../../../../lib/api-client";
import { fetchCatalog, fetchLayout, saveLayout, type MetricCatalogEntry } from "../../../../lib/analytics";
import {
  VIZ_LABEL,
  defaultExecutiveLayout,
  vizBawaan,
  vizPilihan,
  type ExecutiveLayout,
  type Viz,
} from "../../../../lib/executive";
import "./settings.css";

// Penyusun komponen Dashboard Eksekutif.
//
// TERPISAH DARI DASHBOARDNYA, dan itu bukan sekadar pilihan tata letak:
// dashboard eksekutif diproyeksikan di ruang rapat, dan kontrol "hapus" yang
// hidup di halaman yang sama akan tersenggol tepat ketika paling tidak boleh
// tersenggol.
//
// Yang bisa diatur di sini ada empat, dan keempatnya memang berbeda:
//   - komponen apa saja yang tampil, dan urutannya;
//   - lebar tiap komponen (satu atau dua kolom);
//   - WUJUD tiap komponen — angka besar, gauge berpita, batang, donat, garis;
//   - periode dan judul yang tercetak di kepala dashboard.

type SaveState = "idle" | "saving" | "saved" | "error";

export default function SettingsDashboardPage() {
  const [catalog, setCatalog] = useState<MetricCatalogEntry[] | null>(null);
  const [layout, setLayout] = useState<ExecutiveLayout | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tambahBuka, setTambahBuka] = useState(false);

  useEffect(() => {
    Promise.all([fetchCatalog(), fetchLayout<ExecutiveLayout>("executive")])
      .then(([entries, stored]) => {
        const known = new Set(entries.map((e) => e.key));
        const bawaan = defaultExecutiveLayout();
        const saved = stored.layout;
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
      .catch((error: unknown) =>
        setLoadError(error instanceof ApiError ? error.message : "API tidak terjangkau."),
      );
  }, []);

  const byKey = useMemo(() => new Map((catalog ?? []).map((e) => [e.key, e])), [catalog]);

  // Penyimpanan EKSPLISIT lewat tombol, bukan otomatis saat mengetik.
  // Menyimpan otomatis di halaman pengaturan berarti setiap langkah setengah
  // jadi ikut tersimpan — termasuk saat orang menghapus semua widget untuk
  // menyusun ulang dari awal, lalu menutup tabnya.
  async function simpan() {
    if (!layout) return;
    setSaveState("saving");
    try {
      await saveLayout<ExecutiveLayout>("executive", layout);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  function ubah(index: number, patch: Partial<ExecutiveLayout["widgets"][number]>) {
    setLayout((prev) =>
      prev
        ? { ...prev, widgets: prev.widgets.map((w, i) => (i === index ? { ...w, ...patch } : w)) }
        : prev,
    );
    setSaveState("idle");
  }

  function geser(index: number, arah: -1 | 1) {
    setLayout((prev) => {
      if (!prev) return prev;
      const tujuan = index + arah;
      if (tujuan < 0 || tujuan >= prev.widgets.length) return prev;
      const widgets = [...prev.widgets];
      [widgets[index], widgets[tujuan]] = [widgets[tujuan]!, widgets[index]!];
      return { ...prev, widgets };
    });
    setSaveState("idle");
  }

  function hapus(index: number) {
    setLayout((prev) => (prev ? { ...prev, widgets: prev.widgets.filter((_, i) => i !== index) } : prev));
    setSaveState("idle");
  }

  function tambah(entry: MetricCatalogEntry) {
    setLayout((prev) =>
      prev
        ? { ...prev, widgets: [...prev.widgets, { key: entry.key, width: 1, viz: vizBawaan(entry) }] }
        : prev,
    );
    setTambahBuka(false);
    setSaveState("idle");
  }

  if (loadError) return <p className="qhse-set__bad">{loadError}</p>;
  if (!layout || !catalog) return <p className="qhse-set__kosong">Memuat…</p>;

  const terpasang = new Set(layout.widgets.map((w) => w.key));
  const tersedia = catalog.filter((entry) => !terpasang.has(entry.key));

  return (
    <div className="qhse-set">
      <header className="qhse-set__head">
        <div>
          <h1 className="qhse-set__title">Susunan Dashboard Eksekutif</h1>
          <p className="qhse-set__lead">
            Pilih komponen yang tampil, urutannya, lebarnya, dan wujud tampilannya. Susunan tersimpan di server,
            jadi ikut terbawa saat dashboard dibuka dari perangkat lain.
          </p>
        </div>
        <Link href="/executive" className="qhse-set__tautan">
          Lihat dashboard
        </Link>
      </header>

      <section className="qhse-set__blok">
        <h2 className="qhse-set__judul">Kepala dashboard</h2>
        <div className="qhse-set__baris">
          <label className="qhse-set__label">
            Judul
            <input
              className="qhse-set__input"
              value={layout.judul}
              onChange={(event) => {
                setLayout({ ...layout, judul: event.target.value });
                setSaveState("idle");
              }}
            />
          </label>
          <label className="qhse-set__label">
            Dari
            <input
              className="qhse-set__input"
              type="date"
              value={layout.period.from}
              onChange={(event) => {
                setLayout({ ...layout, period: { ...layout.period, from: event.target.value } });
                setSaveState("idle");
              }}
            />
          </label>
          <label className="qhse-set__label">
            Sampai
            <input
              className="qhse-set__input"
              type="date"
              value={layout.period.to}
              onChange={(event) => {
                setLayout({ ...layout, period: { ...layout.period, to: event.target.value } });
                setSaveState("idle");
              }}
            />
          </label>
        </div>
      </section>

      <section className="qhse-set__blok">
        <div className="qhse-set__judulBaris">
          <h2 className="qhse-set__judul">Komponen · {layout.widgets.length}</h2>
          <Button variant="accent" onClick={() => setTambahBuka((buka) => !buka)}>
            {tambahBuka ? "Tutup daftar" : "Tambah komponen"}
          </Button>
        </div>

        {tambahBuka && (
          <div className="qhse-set__pilihan">
            {tersedia.length === 0 ? (
              <p className="qhse-set__kosong">Seluruh metrik yang tersedia sudah terpasang.</p>
            ) : (
              tersedia.map((entry) => (
                <button key={entry.key} type="button" className="qhse-set__pilihanItem" onClick={() => tambah(entry)}>
                  <span className="qhse-set__pilihanJudul">{entry.title}</span>
                  <span className="qhse-set__pilihanGrup">{entry.group}</span>
                  <span className="qhse-set__pilihanCaption">{entry.caption}</span>
                </button>
              ))
            )}
          </div>
        )}

        <ol className="qhse-set__daftar">
          {layout.widgets.map((widget, index) => {
            const entry = byKey.get(widget.key);
            const pilihanViz: Viz[] = entry ? vizPilihan(entry) : [widget.viz];
            return (
              <li key={widget.key} className="qhse-set__item">
                <div className="qhse-set__itemJudul">
                  <span className="qhse-set__urut">{index + 1}</span>
                  <span>
                    <strong>{entry?.title ?? widget.key}</strong>
                    <span className="qhse-set__grup">{entry?.group}</span>
                  </span>
                </div>

                <label className="qhse-set__kecil">
                  Wujud
                  <select
                    className="qhse-set__pilih"
                    value={widget.viz}
                    onChange={(event) => ubah(index, { viz: event.target.value as Viz })}
                  >
                    {pilihanViz.map((viz) => (
                      <option key={viz} value={viz}>
                        {VIZ_LABEL[viz]}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="qhse-set__kecil">
                  Lebar
                  <select
                    className="qhse-set__pilih"
                    value={widget.width}
                    onChange={(event) => ubah(index, { width: Number(event.target.value) as 1 | 2 })}
                  >
                    <option value={1}>1 kolom</option>
                    <option value={2}>2 kolom</option>
                  </select>
                </label>

                <div className="qhse-set__aksi">
                  <button type="button" onClick={() => geser(index, -1)} disabled={index === 0} aria-label="Naikkan">
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => geser(index, 1)}
                    disabled={index === layout.widgets.length - 1}
                    aria-label="Turunkan"
                  >
                    ↓
                  </button>
                  <button type="button" className="qhse-set__hapus" onClick={() => hapus(index)}>
                    Hapus
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="qhse-set__simpan">
        <Button variant="accent" onClick={() => void simpan()} disabled={saveState === "saving"}>
          {saveState === "saving" ? "Menyimpan…" : "Simpan susunan"}
        </Button>
        {saveState === "saved" && <span className="qhse-set__ok">Tersimpan.</span>}
        {saveState === "error" && <span className="qhse-set__bad">Gagal menyimpan.</span>}
      </div>
    </div>
  );
}
