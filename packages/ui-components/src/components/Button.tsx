import type { ButtonHTMLAttributes } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "accent" | "destructive";
  /** Icon-only button — WAJIB `aria-label` (§7.3: ikon tanpa label teks tidak boleh untuk aksi yang mengubah status legal/approval, jadi selalu sediakan label untuk screen reader minimal). */
  iconOnly?: boolean;
}

// DESIGN.md §11 — target tap minimum 44x44px di layar mobile-width untuk
// SEMUA elemen interaktif; diterapkan di sini lewat media query breakpoint
// mobile (§12, <640px), bukan cuma dijanjikan di dokumen.
export function Button({ variant = "default", iconOnly = false, className, ...props }: ButtonProps) {
  const classes = ["qhse-btn", `qhse-btn--${variant}`, iconOnly ? "qhse-btn--icon-only" : "", className]
    .filter(Boolean)
    .join(" ");
  return <button className={classes} {...props} />;
}
