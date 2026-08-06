"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, FormField } from "@qhse/ui-components";
import { ApiError } from "../../../../lib/api-client";
import {
  createRecord,
  fetchSchema,
  initialValues,
  parseFieldErrors,
  updateRecord,
  type FormField as Field,
  type ModuleSchema,
} from "../../../../lib/records";
import { useLocale } from "../../../../lib/locale";
import { humanizeEnum } from "../../../../lib/status-tone";

// Formulir buat/ubah, dibangun dari skema yang dikirim server.
//
// Satu komponen untuk 15 modul. Itu bukan penghematan baris semata: formulir
// yang ditulis tangan per modul akan berbeda-beda dalam hal yang justru tidak
// boleh berbeda — cara menandai field wajib, cara menampilkan galat validasi,
// dan cara memperlakukan nilai kosong. Perbedaan semacam itu baru terasa
// ketika seseorang mengisi modul yang jarang dipakai dan menemukan aturannya
// tidak sama dengan yang sudah ia hafal.

export function RecordForm({
  slug,
  title,
  recordId,
  initialRow,
  onSaved,
  onCancel,
}: {
  slug: string;
  title: string;
  /** Kosong = mode buat baru. */
  recordId?: string;
  initialRow?: Record<string, unknown> | null;
  onSaved: (id: string) => void;
  onCancel: () => void;
}) {
  const { t } = useLocale();
  const [schema, setSchema] = useState<ModuleSchema | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchSchema(slug)
      .then((loaded) => {
        if (cancelled) return;
        setSchema(loaded);
        setValues(initialValues(loaded.fields, initialRow ?? null));
      })
      .catch((error: unknown) => {
        if (!cancelled) setFormError(error instanceof ApiError ? error.message : t("Skema formulir gagal dimuat.", "The form schema could not be loaded."));
      });
    return () => {
      cancelled = true;
    };
  }, [slug, initialRow]);

  // Field wajib lebih dulu, sisanya menyusul dengan urutan kolom aslinya.
  // Yang wajib diisi adalah yang menentukan apakah formulirnya bisa disimpan,
  // jadi menaruhnya di bawah tiga puluh field opsional berarti orang mengisi
  // dari atas lalu ditolak karena sesuatu yang belum sempat terlihat.
  const ordered = useMemo(() => {
    if (!schema) return [];
    return [...schema.fields].sort((a, b) => Number(b.required) - Number(a.required));
  }, [schema]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!schema) return;
    setSaving(true);
    setFormError(null);
    setFieldErrors({});

    // Field kosong dikirim sebagai null, BUKAN dihilangkan dari payload.
    // Dihilangkan, mode ubah tidak akan pernah bisa mengosongkan sebuah field
    // yang sudah terisi — pengguna menghapus isinya, menekan Simpan, dan
    // nilainya kembali seperti semula tanpa penjelasan.
    const payload: Record<string, unknown> = {};
    for (const field of schema.fields) {
      const raw = values[field.key];
      payload[field.key] = raw === "" || raw === undefined ? null : raw;
    }

    try {
      const saved = recordId ? await updateRecord(slug, recordId, payload) : await createRecord(slug, payload);
      onSaved(recordId ?? saved.id);
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        const parsed = parseFieldErrors(error.problem?.detail);
        if (parsed) {
          setFieldErrors(parsed);
          setFormError(t("Ada isian yang belum benar. Periksa tanda merah di bawah.", "Some fields are not valid. Check the fields marked in red below."));
        } else {
          setFormError(error.message);
        }
      } else {
        setFormError(t("Gagal menyimpan — API tidak terjangkau.", "Could not save — API unreachable."));
      }
    } finally {
      setSaving(false);
    }
  }

  if (formError && !schema) return <p className="qhse-dash__error">{formError}</p>;
  if (!schema) return <p className="qhse-dash__muted">{t("Memuat formulir…", "Loading form…")}</p>;

  return (
    <form className="qhse-form" onSubmit={handleSubmit}>
      <header className="qhse-form__head">
        <h2 className="qhse-form__title">{recordId ? t(`Ubah ${title}`, `Edit ${title}`) : t(`${title} baru`, `New ${title}`)}</h2>
        {schema.initialStatus && !recordId && (
          <p className="qhse-form__hint">
            {t("Baris baru dibuat berstatus", "New records are created with status")}{" "}
            <strong>{humanizeEnum(schema.initialStatus)}</strong>.{" "}
            {t(
              "Status berikutnya dicapai lewat pengajuan persetujuan atau perpindahan status di halaman detail — tidak diisi dari formulir ini.",
              "The next status is reached by submitting for approval or moving the status on the detail page — it is not set from this form.",
            )}
          </p>
        )}
      </header>

      {formError && <p className="qhse-form__error">{formError}</p>}

      <div className="qhse-form__grid">
        {ordered.map((field) => (
          <FieldInput
            key={field.key}
            field={field}
            value={values[field.key] ?? ""}
            error={fieldErrors[field.key]}
            onChange={(next) => setValues((prev) => ({ ...prev, [field.key]: next }))}
          />
        ))}
      </div>

      <div className="qhse-form__actions">
        <Button type="submit" variant="accent" disabled={saving}>
          {saving ? t("Menyimpan…", "Saving…") : t("Simpan", "Save")}
        </Button>
        <Button type="button" variant="default" onClick={onCancel} disabled={saving}>
          {t("Batal", "Cancel")}
        </Button>
      </div>
    </form>
  );
}

function FieldInput({
  field,
  value,
  error,
  onChange,
}: {
  field: Field;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const { t } = useLocale();
  const id = `f-${field.key}`;
  const wide = field.type === "longtext";

  return (
    <div className={wide ? "qhse-form__cell qhse-form__cell--wide" : "qhse-form__cell"}>
      <FormField
        label={field.label}
        htmlFor={id}
        required={field.required}
        error={error}
        hint={field.truncated ? t("Menampilkan 200 pilihan pertama.", "Showing the first 200 options.") : undefined}
      >
        {field.type === "longtext" ? (
          <textarea id={id} value={value} rows={3} onChange={(event) => onChange(event.target.value)} />
        ) : field.type === "enum" || field.type === "ref" ? (
          <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
            <option value="">{t("— pilih —", "— select —")}</option>
            {(field.options ?? []).map((option) => (
              <option key={option.value} value={option.value}>
                {field.type === "enum" ? humanizeEnum(option.label) : option.label}
              </option>
            ))}
          </select>
        ) : field.type === "boolean" ? (
          <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
            <option value="">{t("— pilih —", "— select —")}</option>
            <option value="true">{t("Ya", "Yes")}</option>
            <option value="false">{t("Tidak", "No")}</option>
          </select>
        ) : (
          <input
            id={id}
            type={
              field.type === "number"
                ? "number"
                : field.type === "date"
                  ? "date"
                  : field.type === "datetime"
                    ? "datetime-local"
                    : "text"
            }
            value={value}
            step={field.type === "number" ? "any" : undefined}
            maxLength={field.maxLength ?? undefined}
            onChange={(event) => onChange(event.target.value)}
          />
        )}
      </FormField>
    </div>
  );
}
