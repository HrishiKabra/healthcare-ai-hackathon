"use client";

import { Icon } from "@/components/shared/Icon";
import { t } from "@/lib/i18n";
import type { WidgetProps } from "./types";

/** Stroke checks: the patient follows the instruction, the EMT records what they see. */
export function InstructionWidget({ q, lang }: WidgetProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-6 text-center">
      <Icon name={q.icon} size={160} strokeWidth={1.5} className="text-brand" />
      <p className="text-[30px] text-ink-soft">{t("instructionWatching", lang)}</p>
    </div>
  );
}
