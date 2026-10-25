"use client";

import { Volume2 } from "lucide-react";
import { Icon } from "@/components/shared/Icon";
import { questionText, t, tKey } from "@/lib/i18n";
import { getLanguage } from "@/lib/languages";
import type { LangCode, PatientMode, Question } from "@/lib/schemas";
import { speak } from "@/lib/speech";
import { AslSlot } from "./AslSlot";

/** The laminated card: big question, reflective band on the leading edge. */
export function QuestionCard({ q, lang, mode, freeform }: { q: Question; lang: LangCode; mode: PatientMode; freeform?: boolean }) {
  const text = questionText(q, lang);
  const asl = mode === "asl";
  return (
    <section className="flex gap-5 rounded-3xl border-s-[14px] border-signal bg-surface px-6 py-5 shadow-[0_1px_0_#d5dbe3]" aria-live="polite">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {freeform ? <p className="text-[24px] font-medium text-ink-soft">{t("freeFormLabel", lang)}</p> : null}
        <div className="flex items-start gap-4">
          <h1 className={`min-w-0 flex-1 font-semibold leading-[1.15] text-ink ${mode === "picture" ? "text-[36px]" : "text-[42px]"}`}>{text}</h1>
          {!asl ? (
            <button
              type="button"
              onClick={() => speak(text, getLanguage(lang).speechTag)}
              className="flex min-h-16 shrink-0 items-center gap-2 rounded-2xl border-2 border-line px-4 text-[24px] font-semibold text-brand-strong hover:border-brand"
            >
              <Volume2 size={30} aria-hidden />
              {t("readAloud", lang)}
            </button>
          ) : null}
        </div>
        {lang !== "en" && !asl ? (
          <p className="text-[24px] text-muted" lang="en" dir="ltr" style={{ textAlign: "start" }}>
            <bdi>{q.english}</bdi>
          </p>
        ) : null}
        {q.reassure ? <p className="text-[24px] font-medium text-ok">{tKey(q.reassure, lang)}</p> : null}
      </div>
      {asl ? (
        <div className="w-[360px] shrink-0">
          <AslSlot questionId={q.id} icon={q.icon} src={q.aslVideo} />
        </div>
      ) : mode === "picture" ? (
        <div className="flex w-44 shrink-0 items-center justify-center rounded-2xl bg-brand-soft">
          <Icon name={q.icon} size={112} strokeWidth={1.5} className="text-brand" />
        </div>
      ) : null}
    </section>
  );
}
