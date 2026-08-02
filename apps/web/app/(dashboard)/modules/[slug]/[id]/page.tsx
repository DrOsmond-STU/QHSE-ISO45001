"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { DataTable, StatusBadge } from "@qhse/ui-components";
import { ApiError, apiFetch } from "../../../../../lib/api-client";
import { formatCell, humanizeFieldName, inferType } from "../../../../../lib/format";
import { findModule, type ModuleColumn, type ModuleDefinition } from "../../../../../lib/modules";
import { statusTone } from "../../../../../lib/status-tone";

// Halaman detail generik — pasangan dari modules/[slug]/page.tsx.
//
// Sengaja menampilkan SELURUH field yang dikembalikan API, bukan hanya kolom
// yang terdaftar di registri: endpoint read-only ini mengembalikan model
// Prisma apa adanya, dan menyembunyikan sebagian field akan membuat halaman
// ini berbohong tentang isi record. Kolom registri hanya menentukan URUTAN
// (yang penting duluan) dan label yang lebih rapi; sisanya menyusul dengan
// label hasil humanizeFieldName().

type Record_ = Record<string, unknown>;

function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Sesi Anda sudah berakhir. Silakan keluar lalu masuk kembali.";
    if (error.status === 403) return "Anda tidak punya izin untuk melihat data ini.";
    if (error.status === 404) return "Data tidak ditemukan.";
    return error.message;
  }
  return "Tidak bisa menghubungi server API.";
}

export default function ModuleDetailPage() {
  const params = useParams<{ slug: string; id: string }>();
  const module = findModule(params.slug);

  if (!module) {
    return (
      <section>
        <h1 className="qhse-page__title">Modul tidak dikenal</h1>
        <p className="qhse-page__message">
          Tidak ada modul dengan alamat <code>{params.slug}</code>.
        </p>
      </section>
    );
  }

  return <ModuleDetail module={module} id={params.id} />;
}

function ModuleDetail({ module, id }: { module: ModuleDefinition; id: string }) {
  const [record, setRecord] = useState<Record_ | null>(null);
  const [children, setChildren] = useState<Record_[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setRecord(await apiFetch<Record_>(`${module.endpoint}/${id}`));
    } catch (err) {
      setRecord(null);
      setError(describeError(err));
      return;
    }

    // Daftar anak (mis. temuan audit) bersifat pelengkap — kalau gagal,
    // detail utamanya TETAP ditampilkan; kegagalannya cukup dicatat sebagai
    // "tidak ada data", bukan menjatuhkan seluruh halaman.
    if (module.children) {
      try {
        setChildren(await apiFetch<Record_[]>(`${module.endpoint}/${id}${module.children.pathSuffix}`));
      } catch {
        setChildren([]);
      }
    }
  }, [module, id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return (
      <section>
        <p role="alert" className="qhse-page__error">
          {error}
        </p>
        <Link href={`/modules/${module.slug}`}>← Kembali ke {module.title}</Link>
      </section>
    );
  }

  if (!record) {
    return <p className="qhse-page__message">Memuat…</p>;
  }

  const labelledKeys = module.columns.map((column) => column.key);
  const columnByKey = new Map(module.columns.map((column) => [column.key, column]));
  const orderedKeys = [
    ...labelledKeys.filter((key) => key in record),
    ...Object.keys(record).filter((key) => !labelledKeys.includes(key)),
  ];

  return (
    <section>
      <header className="qhse-page__header">
        <div>
          <p className="qhse-page__eyebrow">
            {module.moduleNumber} · <Link href={`/modules/${module.slug}`}>{module.title}</Link>
          </p>
          <h1 className="qhse-page__title">{formatCell(record[module.labelField])}</h1>
          <p className="qhse-page__subtitle">ID: {String(record.id ?? id)}</p>
        </div>
      </header>

      <div className="qhse-detail-card">
        <dl className="qhse-detail-grid">
          {orderedKeys.map((key) => {
            const column = columnByKey.get(key);
            const type = column?.type ?? inferType(key, record[key]);
            const text = formatCell(record[key], type);
            const tone = type === "status" ? statusTone(record[key]) : null;
            return (
              <div key={key} style={{ display: "contents" }}>
                <dt>{column?.header ?? humanizeFieldName(key)}</dt>
                <dd>{tone ? <StatusBadge tone={tone} label={text} /> : text}</dd>
              </div>
            );
          })}
        </dl>
      </div>

      {module.children && children !== null && (
        <section style={{ marginTop: "var(--qhse-space-6)" }}>
          <h2 className="qhse-page__title">{module.children.title}</h2>
          <p className="qhse-page__subtitle" style={{ marginBottom: "var(--qhse-space-4)" }}>
            {children.length} data
          </p>
          <DataTable
            rows={children}
            getRowId={(row) => String(row.id)}
            emptyMessage="Belum ada data terkait."
            columns={module.children.columns.map((column: ModuleColumn) => ({
              key: column.key,
              header: column.header,
              numeric: column.type === "number",
              render: (row: Record_) => {
                const text = formatCell(row[column.key], column.type);
                if (column.type === "status") {
                  const tone = statusTone(row[column.key]);
                  return tone ? <StatusBadge tone={tone} label={text} /> : <span>{text}</span>;
                }
                return <span>{text}</span>;
              },
            }))}
          />
        </section>
      )}
    </section>
  );
}
