import { z } from "zod";
import c01 from "../../eval/scenarios/01-es-chest-pain.json";
import c02 from "../../eval/scenarios/02-asl-fall.json";
import c03 from "../../eval/scenarios/03-picture-stroke.json";
import c04 from "../../eval/scenarios/04-es-xarelto-fall.json";
import c05 from "../../eval/scenarios/05-zh-insulin-dizzy.json";
import c06 from "../../eval/scenarios/06-hi-blood-thinner-fall.json";
import c07 from "../../eval/scenarios/07-vi-penicillin-breathing.json";
import c08 from "../../eval/scenarios/08-ar-chest-tearing.json";
import c09 from "../../eval/scenarios/09-es-pregnant-belly.json";
import c10 from "../../eval/scenarios/10-zh-aspirin-conflict.json";
import { baselineExtract } from "./baseline";
import { extractionToPatch, questionForExtract } from "./ai/extraction";
import type { AiCalls } from "./ai/pipeline";
import type { AiMeta } from "./ai/schemas";
import { runScenario } from "./scenarioRunner";
import { getScenario, ScenarioStep, type Scenario } from "./scenarios";
import { EmtInputs, LangCode, PatientMode, type ClinicalChart } from "./schemas";

// The eval runs scripted cases through the real pipeline twice: once with the
// selected AI provider, once with the keyword baseline, and scores both
// against a gold chart. The difference is what the AI adds.

const Gold = z.object({
  fields: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])),
  medicationClasses: z.array(z.string()),
  allergyCategories: z.array(z.string()),
  flags: z.array(z.string()),
});

export const EvalCase = z.object({
  id: z.string(),
  title: z.string(),
  /** Reuse a demo scenario's script. */
  scenario: z.string().optional(),
  language: LangCode.optional(),
  mode: PatientMode.optional(),
  steps: z.array(ScenarioStep).optional(),
  gold: Gold,
});
export type EvalCase = z.infer<typeof EvalCase>;

export const EVAL_CASES: readonly EvalCase[] = [c01, c02, c03, c04, c05, c06, c07, c08, c09, c10].map((c) => EvalCase.parse(c));

export function caseScenario(c: EvalCase): Scenario {
  const base = c.scenario ? getScenario(c.scenario) : undefined;
  if (base) return base;
  return {
    id: c.id,
    title: c.title,
    summary: c.title,
    mode: c.mode ?? "spoken",
    language: c.language ?? "en",
    emt: EmtInputs.parse({}),
    initialObservations: [],
    expectedFlags: c.gold.flags,
    communicationNeed: "",
    steps: c.steps ?? [],
  };
}

/** Keyword matching only: no translation, no model. Runs anywhere, including the browser. */
export const baselineCalls: AiCalls = {
  translate: async (r) => ({ translation: r.text, backTranslation: r.text, confidence: "low", notes: "", meta: { provider: "baseline", model: "keyword matching" } }),
  extract: async (r) => {
    const q = questionForExtract(r);
    const output = baselineExtract(q, r.answerRaw, r.answerLanguage);
    return { output, patch: extractionToPatch(q, output, [r.answerRaw, r.answerEnglish ?? ""]), needsReview: true, meta: { provider: "baseline", model: "keyword matching" } };
  },
};

