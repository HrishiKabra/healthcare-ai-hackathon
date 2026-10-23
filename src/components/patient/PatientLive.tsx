"use client";

import { useMemo } from "react";
import { LanguageGrid } from "@/components/shared/LanguageGrid";
import { usePatientAnswering, type AnswerSink } from "@/hooks/usePatientAnswering";
import { useSessionFollower } from "@/hooks/usePatientSession";
import { interpretFreeAnswer } from "@/lib/ai/client";
import { freeformAsQuestion } from "@/lib/emt";
import { getQuestion } from "@/lib/questions";
import type { Question } from "@/lib/schemas";
import { promptKey, type SessionState } from "@/lib/session";
import { PatientScreen } from "./PatientScreen";

export function currentQuestion(state: SessionState | null): { q: Question | null; freeform: boolean } {
  const c = state?.current;
  if (!state || !c) return { q: null, freeform: false };
  if (c.kind === "bank") return { q: getQuestion(c.questionId) ?? null, freeform: false };
  const f = state.freeform.find((x) => x.id === c.id);
  return { q: f ? freeformAsQuestion(f) : null, freeform: true };
}

/** The patient's screen, following the EMT window over BroadcastChannel. */
export function PatientLive({ sessionId, extras }: { sessionId: string; extras?: React.ReactNode }) {
  const { state, ended, send } = useSessionFollower(sessionId, "patient");
  const { q, freeform } = currentQuestion(state);
  const lang = state?.mode === "asl" ? "en" : (state?.language ?? "en");
  const mode = state?.mode ?? "spoken";
  const sink: AnswerSink = useMemo(
    () => ({
      proposed: (answer) => send({ type: "answerProposed", answer }),
      confirmed: (answerId) => send({ type: "answerConfirmed", answerId }),
      rejected: (answerId) => send({ type: "answerRejected", answerId }),
    }),
    [send],
  );
  const ans = usePatientAnswering({ q, promptKey: promptKey(state?.current ?? null), lang, sink, interpretFree: interpretFreeAnswer });

  if (state && !state.mode && !ended) {
    return (
      <div className="flex flex-1 flex-col justify-center gap-6 bg-canvas p-8">
        <LanguageGrid onPick={(l) => send({ type: "setMode", mode: "spoken", language: l })} />
      </div>
    );
  }

  return (
    <PatientScreen
      q={q}
      freeform={freeform}
      lang={lang}
      mode={mode}
      step={ans.step}
      ended={ended}
      onAnswer={ans.onAnswer}
      onFreeText={ans.onFreeText}
      onConfirm={ans.onConfirm}
      extras={extras}
    />
  );
}
