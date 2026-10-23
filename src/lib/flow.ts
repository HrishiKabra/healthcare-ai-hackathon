import { buildChart, isRealAllergy } from "./chart";
import { QUESTIONS } from "./questions";
import type { ClinicalChart, Condition, EmtInputs, PredicateName, Question } from "./schemas";
import type { SessionState } from "./session";

export type QuestionStatus = "not_asked" | "asked" | "answered" | "confirmed" | "skipped";

export type FlowInput = Pick<SessionState, "answers" | "asked" | "skipped" | "emt" | "startedAt">;

type Ctx = { chart: ClinicalChart; emt: EmtInputs };

/** Complaints where pain questions (quality, spread, 0 to 10) make sense. */
export const PAIN_COMPLAINTS = ["chest_pain", "belly_pain", "fall_injury", "bleeding", "other"];

const PREDICATES: Record<PredicateName, (c: Ctx) => boolean> = {
  painComplaint: ({ chart }) => !chart.chiefComplaint || PAIN_COMPLAINTS.includes(chart.chiefComplaint.value),
  strokeSuspected: ({ chart }) =>
    chart.chiefComplaint?.value === "weakness_numbness" ||
    chart.strokeScreen.speechAbnormal?.value === true ||
    chart.strokeScreen.facialDroop?.value === true ||
    chart.strokeScreen.armDrift?.value === true,
  possiblyPregnant: ({ chart, emt }) => {
    if (chart.conditions.some((c) => c.value === "pregnancy")) return true;
    if (emt.sex === "male") return false;
    const age = parseInt(emt.age, 10);
    return Number.isNaN(age) || (age >= 12 && age <= 55);
  },
  allergyNeedsDetail: ({ chart }) =>
    chart.allergies.some((a) => a.value.category === "unspecified") && !chart.allergies.some((a) => isRealAllergy(a.value)),
};

export function evalCondition(cond: Condition, ctx: Ctx): boolean {
  switch (cond.type) {
    case "chartIn": {
      if (cond.field === "chiefComplaint") {
        const v = ctx.chart.chiefComplaint?.value;
        return v != null && cond.values.includes(v);
      }
      return ctx.chart.conditions.some((c) => cond.values.includes(c.value));
    }
    case "predicate":
      return PREDICATES[cond.name](ctx);
    case "all":
      return cond.conditions.every((c) => evalCondition(c, ctx));
    case "any":
      return cond.conditions.some((c) => evalCondition(c, ctx));
  }
}

export function questionStatus(id: string, s: FlowInput): QuestionStatus {
  const answers = s.answers.filter((a) => a.questionId === id && a.status !== "rejected");
  if (answers.some((a) => a.status === "confirmed")) return "confirmed";
  if (answers.length) return "answered";
  if (s.skipped.includes(id)) return "skipped";
  if (s.asked.includes(id)) return "asked";
  return "not_asked";
}

/**
 * A question is in the queue when its showIf passes, or when it has already
 * been touched (so an answered follow-up never silently disappears).
 */
export function isQuestionVisible(q: Question, s: FlowInput, chart: ClinicalChart = buildChart(s.answers, s.startedAt)): boolean {
  if (questionStatus(q.id, s) !== "not_asked") return true;
  return q.showIf == null || evalCondition(q.showIf, { chart, emt: s.emt });
}

export function visibleQuestions(s: FlowInput): Question[] {
  const chart = buildChart(s.answers, s.startedAt);
  return QUESTIONS.filter((q) => isQuestionVisible(q, s, chart));
}

/**
 * The next question to ask: the first visible question, in protocol order,
 * that has not been answered, confirmed, or skipped. `currentId` is excluded
 * so "Next question" always moves forward.
 */
export function nextQuestion(s: FlowInput, currentId?: string | null): Question | null {
  const chart = buildChart(s.answers, s.startedAt);
  for (const q of QUESTIONS) {
    if (q.id === currentId) continue;
    const st = questionStatus(q.id, s);
    if (st === "answered" || st === "confirmed" || st === "skipped") continue;
    if (isQuestionVisible(q, s, chart)) return q;
  }
  return null;
}
