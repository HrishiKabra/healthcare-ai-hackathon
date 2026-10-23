"use client";

import { useState } from "react";
import { choiceLabel, t } from "@/lib/i18n";
import { toggleChoice } from "@/lib/choice";
import { BigButton, IconCard } from "../ui";
import type { WidgetProps } from "./types";

export function ChoiceGrid({ q, lang, mode, onAnswer, multi, compact = false }: WidgetProps & { multi: boolean; compact?: boolean }) {
  const [selected, setSelected] = useState<string[]>([]);
  const n = q.choices.length;
  const cols = compact ? (n === 5 ? "grid-cols-5" : "grid-cols-3") : n > 6 ? "grid-cols-4" : n > 4 ? "grid-cols-3" : "grid-cols-2 lg:grid-cols-3";
  return (
    <div className="flex flex-col gap-4">
      {multi && !compact ? <p className="text-[24px] text-ink-soft">{t("chooseAll", lang)}</p> : null}
      <div className={`grid gap-4 ${cols}`}>
        {q.choices.map((c) => (
          <IconCard
            key={c.id}
            icon={c.icon}
            label={choiceLabel(q, c.id, lang)}
            pictureFirst={mode === "picture"}
            compact={compact}
            selected={selected.includes(c.id)}
            onClick={() => {
              if (!multi) {
                onAnswer({ kind: "choice", choiceIds: [c.id] });
                return;
              }
              setSelected((s) => toggleChoice(s, c, q.choices));
            }}
          />
        ))}
      </div>
      {multi ? (
        <BigButton tone="primary" icon="yes" disabled={!selected.length} onClick={() => onAnswer({ kind: "choice", choiceIds: selected })} className="self-end min-w-64">
          {t("done", lang)}
        </BigButton>
      ) : null}
    </div>
  );
}

export function ChoiceWidget(props: WidgetProps) {
  return <ChoiceGrid {...props} multi={!!props.q.multi} />;
}
