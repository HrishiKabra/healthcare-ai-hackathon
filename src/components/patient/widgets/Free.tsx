"use client";

import { ChoiceGrid } from "./Choice";
import { FreeTextInput } from "./FreeAnswer";
import type { WidgetProps } from "./types";

/** Free answer: optional quick picks (as icon cards), then speech or typing. */
export function FreeWidget(props: WidgetProps & { onFreeText: (text: string) => void }) {
  const { q, lang, onFreeText } = props;
  return (
    <div className="flex flex-col gap-4">
      {q.choices.length ? <ChoiceGrid {...props} multi compact /> : null}
      <FreeTextInput lang={lang} onSubmit={onFreeText} autoFocus={!q.choices.length} />
    </div>
  );
}
