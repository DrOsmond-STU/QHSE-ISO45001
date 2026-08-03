"use client";

import { useRef, useState } from "react";
import { Button } from "@qhse/ui-components";
import { ApiError } from "../../../../../lib/api-client";
import { uploadFile, UPLOADABLE } from "../../../../../lib/files";

// Kontrol unggah berkas untuk dokumen terkendali dan register peraturan.
//
// UNTUK DOKUMEN, MENGUNGGAH BERARTI MEMBUAT REVISI BARU — bukan menimpa
// berkas yang ada. Itu ditulis di tombolnya ("Unggah revisi baru") dan
// dijelaskan lagi di keterangan, karena orang yang mengira ia sedang
// mengganti berkas akan terkejut menemukan dua baris di daftar versi. Revisi
// lama memang harus tetap ada: dokumen terkendali yang riwayat revisinya bisa
// ditimpa berhenti menjadi dokumen terkendali.

export function FileUpload({
  slug,
  id,
  onUploaded,
}: {
  slug: string;
  id: string;
  onUploaded: () => void;
}) {
  const target = UPLOADABLE[slug];
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState("");
  const [message, setMessage] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  if (!target) return null;

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await uploadFile(slug, id, file, summary);
      const revisi =
        result.majorVersion !== undefined ? ` sebagai revisi ${result.majorVersion}.${result.minorVersion}` : "";
      setMessage({ tone: "ok", text: `“${result.fileName}” terunggah${revisi}.` });
      setSummary("");
      if (inputRef.current) inputRef.current.value = "";
      onUploaded();
    } catch (error: unknown) {
      const text =
        error instanceof ApiError
          ? [error.problem?.title, error.problem?.detail].filter(Boolean).join(" ")
          : "Gagal mengunggah — API tidak terjangkau.";
      setMessage({ tone: "bad", text });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="qhse-upload">
      <div className="qhse-upload__row">
        <div className="qhse-upload__intro">
          <h3 className="qhse-upload__title">{target.label}</h3>
          <p className="qhse-upload__hint">
            {slug === "documents"
              ? "Berkas yang diunggah menjadi revisi baru berstatus draf. Revisi sebelumnya tetap tersimpan dan tetap bisa dibuka."
              : "Lampiran salinan peraturan. Naskah resminya tetap milik instansi penerbit — simpan tautan sumbernya pada kolom Source URL."}{" "}
            PDF, gambar, Word, atau Excel; maksimum 8 MB.
          </p>
        </div>

        {slug === "documents" && (
          <input
            className="qhse-upload__summary"
            type="text"
            value={summary}
            placeholder="Ringkasan perubahan (opsional)"
            disabled={busy}
            onChange={(event) => setSummary(event.target.value)}
          />
        )}

        <input
          ref={inputRef}
          className="qhse-upload__input"
          type="file"
          disabled={busy}
          accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.txt"
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
        <Button variant="accent" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? "Mengunggah…" : "Pilih berkas"}
        </Button>
      </div>

      {message && (
        <p className={message.tone === "ok" ? "qhse-actions__ok" : "qhse-actions__bad"} role="status">
          {message.text}
        </p>
      )}
    </div>
  );
}
