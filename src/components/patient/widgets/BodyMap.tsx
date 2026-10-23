"use client";

import { useState } from "react";
import { regionLabel, t } from "@/lib/i18n";
import { BODY_REGIONS, type BodyRegion } from "@/lib/schemas";
import { BigButton } from "../ui";
import type { WidgetProps } from "./types";

// Two figures, viewer facing the patient. On the front view the patient's
// right side is on the viewer's left; on the back view it is on the viewer's right.

type Shape = { region: BodyRegion; d: string };

const rr = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 -${r} ${r}h-${w - 2 * r}a${r} ${r} 0 0 1 -${r} -${r}v-${h - 2 * r}a${r} ${r} 0 0 1 ${r} -${r}z`;

const HEAD = "M80 8a32 32 0 1 1 0 64a32 32 0 1 1 0-64z";
const FACE = "M80 34c13 0 21 7 21 18s-9 19-21 19-21-8-21-19 8-18 21-18z";
const NECK = rr(66, 70, 28, 18, 6);
const ARM_VIEWER_LEFT = "M44 92c-10 2-17 9-19 20l-9 70c-1 9 1 18 4 26l6 32h18l-2-36 6-54 4-20z";
const ARM_VIEWER_RIGHT = "M116 92c10 2 17 9 19 20l9 70c1 9-1 18-4 26l-6 32h-18l2-36-6-54-4-20z";
const LEG_VIEWER_LEFT = "M48 270h31l-2 70-3 52h-22l-4-52z";
const LEG_VIEWER_RIGHT = "M81 270h31l0 70-4 52h-22l-3-52z";

const FRONT: Shape[] = [
  { region: "head", d: HEAD },
  { region: "face", d: FACE },
  { region: "neck", d: NECK },
  { region: "right_arm", d: ARM_VIEWER_LEFT },
  { region: "left_arm", d: ARM_VIEWER_RIGHT },
  { region: "chest", d: rr(46, 88, 68, 64, 16) },
  { region: "upper_abdomen", d: rr(50, 154, 60, 38, 8) },
  { region: "lower_abdomen", d: rr(50, 194, 60, 38, 8) },
  { region: "pelvis", d: rr(46, 234, 68, 34, 12) },
  { region: "right_leg", d: LEG_VIEWER_LEFT },
  { region: "left_leg", d: LEG_VIEWER_RIGHT },
];

const BACK: Shape[] = [
  { region: "head", d: HEAD },
  { region: "neck", d: NECK },
  { region: "left_arm", d: ARM_VIEWER_LEFT },
  { region: "right_arm", d: ARM_VIEWER_RIGHT },
  { region: "back", d: rr(46, 88, 68, 144, 16) },
  { region: "pelvis", d: rr(46, 234, 68, 34, 12) },
  { region: "left_leg", d: LEG_VIEWER_LEFT },
  { region: "right_leg", d: LEG_VIEWER_RIGHT },
];

function Figure({ shapes, selected, toggle, label, lang }: { shapes: Shape[]; selected: Set<BodyRegion>; toggle: (r: BodyRegion) => void; label: string; lang: WidgetProps["lang"] }) {
  return (
    <figure className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 160 400" className="h-[300px] w-auto touch-manipulation select-none" role="group" aria-label={label}>
        {shapes.map((s) => {
          const on = selected.has(s.region);
          return (
            <path
              key={s.region}
              d={s.d}
              role="button"
              tabIndex={0}
              aria-pressed={on}
              aria-label={regionLabel(s.region, lang)}
              onClick={() => toggle(s.region)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggle(s.region);
                }
              }}
              className={`cursor-pointer outline-none transition-colors ${on ? "fill-brand stroke-brand-strong" : "fill-[#e4eaf0] stroke-[#8796a8] hover:fill-brand-soft"} focus-visible:stroke-signal`}
              strokeWidth={on ? 3 : 2}
            />
          );
        })}
      </svg>
      <figcaption className="text-[24px] font-semibold text-ink-soft">{label}</figcaption>
    </figure>
  );
}

export function BodyMapWidget({ q, lang, onAnswer }: WidgetProps) {
  const [selected, setSelected] = useState<Set<BodyRegion>>(new Set());
  const toggle = (r: BodyRegion) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(r)) next.delete(r);
      else next.add(r);
      return next;
    });
  const isRadiation = q.chartField === "radiation";
  const ordered = BODY_REGIONS.filter((r) => selected.has(r));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-6">
        <div className="flex shrink-0 flex-col gap-2">
          <p className="max-w-[300px] text-[24px] leading-tight text-ink-soft">{t("tapBody", lang)}</p>
          <div className="flex gap-2" dir="ltr">
          <Figure shapes={FRONT} selected={selected} toggle={toggle} label={t("front", lang)} lang={lang} />
          <Figure shapes={BACK} selected={selected} toggle={toggle} label={t("backSide", lang)} lang={lang} />
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-3">
          <div className="grid grid-cols-3 gap-2">
            {BODY_REGIONS.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={selected.has(r)}
                onClick={() => toggle(r)}
                className={`min-h-16 touch-manipulation rounded-xl border-2 px-3 text-start text-[24px] leading-tight ${
                  selected.has(r) ? "border-brand bg-brand-soft font-semibold" : "border-line bg-surface hover:border-brand"
                }`}
              >
                {regionLabel(r, lang)}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            {isRadiation ? (
              <BigButton icon="none" onClick={() => onAnswer({ kind: "bodymap", regions: [] })}>
                {t("noSpread", lang)}
              </BigButton>
            ) : null}
            <BigButton tone="primary" icon="yes" disabled={!ordered.length} className="min-w-48" onClick={() => onAnswer({ kind: "bodymap", regions: ordered })}>
              {t("done", lang)}
            </BigButton>
          </div>
        </div>
      </div>
    </div>
  );
}
