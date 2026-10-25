import { buildChart } from "./chart";
import { getQuestion } from "./questions";
import { EmtInputs, type Answer, type ClinicalChart, type Confidence, type LangCode, type PatientMode } from "./schemas";

/** A question the EMT typed or spoke that is not in the bank. */
export type FreeformQuestion = {
  id: string;
  english: string;
  native: string;
  language: LangCode;
  confidence: "high" | "medium" | "low";
};

/**
 * One line of the live conversation. EMT lines hold the English question and
 * what the patient was shown; patient lines hold their own words and the
 * English translation, which arrives a moment later.
 */
export type Utterance = {
  id: string;
  at: number;
  from: "emt" | "patient";
  /** As said or shown, in the language it was said in. */
  original: string;
  language: LangCode;
  /** The other side's language: the patient's language for EMT lines, English for patient lines. */
  translation: string | null;
  status: "translating" | "done" | "failed";
  /** When the translation arrived. */
  doneAt?: number;
  confidence?: Confidence;
  questionId?: string;
};

export type CurrentPrompt = { kind: "bank"; questionId: string; at: number } | { kind: "freeform"; id: string; at: number };

export type SessionState = {
  id: string;
  startedAt: number;
  mode: PatientMode | null;
  /** Language the patient screen is shown in. ASL and picture board use English text. */
  language: LangCode;
  emt: EmtInputs;
  answers: Answer[];
  asked: string[];
  skipped: string[];
  current: CurrentPrompt | null;
  freeform: FreeformQuestion[];
  utterances: Utterance[];
  acknowledgedFlags: string[];
  scenarioId: string | null;
  handoffSentAt: number | null;
  ended: boolean;
};

export type SessionEvent =
  | { type: "setMode"; mode: PatientMode; language: LangCode }
  | { type: "setEmt"; emt: Partial<EmtInputs> }
  | { type: "ask"; questionId: string; at: number }
  | { type: "askFreeform"; question: FreeformQuestion; at: number }
  | { type: "utterance"; utterance: Utterance }
  | { type: "clearCurrent" }
  | { type: "answerProposed"; answer: Answer }
  | { type: "answerConfirmed"; answerId: string; at?: number }
  | { type: "answerRejected"; answerId: string }
  | { type: "skip"; questionId: string }
  | { type: "unskip"; questionId: string }
  | { type: "ackFlag"; ruleId: string }
  | { type: "setScenario"; scenarioId: string | null }
  | { type: "handoffSent"; at: number }
  | { type: "end" };

export function newSession(id: string, startedAt: number): SessionState {
  return {
    id,
    startedAt,
    mode: null,
    language: "en",
    emt: EmtInputs.parse({}),
    answers: [],
    asked: [],
    skipped: [],
    current: null,
    freeform: [],
    utterances: [],
    acknowledgedFlags: [],
    scenarioId: null,
    handoffSentAt: null,
    ended: false,
  };
}

function addOnce(list: string[], v: string): string[] {
  return list.includes(v) ? list : [...list, v];
}

/** Adds the line, or replaces the one with the same id (a translation arriving). */
function upsertUtterance(list: Utterance[], u: Utterance): Utterance[] {
  return list.some((x) => x.id === u.id) ? list.map((x) => (x.id === u.id ? u : x)) : [...list, u];
}

function bankUtterance(s: SessionState, questionId: string, at: number): Utterance | null {
  const q = getQuestion(questionId);
  if (!q) return null;
  const native = s.mode !== "asl" && s.language !== "en" ? q.translations[s.language] : undefined;
  return { id: `ask-${questionId}-${at}`, at, from: "emt", original: q.english, language: "en", translation: native ?? null, status: "done", questionId };
}

function setStatus(s: SessionState, answerId: string, status: Answer["status"], at?: number): SessionState {
  return { ...s, answers: s.answers.map((a) => (a.id === answerId ? { ...a, status, ...(at != null ? { confirmedAt: at } : {}) } : a)) };
}

/** Pure reducer. The EMT window owns the state; other windows send events. */
export function sessionReducer(s: SessionState, e: SessionEvent): SessionState {
  switch (e.type) {
    case "setMode":
      return { ...s, mode: e.mode, language: e.language };
    case "setEmt":
      return {
        ...s,
        emt: { ...s.emt, ...e.emt, vitals: { ...s.emt.vitals, ...(e.emt.vitals ?? {}) } },
      };
    case "ask": {
      const u = bankUtterance(s, e.questionId, e.at);
      return {
        ...s,
        utterances: u ? upsertUtterance(s.utterances, u) : s.utterances,
        current: { kind: "bank", questionId: e.questionId, at: e.at },
        asked: addOnce(s.asked, e.questionId),
        skipped: s.skipped.filter((q) => q !== e.questionId),
      };
    }
    case "askFreeform":
      return {
        ...s,
        current: { kind: "freeform", id: e.question.id, at: e.at },
        freeform: [...s.freeform.filter((f) => f.id !== e.question.id), e.question],
        asked: addOnce(s.asked, e.question.id),
        utterances: upsertUtterance(s.utterances, {
          id: e.question.id,
          at: s.utterances.find((u) => u.id === e.question.id)?.at ?? e.at,
          from: "emt",
          original: e.question.english,
          language: "en",
          translation: e.question.language === "en" ? null : e.question.native,
          status: "done",
          doneAt: e.at,
          confidence: e.question.confidence,
          questionId: e.question.id,
        }),
      };
    case "utterance":
      return { ...s, utterances: upsertUtterance(s.utterances, e.utterance) };
    case "clearCurrent":
      return { ...s, current: null };
    case "answerProposed":
      if (s.answers.some((a) => a.id === e.answer.id)) return s;
      return { ...s, answers: [...s.answers, e.answer], asked: addOnce(s.asked, e.answer.questionId) };
    case "answerConfirmed":
      return setStatus(s, e.answerId, "confirmed", e.at);
    case "answerRejected":
      return setStatus(s, e.answerId, "rejected");
    case "skip":
      return {
        ...s,
        skipped: addOnce(s.skipped, e.questionId),
        current: s.current?.kind === "bank" && s.current.questionId === e.questionId ? null : s.current,
      };
    case "unskip":
      return { ...s, skipped: s.skipped.filter((q) => q !== e.questionId) };
    case "ackFlag":
      return { ...s, acknowledgedFlags: addOnce(s.acknowledgedFlags, e.ruleId) };
    case "setScenario":
      return { ...s, scenarioId: e.scenarioId };
    case "handoffSent":
      return { ...s, handoffSentAt: e.at };
    case "end":
      return { ...s, ended: true, current: null };
  }
}

export function sessionChart(s: Pick<SessionState, "answers" | "startedAt">): ClinicalChart {
  return buildChart(s.answers, s.startedAt);
}

export function newId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

/** Stable key for the prompt on screen; changes whenever the EMT (re)sends a question. */
export function promptKey(c: CurrentPrompt | null): string | null {
  if (!c) return null;
  return `${c.kind === "bank" ? c.questionId : c.id}@${c.at}`;
}
