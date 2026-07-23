import type { ReactNode } from "react";

// DESIGN.md §7.2 — label selalu di atas input (bukan placeholder-as-label),
// wajib-isi ditandai `*` + warna text-primary (bukan cuma merah tanpa tanda),
// error muncul tepat di bawah field terkait (bukan cuma toast generik).
export interface FormFieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export function FormField({ label, htmlFor, required, error, hint, children }: FormFieldProps) {
  return (
    <div className="qhse-form-field">
      <label htmlFor={htmlFor} className="qhse-form-field__label">
        {label}
        {required && (
          <span className="qhse-form-field__required" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && <p className="qhse-form-field__hint">{hint}</p>}
      {error && (
        <p className="qhse-form-field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
