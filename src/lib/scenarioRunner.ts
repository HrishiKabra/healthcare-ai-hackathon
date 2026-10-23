import { interpretFree, type AiCalls } from "./ai/pipeline";
import { buildChart } from "./chart";
import { emtObservation } from "./emt";
import { interpretStructured } from "./interpret";
import { requireQuestion } from "./questions";
import { evaluateRules } from "./rules";
import type { Answer, ClinicalChart, RedFlag } from "./schemas";
import type { Scenario } from "./scenarios";

export type ScenarioRun = { answers: Answer[]; chart: ClinicalChart; flags: RedFlag[]; unreadable: string[] };

/**
 * Runs a scripted scenario through the same pipeline the screens use, with
 * every answer confirmed by the patient. Pure apart from the AI calls passed in.
 */
export async function runScenario(sc: Scenario, calls: AiCalls, startedAt: number, now: number = startedAt): Promise<ScenarioRun> {
  const lang = sc.mode === "asl" ? "en" : sc.language;
  const answers: Answer[] = sc.initialObservations.map((o, i) => emtObservation(o.questionId, o.value, startedAt + i));
  const unreadable: string[] = [];
  let at = startedAt + 100;
  for (const step of sc.steps) {
    at += 1000;
    if (step.skip) continue;
    const q = requireQuestion(step.questionId);
    if (step.observe != null) {
      answers.push(emtObservation(step.questionId, step.observe, at));
      continue;
    }
    if (step.answer) {
      const { patch, confirmText } = interpretStructured(q, step.answer, lang);
      answers.push({ id: `${sc.id}-${q.id}`, questionId: q.id, value: step.answer, language: lang, by: "patient", status: "confirmed", at, patch, confirmText, source: "structured" });
      continue;
    }
    if (step.say) {
      const r = await interpretFree(calls, q, step.say, lang);
      if (!r.patch.length) {
        unreadable.push(q.id);
        continue;
      }
      answers.push({
        id: `${sc.id}-${q.id}`,
        questionId: q.id,
        value: { kind: "free", text: step.say, english: r.english },
        language: lang,
        by: "patient",
        status: "confirmed",
        at,
        patch: r.patch,
        confirmText: r.confirmText,
        source: r.source,
        needsReview: r.needsReview,
      });
    }
  }
  const chart = buildChart(answers, startedAt);
  return { answers, chart, flags: evaluateRules(chart, now), unreadable };
}
