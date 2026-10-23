"use client";

import { ChevronRight, SkipForward } from "lucide-react";
import { questionStatus, visibleQuestions, type QuestionStatus } from "@/lib/flow";
import { isQuestionVerified } from "@/lib/i18n";
import type { Question } from "@/lib/schemas";
import type { SessionState } from "@/lib/session";
import { sessionChart } from "@/lib/session";

const STATUS: Record<QuestionStatus, { label: string; cls: string }> = {
  not_asked: { label: "Not asked", cls: "bg-canvas text-muted" },
  asked: { label: "Asked", cls: "bg-signal-soft text-warning" },
  answered: { label: "Answered", cls: "bg-unconfirmed-soft text-unconfirmed" },
  confirmed: { label: "Confirmed", cls: "bg-ok-soft text-ok" },
  skipped: { label: "Skipped", cls: "bg-canvas text-muted line-through" },
};

const PHASE_LABEL: Record<Question["phase"], string> = {
  opening: "Opening",
  opqrst: "OPQRST",
  sample: "SAMPLE",
  followup: "Follow-up",
  stroke: "Stroke check",
  closing: "Closing",
};

export function QuestionQueue({
  state,
  onAsk,
  onSkip,
  onNext,
  onObserve,
}: {
  state: SessionState;
  onAsk: (id: string) => void;
  onSkip: (id: string) => void;
  onNext: () => void;
  onObserve: (questionId: string, value: boolean) => void;
}) {
  const qs = visibleQuestions(state);
  const chart = sessionChart(state);
  const currentId = state.current?.kind === "bank" ? state.current.questionId : null;
  const lang = state.mode === "spoken" ? state.language : "en";

  return (
    <section aria-label="Question queue" className="flex min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 pb-2">
        <h2 className="text-base font-semibold">Questions</h2>
        <button type="button" onClick={onNext} className="flex items-center gap-1 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-strong">
          Next question <ChevronRight size={16} aria-hidden />
        </button>
      </div>
      <ol className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pe-1">
        {qs.map((q, i) => {
          const st = questionStatus(q.id, state);
          const current = q.id === currentId;
          const header = i === 0 || qs[i - 1].phase !== q.phase ? PHASE_LABEL[q.phase] : null;
          const observed =
            q.answerType === "instruction"
              ? chart.strokeScreen[q.chartField as "facialDroop" | "armDrift" | "speechAbnormal"]?.value
              : undefined;
          return (
            <li key={q.id}>
              {header ? <p className="mt-2 px-1 text-xs font-semibold text-muted">{header}</p> : null}
              <div
                className={`group rounded-lg border px-2 py-1.5 ${current ? "border-signal bg-signal-soft ring-2 ring-signal/40" : "border-transparent hover:border-line hover:bg-surface"}`}
              >
                <div className="flex items-start gap-2">
                  <button type="button" onClick={() => onAsk(q.id)} className="min-w-0 flex-1 text-start text-sm leading-snug" title="Send to patient screen">
                    <span className={current ? "font-semibold" : ""}>{q.english}</span>
                    {lang !== "en" && !isQuestionVerified(q, lang) ? (
                      <span className="ms-1 inline-block size-2 rounded-full bg-warning align-middle" title="Unverified translation" aria-label="Unverified translation" />
                    ) : null}
                  </button>
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold ${STATUS[st].cls}`}>{STATUS[st].label}</span>
                  {st !== "confirmed" && st !== "skipped" ? (
                    <button type="button" onClick={() => onSkip(q.id)} className="shrink-0 rounded p-0.5 text-muted opacity-60 hover:opacity-100" aria-label={`Skip: ${q.english}`} title="Skip">
                      <SkipForward size={14} aria-hidden />
                    </button>
                  ) : null}
                </div>
                {q.answerType === "instruction" ? (
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <span className="text-ink-soft">EMT records:</span>
                    {[true, false].map((v) => (
                      <button
                        key={String(v)}
                        type="button"
                        onClick={() => onObserve(q.id, v)}
                        aria-pressed={observed === v}
                        className={`rounded-md border px-2 py-1 font-semibold ${
                          observed === v ? (v ? "border-critical bg-critical text-white" : "border-ok bg-ok text-white") : "border-line bg-surface hover:border-brand"
                        }`}
                      >
                        {v ? "Abnormal" : "Normal"}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
