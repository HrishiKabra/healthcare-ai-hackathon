"use client";

import { useMemo, useState } from "react";
import { usePatientAnswering, type AnswerSink, type FreeInterpretation } from "@/hooks/usePatientAnswering";
import { LANGUAGES } from "@/lib/languages";
import { QUESTIONS } from "@/lib/questions";
import { LangCode, PatientMode, type Question } from "@/lib/schemas";
import { PatientScreen } from "./PatientScreen";

// Dev-only walkthrough of every question and widget, no session needed:
// /patient?preview=1&lang=es&mode=spoken

const noopSink: AnswerSink = { proposed: () => {}, confirmed: () => {}, rejected: () => {} };

async function echoFree(_q: Question, text: string): Promise<FreeInterpretation> {
  return {
    patch: [{ field: "notes", value: text, confidence: "low" }],
    confirmText: { native: text, english: text },
    english: text,
    source: "baseline",
    needsReview: true,
  };
}

export function PatientPreview({ initialLang, initialMode, initialQuestion }: { initialLang: string | null; initialMode: string | null; initialQuestion?: string | null }) {
  const [lang, setLang] = useState<LangCode>(LangCode.safeParse(initialLang).data ?? "es");
  const [mode, setMode] = useState<PatientMode>(PatientMode.safeParse(initialMode).data ?? "spoken");
  const [i, setI] = useState(() => Math.max(0, QUESTIONS.findIndex((x) => x.id === initialQuestion)));
  const q = QUESTIONS[i];
  const sink = useMemo(() => noopSink, []);
  const ans = usePatientAnswering({ q, lang: mode === "asl" ? "en" : lang, sink, interpretFree: echoFree });

  return (
    <div className="flex flex-1 flex-col">
      <div className="no-print flex flex-wrap items-center gap-2 border-b border-line bg-surface px-4 py-2 text-sm">
        <span className="font-semibold text-ink-soft">Widget preview</span>
        <button className="rounded border border-line px-3 py-1" onClick={() => setI((x) => Math.max(0, x - 1))}>
          Previous
        </button>
        <select className="rounded border border-line px-2 py-1" value={i} onChange={(e) => setI(Number(e.target.value))}>
          {QUESTIONS.map((x, idx) => (
            <option key={x.id} value={idx}>
              {idx + 1}. {x.id} ({x.answerType})
            </option>
          ))}
        </select>
        <button className="rounded border border-line px-3 py-1" onClick={() => setI((x) => Math.min(QUESTIONS.length - 1, x + 1))}>
          Next
        </button>
        <select className="rounded border border-line px-2 py-1" value={lang} onChange={(e) => setLang(e.target.value as LangCode)}>
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.englishName}
            </option>
          ))}
        </select>
        <select className="rounded border border-line px-2 py-1" value={mode} onChange={(e) => setMode(e.target.value as PatientMode)}>
          <option value="spoken">Spoken language</option>
          <option value="asl">ASL</option>
          <option value="picture">Picture board</option>
        </select>
      </div>
      <PatientScreen q={q} lang={mode === "asl" ? "en" : lang} mode={mode} step={ans.step} onAnswer={ans.onAnswer} onFreeText={ans.onFreeText} onConfirm={ans.onConfirm} />
    </div>
  );
}
