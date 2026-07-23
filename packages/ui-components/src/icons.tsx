import type { SVGProps } from "react";

/**
 * PLACEHOLDER — DESIGN.md §14 poin 2: icon set final (Lucide/Phosphor/
 * Heroicons) belum diputuskan tim Design. Bentuk di bawah ini cukup untuk
 * membedakan status TANPA warna (DESIGN §6 — centang vs segitiga vs silang
 * tetap terbaca grayscale/cetak PDF), tapi WAJIB diganti satu icon-set resmi
 * sebelum implementasi komponen lanjut ke modul domain (Phase 1+).
 */

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function baseProps(size: number, props: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };
}

export function IconCheck({ size = 16, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, props)}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// Segitiga peringatan outline — DESIGN §3.3 `warning`.
export function IconWarningOutline({ size = 16, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, props)}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

// Segitiga peringatan solid — DESIGN §3.3 `serious` (lebih tegas dari warning).
export function IconWarningSolid({ size = 16, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, props)} fill="currentColor" stroke="none">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    </svg>
  );
}

// Silang/stop — DESIGN §3.3 `critical`.
export function IconCross({ size = 16, ...props }: IconProps) {
  return (
    <svg {...baseProps(size, props)}>
      <circle cx="12" cy="12" r="9" />
      <line x1="9" y1="9" x2="15" y2="15" />
      <line x1="15" y1="9" x2="9" y2="15" />
    </svg>
  );
}
