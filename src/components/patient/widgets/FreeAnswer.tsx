"use client";

import { Mic, Square } from "lucide-react";
import { useCallback, useState } from "react";
import { useSpeechInput } from "@/hooks/useSpeechInput";
import { t } from "@/lib/i18n";
import { getLanguage } from "@/lib/languages";
import type { LangCode } from "@/lib/schemas";
import { BigButton } from "../ui";

/** Mic plus a text box. Typing always works, even when speech is unavailable. */
export function FreeTextInput({ lang, onSubmit, autoFocus = false }: { lang: LangCode; onSubmit: (text: string) => void; autoFocus?: boolean }) {
  const [text, setText] = useState("");
  const onFinal = useCallback((heard: string) => setText((prev) => (prev ? `${prev} ${heard}` : heard)), []);
  const speech = useSpeechInput(getLanguage(lang).speechTag, onFinal);
  const send = () => {
    const v = text.trim();
    if (v) onSubmit(v);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-stretch gap-3">
        {speech.available ? (
          <button
            type="button"
            onClick={speech.listening ? speech.stop : speech.start}
            aria-pressed={speech.listening}
            className={`flex min-h-16 min-w-40 touch-manipulation items-center justify-center gap-3 rounded-2xl border-2 px-4 text-[24px] font-semibold ${
              speech.listening ? "animate-pulse border-no bg-no text-white" : "border-brand bg-brand-soft text-brand-strong"
            }`}
          >
            {speech.listening ? <Square size={32} aria-hidden /> : <Mic size={32} aria-hidden />}
            {speech.listening ? t("stop", lang) : t("speak", lang)}
          </button>
        ) : null}
        <textarea
          value={speech.listening && speech.interim ? speech.interim : text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("typeHere", lang)}
          autoFocus={autoFocus}
          rows={2}
          lang={getLanguage(lang).speechTag}
          className="min-h-16 flex-1 resize-none rounded-2xl border-2 border-line bg-surface px-4 py-3 text-[26px] leading-snug focus:border-brand"
        />
        <BigButton tone="primary" icon="yes" disabled={!text.trim()} onClick={send} className="min-w-40">
          {t("send", lang)}
        </BigButton>
      </div>
      {speech.listening ? <p className="text-[24px] text-ink-soft">{t("listening", lang)}</p> : null}
      {!speech.available ? <p className="text-[24px] text-ink-soft">{t("micUnavailable", lang)}</p> : null}
    </div>
  );
}
