import { sameInEveryLanguage } from "./i18n";
import { interpretStructured } from "./interpret";
import { requireQuestion } from "./questions";
import type { Answer } from "./schemas";
import type { FreeformQuestion } from "./session";
import type { Question } from "./schemas";

/** An EMT observation (stroke checks) is recorded as a confirmed answer by the EMT. */
export function emtObservation(questionId: string, value: boolean, at: number = Date.now()): Answer {
  const q = requireQuestion(questionId);
  const v = { kind: "observation", value } as const;
  const { patch, confirmText } = interpretStructured(q, v, "en");
  return {
    id: `obs-${questionId}-${at.toString(36)}`,
    questionId,
    value: v,
    language: "en",
    by: "emt",
    status: "confirmed",
    at,
    patch,
    confirmText,
    source: "emt",
  };
}

/** Free-form EMT questions reuse the free-answer widget by posing as a bank question. */
export function freeformAsQuestion(f: FreeformQuestion): Question {
  const translations = sameInEveryLanguage(f.native);
  return {
    id: f.id,
    phase: "closing",
    english: f.english,
    answerType: "free",
    choices: [],
    chartField: "notes",
    showIf: null,
    icon: "chat",
    translations,
    translationsVerified: sameInEveryLanguage(false),
    aslVideo: "",
  };
}
