"use client";

import { t } from "@/lib/i18n";
import { BigButton } from "../ui";
import type { WidgetProps } from "./types";

export function YesNoWidget({ lang, onAnswer, mode }: WidgetProps) {
  const big = mode === "picture" ? 96 : 72;
  return (
    <div className="grid grid-cols-2 gap-6">
      <BigButton tone="yes" icon="yes" iconSize={big} className="min-h-56 flex-col text-[36px]" onClick={() => onAnswer({ kind: "yesno", value: "yes" })}>
        {t("yes", lang)}
      </BigButton>
      <BigButton tone="no" icon="no" iconSize={big} className="min-h-56 flex-col text-[36px]" onClick={() => onAnswer({ kind: "yesno", value: "no" })}>
        {t("no", lang)}
      </BigButton>
    </div>
  );
}
