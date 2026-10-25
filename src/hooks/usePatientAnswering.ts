"use client";

import { useCallback, useState } from "react";
import { interpretStructured } from "@/lib/interpret";
import type { Answer, AnswerValue, Confidence, ConfirmText, LangCode, PatchEntry, Question } from "@/lib/schemas";
import type { Utterance } from "@/lib/session";

export type FreeInterpretation = {
  patch: PatchEntry[];
  confirmText: ConfirmText;
  english: string;
  source: Answer["source"];
  needsReview: boolean;
};

export type PatientStep =
  | { kind: "answering"; notice?: "couldNotUnderstand" }
  | { kind: "thinking" }
  | { kind: "confirm"; answer: Answer }
  | { kind: "thanks" };

export type AnswerSink = {
  proposed: (a: Answer) => void;
  confirmed: (answerId: string) => void;
  rejected: (answerId: string) => void;
  /** The patient's own words and, once ready, their English translation, for the live conversation. */
  heard?: (u: Utterance) => void;
};

function answerId(): string {
  return `ans-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Local state machine for one question on the patient screen:
 * answering -> (thinking) -> confirm -> thanks, or back to answering on "No".
 * Transport-agnostic: the caller decides where answers go.
 */
export function usePatientAnswering(opts: {
  q: Question | null;
  /** Changes whenever the question is (re)sent; defaults to the question id. */
  promptKey?: string | null;
  lang: LangCode;
  sink: AnswerSink;
  interpretFree: (q: Question, text: string, lang: LangCode, onTranslated?: (english: string | null, confidence: Confidence) => void) => Promise<FreeInterpretation>;
}) {
  const { q, lang, sink, interpretFree } = opts;
  const key = opts.promptKey !== undefined ? opts.promptKey : (q?.id ?? null);
  const [step, setStep] = useState<PatientStep>({ kind: "answering" });
  const [forKey, setForKey] = useState<string | null>(key);

  // Reset when a new question arrives (state derived from props, no effect needed).
  if (key !== forKey) {
    setForKey(key);
    setStep({ kind: "answering" });
  }

  const propose = useCallback(
    (a: Answer) => {
      sink.proposed(a);
      setStep({ kind: "confirm", answer: a });
    },
    [sink],
  );

  const onAnswer = useCallback(
    (value: AnswerValue) => {
      if (!q) return;
      const { patch, confirmText } = interpretStructured(q, value, lang);
      propose({ id: answerId(), questionId: q.id, value, language: lang, by: "patient", status: "pending", at: Date.now(), patch, confirmText, source: "structured" });
    },
    [q, lang, propose],
  );

  const onFreeText = useCallback(
    async (text: string) => {
      if (!q) return;
      setStep({ kind: "thinking" });
      // The same id links the conversation line to the answer it becomes.
      const id = answerId();
      const line: Utterance = { id, at: Date.now(), from: "patient", original: text, language: lang, translation: lang === "en" ? text : null, status: lang === "en" ? "done" : "translating", questionId: q.id };
      sink.heard?.(line);
      try {
        const r = await interpretFree(q, text, lang, (english, confidence) =>
          sink.heard?.(english == null ? { ...line, status: "failed" } : { ...line, translation: english, status: "done", confidence }),
        );
        if (!r.patch.length && !r.confirmText.native.trim()) {
          setStep({ kind: "answering", notice: "couldNotUnderstand" });
          return;
        }
        propose({
          id,
          questionId: q.id,
          value: { kind: "free", text, english: r.english },
          language: lang,
          by: "patient",
          status: "pending",
          at: Date.now(),
          patch: r.patch,
          confirmText: r.confirmText,
          source: r.source,
          needsReview: r.needsReview,
        });
      } catch {
        sink.heard?.({ ...line, status: "failed" });
        setStep({ kind: "answering", notice: "couldNotUnderstand" });
      }
    },
    [q, lang, interpretFree, propose, sink],
  );

  const onConfirm = useCallback(
    (yes: boolean) => {
      if (step.kind !== "confirm") return;
      if (yes) {
        sink.confirmed(step.answer.id);
        setStep({ kind: "thanks" });
      } else {
        sink.rejected(step.answer.id);
        setStep({ kind: "answering" });
      }
    },
    [step, sink],
  );

  return { step, onAnswer, onFreeText, onConfirm };
}