/** Wraps calls to record wall time per call and the provider that answered. */
export function instrument(calls: AiCalls): { calls: AiCalls; stats: { n: number; ms: number; metas: AiMeta[] } } {
  const stats = { n: 0, ms: 0, metas: [] as AiMeta[] };
  const wrap =
    <A, R extends { meta: AiMeta }>(fn: (a: A) => Promise<R>) =>
    async (a: A): Promise<R> => {
      const t0 = performance.now();
      const r = await fn(a);
      stats.n += 1;
      stats.ms += performance.now() - t0;
      stats.metas.push(r.meta);
      return r;
    };
  return { calls: { translate: wrap(calls.translate), extract: wrap(calls.extract) }, stats };
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

function chartField(chart: ClinicalChart, field: string): unknown {
  switch (field) {
    case "facialDroop":
    case "armDrift":
    case "speechAbnormal":
      return chart.strokeScreen[field]?.value;
    case "conditions":
    case "region":
    case "radiation":
    case "provocation":
      return chart[field].map((v) => v.value);
    default:
      return (chart as Record<string, { value?: unknown } | undefined>)[field]?.value;
  }
}

export function fieldCorrect(chart: ClinicalChart, field: string, gold: unknown): boolean {
  const got = chartField(chart, field);
  if (Array.isArray(gold)) return Array.isArray(got) && gold.every((g) => got.includes(g));
  return got === gold;
}

export type SetScore = { tp: number; fp: number; fn: number };
function setScore(gold: string[], got: string[]): SetScore {
  const g = new Set(gold);
  const o = new Set(got);
  return { tp: [...o].filter((x) => g.has(x)).length, fp: [...o].filter((x) => !g.has(x)).length, fn: [...g].filter((x) => !o.has(x)).length };
}

export type CaseScore = {
  id: string;
  title: string;
  language: string;
  fields: { correct: number; total: number; misses: string[] };
  meds: SetScore;
  allergies: SetScore;
  flags: SetScore & { got: string[] };
  unreadable: string[];
};

export function scoreCase(c: EvalCase, chart: ClinicalChart, flags: string[], unreadable: string[]): CaseScore {
  const entries = Object.entries(c.gold.fields);
  const misses = entries.filter(([f, g]) => !fieldCorrect(chart, f, g)).map(([f]) => f);
  const medClasses = chart.medications.map((m) => (m.value.generic === "none" ? "none" : m.value.drugClass));
  const allergyCats = chart.allergies.map((a) => a.value.category);
  return {
    id: c.id,
    title: c.title,
    language: caseScenario(c).mode === "asl" ? "ASL" : caseScenario(c).language,
    fields: { correct: entries.length - misses.length, total: entries.length, misses },
    meds: setScore(c.gold.medicationClasses, medClasses),
    allergies: setScore(c.gold.allergyCategories, allergyCats),
    flags: { ...setScore(c.gold.flags, flags), got: flags },
    unreadable,
  };
}

export type Summary = {
  fieldAccuracy: number;
  medAccuracy: number;
  allergyAccuracy: number;
  flagRecall: number;
  flagPrecision: number;
  secondsPerCall: number;
  calls: number;
};

const ratio = (a: number, b: number) => (b === 0 ? 1 : a / b);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** Set accuracy: correct items over the union of gold and predicted (penalizes misses and extras). */
function setAccuracy(scores: SetScore[]): number {
  return ratio(sum(scores.map((s) => s.tp)), sum(scores.map((s) => s.tp + s.fp + s.fn)));
}

export function summarize(scores: CaseScore[], stats: { n: number; ms: number }): Summary {
  const flags = scores.map((s) => s.flags);
  return {
    fieldAccuracy: ratio(sum(scores.map((s) => s.fields.correct)), sum(scores.map((s) => s.fields.total))),
    medAccuracy: setAccuracy(scores.map((s) => s.meds)),
    allergyAccuracy: setAccuracy(scores.map((s) => s.allergies)),
    flagRecall: ratio(sum(flags.map((f) => f.tp)), sum(flags.map((f) => f.tp + f.fn))),
    flagPrecision: ratio(sum(flags.map((f) => f.tp)), sum(flags.map((f) => f.tp + f.fp))),
    secondsPerCall: stats.n ? stats.ms / stats.n / 1000 : 0,
    calls: stats.n,
  };
}

export type EvalRun = { scores: CaseScore[]; summary: Summary; metas: AiMeta[] };

const T0 = Date.UTC(2026, 9, 24, 14, 0, 0);

/** Runs every case with the given calls. */
export async function runEval(calls: AiCalls, cases: readonly EvalCase[] = EVAL_CASES, onCase?: (i: number) => void): Promise<EvalRun> {
  const { calls: inst, stats } = instrument(calls);
  const scores: CaseScore[] = [];
  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    onCase?.(i);
    const run = await runScenario(caseScenario(c), inst, T0, T0 + 10 * 60_000);
    scores.push(scoreCase(c, run.chart, run.flags.map((f) => f.ruleId), run.unreadable));
  }
  return { scores, summary: summarize(scores, stats), metas: stats.metas };
}

export const pct = (x: number) => `${Math.round(x * 100)}%`;
