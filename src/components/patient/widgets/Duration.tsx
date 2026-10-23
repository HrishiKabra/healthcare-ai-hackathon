"use client";

import { useState } from "react";
import { t, tKey } from "@/lib/i18n";
import type { DurationBucket, DurationUnit } from "@/lib/schemas";
import { BigButton, IconCard } from "../ui";
import type { WidgetProps } from "./types";

const BUCKETS: DurationBucket[] = ["minutes", "about_1_hour", "few_hours", "today", "yesterday", "days", "unknown"];
const UNITS: DurationUnit[] = ["minutes", "hours", "days"];
const DEFAULT_UNIT: Partial<Record<DurationBucket, DurationUnit>> = {
  minutes: "minutes",
  about_1_hour: "hours",
  few_hours: "hours",
  today: "hours",
  yesterday: "hours",
  days: "days",
};

export function DurationWidget({ lang, mode, onAnswer }: WidgetProps) {
  const [bucket, setBucket] = useState<DurationBucket | null>(null);
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState<DurationUnit>("minutes");
  const n = amount.trim() === "" ? null : Number(amount.replace(",", "."));
  const validNumber = n == null || (Number.isFinite(n) && n >= 0);

  return (
    <div className="flex flex-col gap-5">
      <p className="text-[26px] font-semibold">{t("howLongAgo", lang)}</p>
      <div className="grid grid-cols-7 gap-3">
        {BUCKETS.map((b) => (
          <IconCard
            key={b}
            icon={`duration.${b}`}
            label={tKey(`duration.${b}`, lang)}
            pictureFirst={mode === "picture"}
            selected={bucket === b}
            onClick={() => {
              setBucket(b);
              const u = DEFAULT_UNIT[b];
              if (u) setUnit(u);
            }}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-2 text-[24px] text-ink-soft">
          {t("exactNumber", lang)}
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={bucket === "unknown"}
            className="h-16 w-40 rounded-2xl border-2 border-line bg-surface px-4 text-[28px] font-semibold text-ink tabular-nums focus:border-brand disabled:opacity-40"
          />
        </label>
        <div className="flex gap-2" role="radiogroup">
          {UNITS.map((u) => (
            <BigButton key={u} selected={unit === u} aria-pressed={unit === u} disabled={bucket === "unknown"} onClick={() => setUnit(u)} className="min-w-32">
              {tKey(`unit.${u}`, lang)}
            </BigButton>
          ))}
        </div>
        <BigButton
          tone="primary"
          icon="yes"
          disabled={!bucket || !validNumber}
          className="ms-auto min-w-56"
          onClick={() =>
            bucket &&
            onAnswer({
              kind: "duration",
              bucket,
              amount: bucket === "unknown" ? null : n,
              unit: bucket === "unknown" || n == null ? null : unit,
            })
          }
        >
          {t("done", lang)}
        </BigButton>
      </div>
    </div>
  );
}
