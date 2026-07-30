export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** WAJIB, sama alasan StatusBadge.label — screen reader butuh nama, bukan cuma posisi visual on/off. */
  label: string;
  disabled?: boolean;
  /** Sembunyikan label SECARA VISUAL (tetap terbaca screen reader) — dipakai
   * di cell matriks tabel (Modul 25 preferensi) yang konteksnya SUDAH jelas
   * dari header baris/kolom, supaya label penuh tidak perlu diulang visual
   * di tiap cell. */
  hideLabel?: boolean;
}

// DESIGN.md §7.2/§11 — toggle adalah elemen form, ikut kaidah label-di-atas/
// tidak-cuma-warna yang sama dgn FormField; `role="switch"` + `aria-checked`
// eksplisit (bukan cuma checkbox polos) supaya assistive tech mengumumkannya
// sbg switch on/off, bukan sekadar centang.
export function Toggle({ checked, onChange, label, disabled = false, hideLabel = false }: ToggleProps) {
  const classes = ["qhse-toggle", disabled ? "qhse-toggle--disabled" : ""].filter(Boolean).join(" ");

  return (
    <label className={classes}>
      <input
        type="checkbox"
        role="switch"
        aria-checked={checked}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="qhse-toggle__input"
      />
      <span className="qhse-toggle__track" aria-hidden="true">
        <span className="qhse-toggle__thumb" />
      </span>
      <span className={hideLabel ? "qhse-sr-only" : "qhse-toggle__label"}>{label}</span>
    </label>
  );
}
