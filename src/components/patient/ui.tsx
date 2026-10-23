"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon } from "@/components/shared/Icon";

type Tone = "neutral" | "yes" | "no" | "primary";

const TONES: Record<Tone, string> = {
  neutral: "bg-surface text-ink border-line hover:border-brand",
  primary: "bg-brand text-white border-brand hover:bg-brand-strong",
  yes: "bg-yes text-white border-yes hover:brightness-110",
  no: "bg-no text-white border-no hover:brightness-110",
};

/** Patient-screen button: at least 64px tall, 26px text. */
export function BigButton({
  tone = "neutral",
  selected = false,
  icon,
  iconSize = 36,
  children,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; selected?: boolean; icon?: string; iconSize?: number; children: ReactNode }) {
  const sel = selected ? "border-brand bg-brand-soft ring-4 ring-brand/30" : "";
  return (
    <button
      type="button"
      {...rest}
      className={`flex min-h-16 touch-manipulation select-none items-center justify-center gap-3 rounded-2xl border-2 px-5 py-3 text-[26px] font-semibold leading-tight transition-colors disabled:opacity-40 ${TONES[tone]} ${sel} ${className}`}
    >
      {icon ? <Icon name={icon} size={iconSize} className="shrink-0" /> : null}
      <span>{children}</span>
    </button>
  );
}

/** Icon-first card used by choice and duration widgets. */
export function IconCard({
  icon,
  label,
  selected,
  onClick,
  pictureFirst,
  compact = false,
}: {
  icon: string;
  label: string;
  selected: boolean;
  onClick: () => void;
  pictureFirst: boolean;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex touch-manipulation select-none flex-col items-center justify-center gap-2 rounded-2xl border-2 px-3 py-3 text-center transition-colors ${
        compact ? "min-h-24" : pictureFirst ? "min-h-40" : "min-h-32"
      } ${selected ? "border-brand bg-brand-soft ring-4 ring-brand/30" : "border-line bg-surface hover:border-brand"}`}
    >
      <Icon name={icon} size={compact ? 36 : pictureFirst ? 72 : 48} className={selected ? "text-brand" : "text-ink"} strokeWidth={pictureFirst ? 1.75 : 2} />
      <span className={`leading-tight ${pictureFirst ? "text-[24px] font-medium text-ink-soft" : "text-[24px] font-semibold"}`}>{label}</span>
    </button>
  );
}
