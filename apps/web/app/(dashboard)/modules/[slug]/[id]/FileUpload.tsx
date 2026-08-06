"use client";

import { useRef, useState } from "react";
import { Button } from "@qhse/ui-components";
import { ApiError } from "../../../../../lib/api-client";
import { uploadFile, UPLOADABLE } from "../../../../../lib/files";
import { useLocale } from "../../../../../lib/locale";

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
  const { t } = useLocale();  const inputRef = useRef<HTMLInputElement>(null);
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
        result.majorVersion !== undefined
          ? t(` sebagai revisi ${result.majorVersion}.${result.minorVersion}`, ` as revision ${result.majorVersion}.${result.minorVersion}`)
          : "";
      setMessage({
        tone: "ok",
        text: t(`“${result.fileName}” terunggah${revisi}.`, `“${result.fileName}” uploaded${revisi}.`),
      });
      setSummary("");
      if (inputRef.current) inputRef.current.value = "";
      onUploaded();
    } catch (error: unknown) {
      const text =
        error instanceof ApiError
          ? [error.problem?.title, error.problem?.detail].filter(Boolean).join(" ")
          : t("Gagal mengunggah — API tidak terjangkau.", "Upload failed — API unreachable.");
      setMessage({ tone: "bad", text });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="qhse-upload">
      <div className="qhse-upload__row">
        <div className="qhse-upload__intro">
          <h3 className="qhse-upload__title">
            {slug === "documents" ? t("Unggah revisi baru", "Upload new revision") : t("Unggah salinan peraturan", "Upload regulation copy")}
          </h3>
          <p className="qhse-upload__hint">
            {slug === "documents"
              ? t(
                  "Berkas yang diunggah menjadi revisi baru berstatus draf. Revisi sebelumnya tetap tersimpan dan tetap bisa dibuka.",
                  "The uploaded file becomes a new revision in draft status. Earlier revisions remain stored and can still be opened.",
                )
              : t(
                  "Lampiran salinan peraturan. Naskah resminya tetap milik instansi penerbit — simpan tautan sumbernya pada kolom Source URL.",
                  "A copy of the regulation. The official text remains with the issuing authority — keep the source link in the Source URL field.",
                )}{" "}
            {t("PDF, gambar, Word, atau Excel; maksimum 8 MB.", "PDF, image, Word, or Excel; 8 MB maximum.")}
          </p>
        </div>

        {slug === "documents" && (
          <input
            className="qhse-upload__summary"
            type="text"
            value={summary}
            placeholder={t("Ringkasan perubahan (opsional)", "Change summary (optional)")}
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
          {busy ? t("Mengunggah…", "Uploading…") : t("Pilih berkas", "Choose file")}
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
