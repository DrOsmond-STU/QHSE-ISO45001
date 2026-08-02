"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KpiCard } from "@qhse/ui-components";
import { ApiError, apiFetchWithMeta } from "../../../lib/api-client";
import { MODULES, modulesByGroup, type ModuleDefinition } from "../../../lib/modules";

// Halaman ringkasan — satu kartu per modul berisi jumlah record.
//
// Jumlahnya diambil dari `meta.total` pada endpoint list dengan limit=1,
// BUKAN endpoint agregat khusus: endpoint semacam itu belum ada, dan
// membuat angka di sini dari sumber lain akan membuat kartu bisa berbeda
// dari isi tabel yang dibuka user sesaat kemudian. Konsekuensinya ada 15
// permintaan HTTP kecil saat halaman dibuka — masih wajar karena
// berjalan paralel dan payload-nya satu baris per modul.

type CountState =
  | { kind: "loading" }
  | { kind: "ok"; total: number }
  | { kind: "denied" } // 403 — modul tidak dilanggan tenant, atau user tidak berhak
  | { kind: "error"; message: string };

function describeCountError(error: unknown): CountState {
  if (error instanceof ApiError) {
    if (error.status === 403) return { kind: "denied" };
    return { kind: "error", message: `HTTP ${error.status}` };
  }
  return { kind: "error", message: "API tidak terjangkau" };
}

export default function DashboardPage() {
  const [counts, setCounts] = useState<Record<string, CountState>>(() =>
    Object.fromEntries(MODULES.map((module) => [module.slug, { kind: "loading" } as CountState])),
  );

  useEffect(() => {
    let cancelled = false;

    for (const module of MODULES) {
      apiFetchWithMeta<unknown[]>(module.endpoint, { query: { page: 1, limit: 1 } })
        .then((result) => {
          if (cancelled) return;
          const total = (result.meta as { total?: number } | undefined)?.total ?? result.data.length;
          setCounts((prev) => ({ ...prev, [module.slug]: { kind: "ok", total } }));
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          setCounts((prev) => ({ ...prev, [module.slug]: describeCountError(error) }));
        });
    }

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section>
      <header className="qhse-page__header">
        <div>
          <p className="qhse-page__eyebrow">Ringkasan</p>
          <h1 className="qhse-page__title">Dashboard QHSE</h1>
          <p className="qhse-page__subtitle">
            Jumlah record per modul untuk tenant yang sedang aktif. Klik kartu untuk membuka daftarnya.
          </p>
        </div>
      </header>

      {modulesByGroup().map(({ group, modules }) => (
        <div key={group} style={{ marginBottom: "var(--qhse-space-6)" }}>
          <h2 className="qhse-shell__nav-heading" style={{ padding: 0, marginBottom: "var(--qhse-space-3)" }}>
            {group}
          </h2>
          <div className="qhse-kpi-grid">
            {modules.map((module) => (
              <ModuleKpi key={module.slug} module={module} state={counts[module.slug]} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function ModuleKpi({ module, state }: { module: ModuleDefinition; state: CountState | undefined }) {
  const card = (() => {
    switch (state?.kind) {
      case "ok":
        return <KpiCard label={module.title} value={String(state.total)} target={module.moduleNumber} />;
      case "denied":
        return <KpiCard label={module.title} value="—" target="Tidak berhak / tidak dilanggan" />;
      case "error":
        return <KpiCard label={module.title} value="—" target={state.message} />;
      default:
        return <KpiCard label={module.title} value="…" target={module.moduleNumber} />;
    }
  })();

  // Kartu yang ditolak server tetap ditautkan — halaman daftarnya menjelaskan
  // penolakan itu dengan kalimat utuh, jauh lebih berguna daripada tautan mati.
  return <Link href={`/modules/${module.slug}`}>{card}</Link>;
}
