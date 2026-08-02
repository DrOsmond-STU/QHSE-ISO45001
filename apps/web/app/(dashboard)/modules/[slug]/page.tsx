"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button, DataTable, StatusBadge } from "@qhse/ui-components";
import { ApiError, apiFetchWithMeta } from "../../../../lib/api-client";
import { formatCell } from "../../../../lib/format";
import { findModule, type ModuleDefinition } from "../../../../lib/modules";
import { statusTone } from "../../../../lib/status-tone";

// SATU halaman daftar untuk KELIMA BELAS modul, digerakkan lib/modules.ts —
// lihat banner comment di sana untuk alasannya. Endpoint yang dipanggil
// semuanya read-only (GET list + GET detail); tidak ada aksi tulis di UI ini
// karena memang belum ada endpoint tulisnya (semua mutasi domain masih lewat
// service layer + test integrasi, lihat komentar di *.controller.ts).

const PAGE_SIZE = 20;

type Row = Record<string, unknown>;

/** Pesan yang bisa dibaca manusia untuk kegagalan yang sudah kita antisipasi. */
function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Sesi Anda sudah berakhir. Silakan keluar lalu masuk kembali.";
    if (error.status === 403) {
      return "Anda tidak punya izin untuk modul ini, atau modulnya tidak termasuk dalam langganan tenant ini.";
    }
    return error.message;
  }
  return "Tidak bisa menghubungi server API. Periksa NEXT_PUBLIC_API_URL dan pastikan API sedang berjalan.";
}

export default function ModuleListPage() {
  const params = useParams<{ slug: string }>();
  const module = findModule(params.slug);

  if (!module) {
    return (
      <section>
        <h1 className="qhse-page__title">Modul tidak dikenal</h1>
        <p className="qhse-page__message">
          Tidak ada modul dengan alamat <code>{params.slug}</code>. Pilih salah satu modul dari menu di samping.
        </p>
      </section>
    );
  }

  return <ModuleList module={module} />;
}

function ModuleList({ module }: { module: ModuleDefinition }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Kembali ke halaman 1 saat berpindah modul — komponen ini dipakai ulang
  // oleh React saat slug berubah, jadi state paginasinya ikut terbawa.
  useEffect(() => {
    setPage(1);
    setRows(null);
  }, [module.slug]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await apiFetchWithMeta<Row[]>(module.endpoint, { query: { page, limit: PAGE_SIZE } });
      setRows(result.data);
      setTotal((result.meta as { total?: number } | undefined)?.total ?? result.data.length);
    } catch (err) {
      setRows(null);
      setError(describeError(err));
    }
  }, [module.endpoint, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <section>
      <header className="qhse-page__header">
        <div>
          <p className="qhse-page__eyebrow">{module.moduleNumber}</p>
          <h1 className="qhse-page__title">{module.title}</h1>
          <p className="qhse-page__subtitle">
            {error
              ? "Tidak ada data yang bisa ditampilkan."
              : rows === null
                ? "Memuat…"
                : `${total} data · menampilkan halaman ${page} dari ${totalPages}`}
          </p>
        </div>
      </header>

      {error && (
        <p role="alert" className="qhse-page__error">
          {error}
        </p>
      )}

      {rows !== null && (
        <>
          <DataTable
            rows={rows}
            getRowId={(row) => String(row.id)}
            emptyMessage="Belum ada data pada modul ini."
            columns={module.columns.map((column, index) => ({
              key: column.key,
              header: column.header,
              numeric: column.type === "number",
              render: (row: Row) => {
                const text = formatCell(row[column.key], column.type);

                if (column.type === "status") {
                  const tone = statusTone(row[column.key]);
                  return tone ? <StatusBadge tone={tone} label={text} /> : <span>{text}</span>;
                }

                // Kolom pertama jadi pintu masuk ke halaman detail (pola
                // "List/Table Page" DESIGN.md §8) — bukan seluruh baris,
                // supaya teks di kolom lain tetap bisa diseleksi/disalin.
                if (index === 0) {
                  return <Link href={`/modules/${module.slug}/${String(row.id)}`}>{text}</Link>;
                }

                return <span>{text}</span>;
              },
            }))}
          />

          {total > PAGE_SIZE && (
            <nav className="qhse-page__pagination" aria-label="Paginasi">
              <Button variant="default" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Sebelumnya
              </Button>
              <span>
                Halaman {page} dari {totalPages}
              </span>
              <Button
                variant="default"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Berikutnya
              </Button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
