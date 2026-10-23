import { buildChart } from "./chart";
import { EmtInputs, type Answer, type ClinicalChart, type LangCode, type PatientMode } from "./schemas";

/** A question the EMT typed or spoke that is not in the bank. */
export type FreeformQuestion = {
  id: string;
  english: string;
  native: string;
  language: LangCode;
  confidence: "high" | "medium" | "low";
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
  | { type: "clearCurrent" }
  | { type: "answerProposed"; answer: Answer }
  | { type: "answerConfirmed"; answerId: string }
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
    acknowledgedFlags: [],
    scenarioId: null,
    handoffSentAt: null,
    ended: false,
  };
}

function addOnce(list: string[], v: string): string[] {
  return list.includes(v) ? list : [...list, v];
}

function setStatus(s: SessionState, answerId: string, status: Answer["status"]): SessionState {
  return { ...s, answers: s.answers.map((a) => (a.id === answerId ? { ...a, status } : a)) };
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
    case "ask":
      return {
        ...s,
        current: { kind: "bank", questionId: e.questionId, at: e.at },
        asked: addOnce(s.asked, e.questionId),
        skipped: s.skipped.filter((q) => q !== e.questionId),
      };
    case "askFreeform":
      return {
        ...s,
        current: { kind: "freeform", id: e.question.id, at: e.at },
        freeform: [...s.freeform.filter((f) => f.id !== e.question.id), e.question],
        asked: addOnce(s.asked, e.question.id),
      };
    case "clearCurrent":
      return { ...s, current: null };
    case "answerProposed":
      if (s.answers.some((a) => a.id === e.answer.id)) return s;
      return { ...s, answers: [...s.answers, e.answer], asked: addOnce(s.asked, e.answer.questionId) };
    case "answerConfirmed":
      return setStatus(s, e.answerId, "confirmed");
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
