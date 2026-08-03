"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, StatusBadge } from "@qhse/ui-components";
import { ApiError, getApiBaseUrl } from "../../../lib/api-client";
import { readSession } from "../../../lib/auth-session";
import { signFile, type SignedFile } from "../../../lib/files";
import { humanizeEnum, statusTone } from "../../../lib/status-tone";
import "../records.css";

// Penampil dokumen terkendali dengan watermark TERKENDALI.
//
// APA YANG WATERMARK INI LAKUKAN, DAN APA YANG TIDAK.
//
// Ia menandai SETIAP TAMPILAN DAN CETAKAN yang melewati aplikasi ini: lapisan
// watermark digambar di atas berkasnya, ikut terbawa saat halaman dicetak, dan
// membawa stempel salinan terkendali — nomor dokumen, revisi, status, serta
// siapa yang membukanya dan kapan. Itulah yang diminta klausul 7.5 ISO 9001
// dan ISO 45001 dari sebuah salinan terkendali: bisa dikenali sebagai salinan,
// dan bisa ditelusuri asalnya.
//
// Ia TIDAK mengubah berkas aslinya. Byte yang tersimpan di server tetap PDF
// tanpa watermark, dan siapa pun yang bisa membuka halaman ini juga bisa
// mengambil byte itu — tautan berkasnya memang harus bisa dibaca peramban agar
// bisa ditampilkan sama sekali. Membakar watermark ke dalam berkasnya menuntut
// pengolahan PDF di sisi server, yang berarti satu pustaka besar lagi pada
// proses yang sengaja hanya bergantung pada pg dan argon2.
//
// Batas itu DINYATAKAN DI LAYAR, bukan disembunyikan. Watermark yang dikira
// pengguna sebagai pengaman padahal hanya penanda tampilan lebih berbahaya
// daripada tidak ada watermark sama sekali: ia membuat orang merasa aman
// membagikan tautan yang sebenarnya membuka berkas bersih.

export default function ViewerPage() {
  return (
    <Suspense fallback={<p className="qhse-dash__muted">Memuat…</p>}>
      <Viewer />
    </Suspense>
  );
}

function Viewer() {
  const params = useSearchParams();
  const kind = params.get("kind") === "attachment" ? "attachment" : "version";
  const id = params.get("id") ?? "";
  const backTo = params.get("kembali");

  const [file, setFile] = useState<SignedFile | null>(null);
  const [error, setError] = useState<{ title: string; detail?: string } | null>(null);
  const [openedAt] = useState(() => new Date());
  const session = typeof window === "undefined" ? null : readSession();

  useEffect(() => {
    if (!id) {
      setError({ title: "Tidak ada berkas yang diminta." });
      return;
    }
    let cancelled = false;
    signFile(kind, id)
      .then((signed) => {
        if (!cancelled) setFile(signed);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof ApiError
            ? { title: cause.problem?.title ?? cause.message, detail: cause.problem?.detail }
            : { title: "API tidak terjangkau." },
        );
      });
    return () => {
      cancelled = true;
    };
  }, [kind, id]);

  const src = file ? `${getApiBaseUrl()}${file.url}` : null;
  const unduhUrl = src ? `${src}&unduh=1` : null;

  return (
    <section className="qhse-viewer">
      <header className="qhse-page__header qhse-viewer__header">
        <div>
          <p className="qhse-page__eyebrow">Salinan terkendali</p>
          <h1 className="qhse-page__title">{file?.documentNumber ?? "Penampil dokumen"}</h1>
          {file?.title && <p className="qhse-page__subtitle">{file.title}</p>}
        </div>
        <div className="qhse-viewer__actions">
          {file?.status && statusTone(file.status) && (
            <StatusBadge tone={statusTone(file.status)!} label={humanizeEnum(file.status)} />
          )}
          {backTo && (
            <Link href={backTo}>
              <Button variant="default">Kembali</Button>
            </Link>
          )}
          <Button variant="default" onClick={() => window.print()}>
            Cetak
          </Button>
          {unduhUrl && (
            <a href={unduhUrl}>
              <Button variant="default">Unduh asli</Button>
            </a>
          )}
        </div>
      </header>

      {error && (
        <p className="qhse-dash__error" role="alert">
          {error.title}
          {error.detail ? ` ${error.detail}` : ""}
        </p>
      )}

      {file && (
        <>
          <p className="qhse-viewer__disclaimer">
            Watermark <strong>TERKENDALI</strong> diterapkan saat dokumen ditampilkan dan ikut tercetak. Berkas aslinya
            di server <strong>tidak diubah</strong> — tombol “Unduh asli” menghasilkan berkas tanpa watermark. Perlakukan
            hasil unduhan sebagai salinan tak terkendali.
          </p>

          <div className="qhse-viewer__frame">
            {file.inlineViewable ? (
              file.mimeType.startsWith("image/") ? (
                <img className="qhse-viewer__image" src={src!} alt={file.fileName} />
              ) : (
                // <iframe>, bukan <embed>: iframe menerima title untuk
                // pembaca layar, dan lapisan watermark di atasnya tetap
                // tergambar karena keduanya elemen biasa dalam satu dokumen.
                <iframe className="qhse-viewer__pdf" src={src!} title={`Pratinjau ${file.fileName}`} />
              )
            ) : (
              <div className="qhse-viewer__unsupported">
                <p>
                  <strong>{file.fileName}</strong> bertipe {file.mimeType}, yang tidak bisa ditampilkan langsung di
                  peramban.
                </p>
                <p>
                  Unduh berkasnya untuk membukanya di aplikasi yang sesuai. Karena tidak melewati penampil ini, hasil
                  unduhan <strong>tidak ber-watermark</strong>.
                </p>
              </div>
            )}

            {/* Lapisan watermark. aria-hidden karena isinya hiasan berulang;
                keterangan yang sama sudah disampaikan sebagai teks di stempel
                bawah, yang memang dibacakan pembaca layar. */}
            <div className="qhse-watermark" aria-hidden="true">
              {Array.from({ length: 24 }, (_, index) => (
                <span key={index}>TERKENDALI</span>
              ))}
            </div>
          </div>

          {/* Stempel salinan terkendali. Inilah yang membuat sebuah cetakan
              bisa ditelusuri: bukan tulisan diagonalnya, melainkan baris ini. */}
          <footer className="qhse-stamp">
            <span className="qhse-stamp__badge">SALINAN TERKENDALI</span>
            <dl className="qhse-stamp__grid">
              <div>
                <dt>Dokumen</dt>
                <dd>{file.documentNumber ?? "—"}</dd>
              </div>
              {file.version && (
                <div>
                  <dt>Revisi</dt>
                  <dd>{file.version}</dd>
                </div>
              )}
              {file.status && (
                <div>
                  <dt>Status</dt>
                  <dd>{humanizeEnum(file.status)}</dd>
                </div>
              )}
              <div>
                <dt>Dibuka oleh</dt>
                <dd>{session?.email ?? session?.userId ?? "—"}</dd>
              </div>
              <div>
                <dt>Waktu</dt>
                <dd>{openedAt.toLocaleString("id-ID")}</dd>
              </div>
              <div>
                <dt>Berkas</dt>
                <dd>{file.fileName}</dd>
              </div>
            </dl>
          </footer>
        </>
      )}
    </section>
  );
}
