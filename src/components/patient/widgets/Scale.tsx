"use client";

import { t } from "@/lib/i18n";
import { PainFace } from "./PainFace";
import type { WidgetProps } from "./types";

const ANCHORS: Record<number, "painNone" | "painModerate" | "painWorst"> = { 0: "painNone", 5: "painModerate", 10: "painWorst" };

export function ScaleWidget({ lang, onAnswer, mode }: WidgetProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-11 gap-2">
        {Array.from({ length: 11 }, (_, n) => (
          <button
            key={n}
            type="button"
            onClick={() => onAnswer({ kind: "scale", value: n })}
            className="flex min-h-40 touch-manipulation select-none flex-col items-center justify-center gap-2 rounded-2xl border-2 border-line bg-surface px-1 py-3 hover:border-brand focus-visible:border-brand"
            aria-label={`${n}`}
          >
            <PainFace level={n} size={mode === "picture" ? 64 : 52} />
            <span className="text-[32px] font-bold tabular-nums">{n}</span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-11 gap-2 text-[24px] leading-tight text-ink-soft">
        {Array.from({ length: 11 }, (_, n) => (
          <span key={n} className="text-center">
            {ANCHORS[n] ? t(ANCHORS[n], lang) : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
