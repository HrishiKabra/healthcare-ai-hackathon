import { z } from "zod";
import { extractionToPatch } from "./ai/extraction";
import { baselineExtract } from "./baseline";
import { buildChart } from "./chart";
import { EVAL_CASES, fieldCorrect, type EvalCase } from "./eval";
import { interpretStructured } from "./interpret";
import { requireQuestion } from "./questions";
import { evaluateRules } from "./rules";
import { SCENARIOS, type Scenario } from "./scenarios";
import { DurationBucket, type Answer, type AnswerValue, type ChartField, type ClinicalChart, type PatchEntry } from "./schemas";
import type { SessionState } from "./session";
import { readJson, writeJson } from "./storage";

// Field test ("drill") with Tulane EMS. An EMT runs a role-played patient
// twice, once with FirstWords and once their usual way, and we compare how
// fast and how accurately the key facts came out. Only metrics and the EMT's
// survey are kept: no answer text, no transcript, and the patients are actors.

export const DRILL_FACTS = ["complaint", "onset", "allergies", "medications"] as const;
export type DrillFact = (typeof DRILL_FACTS)[number];

export const FACT_LABEL: Record<DrillFact | "flag", string> = {
  complaint: "Chief complaint",
  onset: "Onset",
  allergies: "Allergies",
  medications: "Medications",
  flag: "Red flag",
};

const FACT_FIELDS: Record<DrillFact, ChartField[]> = {
  complaint: ["chiefComplaint"],
  onset: ["onset", "lastKnownWell"],
  allergies: ["allergies"],
  medications: ["medications"],
};

export const DrillArm = z.enum(["firstwords", "usual"]);
export type DrillArm = z.infer<typeof DrillArm>;
export const ARM_LABEL: Record<DrillArm, string> = { firstwords: "FirstWords", usual: "Usual method" };

const Seconds = z.number().nullable();

export const DrillSurvey = z.object({
  /** System Usability Scale, 10 answers from 1 (strongly disagree) to 5 (strongly agree). FirstWords arm only. */
  sus: z.array(z.number().int().min(1).max(5)).length(10).optional(),
  confidence: z.number().int().min(1).max(5).optional(),
  wouldUse: z.enum(["yes", "maybe", "no"]).optional(),
  missing: z.string().optional(),
  worried: z.string().optional(),
});
export type DrillSurvey = z.infer<typeof DrillSurvey>;

export const DrillMetrics = z.object({
  totalSeconds: z.number(),
  factSeconds: z.object({ complaint: Seconds, onset: Seconds, allergies: Seconds, medications: Seconds }),
  flagSeconds: Seconds,
  flagRecognized: z.boolean(),
  accuracy: z.object({ correct: z.number(), total: z.number(), misses: z.array(z.string()) }),
  /** Answers the patient rejected on the confirm-back screen: misunderstandings caught before they reached the chart. */
  rejected: z.number(),
  questions: z.number(),
  freeform: z.number(),
  medianTranslationSeconds: Seconds,
  neededInterpreter: z.boolean(),
});
export type DrillMetrics = z.infer<typeof DrillMetrics>;

export const DrillRun = z.object({
  id: z.string(),
  /** Initials or a number. Never a name. */
  tester: z.string(),
  arm: DrillArm,
  scenarioId: z.string(),
  createdAt: z.number(),
  sessionId: z.string().optional(),
  metrics: DrillMetrics.optional(),
  survey: DrillSurvey.optional(),
});
export type DrillRun = z.infer<typeof DrillRun>;

// ---------------------------------------------------------------------------
// Scenarios that can be drilled: the ones with a gold chart in the eval
// ---------------------------------------------------------------------------

export type DrillGold = EvalCase["gold"];

export function drillGold(scenarioId: string): DrillGold | undefined {
  return EVAL_CASES.find((c) => c.scenario === scenarioId)?.gold;
}

export const DRILL_SCENARIOS: readonly Scenario[] = SCENARIOS.filter((s) => drillGold(s.id) && s.mode !== "picture");

// ---------------------------------------------------------------------------
// Scoring: the same facts for both arms
// ---------------------------------------------------------------------------

/** Fields both arms can record. Pain quality and the like are left out so the usual method is not penalized for a short form. */
const SCORED_FIELDS = ["chiefComplaint", "headStrike", "severity"];
const SCORED_LABEL: Record<string, string> = { chiefComplaint: "Chief complaint", headStrike: "Head strike", severity: "Pain score" };

export function scoreDrill(chart: ClinicalChart, gold: DrillGold): DrillMetrics["accuracy"] {
  const misses: string[] = [];
  let correct = 0;
  let total = 0;
  for (const [field, g] of Object.entries(gold.fields)) {
    if (!SCORED_FIELDS.includes(field)) continue;
    total += 1;
    if (fieldCorrect(chart, field, g)) correct += 1;
    else misses.push(SCORED_LABEL[field]);
  }
  const meds: string[] = chart.medications.map((m) => (m.value.generic === "none" ? "none" : m.value.drugClass));
  for (const c of gold.medicationClasses) {
    total += 1;
    if (meds.includes(c)) correct += 1;
    else misses.push(`Medication (${c})`);
  }
  const allergies: string[] = chart.allergies.map((a) => a.value.category);
  for (const c of gold.allergyCategories) {
    total += 1;
    if (allergies.includes(c)) correct += 1;
    else misses.push(`Allergy (${c})`);
  }
  return { correct, total, misses };
}

const secs = (ms: number) => Math.round(ms / 100) / 10;

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const confirmedAt = (a: Answer) => a.confirmedAt ?? a.at;

/** Metrics for a FirstWords drill, read from the session at the moment the EMT pressed Finish. */
export function firstWordsMetrics(state: SessionState, scenarioId: string, now: number): DrillMetrics {
  const gold = drillGold(scenarioId);
  const confirmed = state.answers.filter((a) => a.status === "confirmed").sort((a, b) => confirmedAt(a) - confirmedAt(b));
  const since = (t: number) => secs(t - state.startedAt);

  const factSeconds = Object.fromEntries(
    DRILL_FACTS.map((f) => {
      // "Yes, I have an allergy" is not the allergy yet: wait for what it is.
      const counts = (e: PatchEntry) => FACT_FIELDS[f].includes(e.field) && !(e.field === "allergies" && e.value.category === "unspecified");
      const a = confirmed.find((x) => x.patch.some(counts));
      return [f, a ? since(confirmedAt(a)) : null];
    }),
  ) as DrillMetrics["factSeconds"];

  // Replay the confirmed answers to find when the expected red flag first appeared.
  const wanted = gold?.flags ?? [];
  let flagSeconds: number | null = null;
  for (let i = 1; i <= confirmed.length && flagSeconds == null; i++) {
    const t = confirmedAt(confirmed[i - 1]);
    const flags = evaluateRules(buildChart(confirmed.slice(0, i), state.startedAt), t).map((f) => f.ruleId);
    if (flags.some((id) => (wanted.length ? wanted.includes(id) : true))) flagSeconds = since(t);
  }

  const chart = buildChart(confirmed, state.startedAt);
  const translations = state.utterances.filter((u) => u.status === "done" && u.doneAt != null && u.translation !== u.original).map((u) => (u.doneAt! - u.at) / 1000);
  const mt = median(translations);
  return {
    totalSeconds: since(now),
    factSeconds,
    flagSeconds,
    flagRecognized: flagSeconds != null,
    accuracy: gold ? scoreDrill(chart, gold) : { correct: 0, total: 0, misses: [] },
    rejected: state.answers.filter((a) => a.status === "rejected").length,
    questions: state.asked.length,
    freeform: state.freeform.length,
    medianTranslationSeconds: mt == null ? null : Math.round(mt * 10) / 10,
    neededInterpreter: false,
  };
}

// ---------------------------------------------------------------------------
// Usual method: a stopwatch plus "what did you record"
// ---------------------------------------------------------------------------

export const UsualRecord = z.object({
  chiefComplaint: z.string().nullable(),
  onset: DurationBucket.nullable(),
  severity: z.number().int().min(0).max(10).nullable(),
  headStrike: z.enum(["yes", "no"]).nullable(),
  medications: z.string(),
  noMedications: z.boolean(),
  allergies: z.string(),
  noAllergies: z.boolean(),
  /** Rule id of the red flag the EMT would report, or null for none. */
  redFlag: z.string().nullable(),
});
export type UsualRecord = z.infer<typeof UsualRecord>;

export type UsualTimes = Partial<Record<DrillFact | "flag", number>>;

function recorded(questionId: string, value: AnswerValue, at: number, patch?: PatchEntry[]): Answer {
  const q = requireQuestion(questionId);
  const interp = interpretStructured(q, value, "en");
  return { id: `usual-${questionId}`, questionId, value, language: "en", by: "emt", status: "confirmed", at, patch: patch ?? interp.patch, confirmText: interp.confirmText, source: "emt" };
}

function freeTextPatch(questionId: string, text: string): PatchEntry[] {
  const q = requireQuestion(questionId);
  return extractionToPatch(q, baselineExtract(q, text, "en"), [text]);
}

/** Turns what the EMT wrote down into a chart, scored exactly like a FirstWords chart. */
export function usualChart(r: UsualRecord, at: number): ClinicalChart {
  const answers: Answer[] = [];
  if (r.chiefComplaint) answers.push(recorded("chief_complaint", { kind: "choice", choiceIds: [r.chiefComplaint] }, at));
  if (r.onset) answers.push(recorded("onset", { kind: "duration", bucket: r.onset }, at));
  if (r.severity != null) answers.push(recorded("severity", { kind: "scale", value: r.severity }, at));
  if (r.headStrike) answers.push(recorded("head_strike", { kind: "yesno", value: r.headStrike }, at));
  if (r.noAllergies) answers.push(recorded("allergy_any", { kind: "yesno", value: "no" }, at));
  else if (r.allergies.trim()) answers.push(recorded("allergy_detail", { kind: "free", text: r.allergies }, at, freeTextPatch("allergy_detail", r.allergies)));
  if (r.noMedications) {
    answers.push(recorded("medications", { kind: "free", text: "none" }, at, [{ field: "medications", value: { raw: "none", generic: "none", drugClass: "none", classSource: "none" }, confidence: "high" }]));
  } else if (r.medications.trim()) {
    answers.push(recorded("medications", { kind: "free", text: r.medications }, at, freeTextPatch("medications", r.medications)));
  }
  return buildChart(answers, at);
}

export function usualMetrics(opts: { scenarioId: string; startedAt: number; finishedAt: number; times: UsualTimes; record: UsualRecord; neededInterpreter: boolean }): DrillMetrics {
  const { scenarioId, startedAt, finishedAt, times, record } = opts;
  const gold = drillGold(scenarioId);
  const at = (k: DrillFact | "flag") => (times[k] != null ? secs(times[k]! - startedAt) : null);
  const flagRecognized = !!record.redFlag && !!gold?.flags.includes(record.redFlag);
  return {
    totalSeconds: secs(finishedAt - startedAt),
    factSeconds: { complaint: at("complaint"), onset: at("onset"), allergies: at("allergies"), medications: at("medications") },
    flagSeconds: flagRecognized ? at("flag") : null,
    flagRecognized,
    accuracy: gold ? scoreDrill(usualChart(record, startedAt), gold) : { correct: 0, total: 0, misses: [] },
    rejected: 0,
    questions: 0,
    freeform: 0,
    medianTranslationSeconds: null,
    neededInterpreter: opts.neededInterpreter,
  };
}

// ---------------------------------------------------------------------------
// Survey and summary
// ---------------------------------------------------------------------------

export const SUS_ITEMS = [
  "I think that I would like to use FirstWords frequently.",
  "I found FirstWords unnecessarily complex.",
  "I thought FirstWords was easy to use.",
  "I think that I would need the support of a technical person to be able to use FirstWords.",
  "I found the various functions in FirstWords were well integrated.",
  "I thought there was too much inconsistency in FirstWords.",
  "I would imagine that most people would learn to use FirstWords very quickly.",
  "I found FirstWords very cumbersome to use.",
  "I felt very confident using FirstWords.",
  "I needed to learn a lot of things before I could get going with FirstWords.",
] as const;

/** Standard SUS score, 0 to 100: odd items score (answer - 1), even items (5 - answer), sum times 2.5. */
export function susScore(answers: number[]): number {
  return answers.reduce((sum, a, i) => sum + (i % 2 === 0 ? a - 1 : 5 - a), 0) * 2.5;
}

export type ArmSummary = {
  arm: DrillArm;
  n: number;
  medianTotal: number | null;
  medianFact: Record<DrillFact | "flag", number | null>;
  /** Share of runs in which each fact was obtained at all. */
  obtained: Record<DrillFact, number>;
  accuracy: number | null;
  flagRecognized: number | null;
  meanSus: number | null;
  susN: number;
  /** The EMT's confidence that what they got was correct, 1 to 5. */
  meanConfidence: number | null;
  misunderstandingsCaught: number;
  neededInterpreter: number;
};

export function summarizeDrills(runs: readonly DrillRun[]): ArmSummary[] {
  return DrillArm.options.map((arm) => {
    const done = runs.filter((r) => r.arm === arm && r.metrics);
    const m = done.map((r) => r.metrics!);
    const sus = done.map((r) => r.survey?.sus).filter((s): s is number[] => !!s).map(susScore);
    const conf = done.map((r) => r.survey?.confidence).filter((c): c is number => c != null);
    const acc = m.reduce((a, x) => ({ c: a.c + x.accuracy.correct, t: a.t + x.accuracy.total }), { c: 0, t: 0 });
    const fact = (f: DrillFact) => median(m.map((x) => x.factSeconds[f]).filter((x): x is number => x != null));
    return {
      arm,
      n: done.length,
      medianTotal: median(m.map((x) => x.totalSeconds)),
      medianFact: { complaint: fact("complaint"), onset: fact("onset"), allergies: fact("allergies"), medications: fact("medications"), flag: median(m.map((x) => x.flagSeconds).filter((x): x is number => x != null)) },
      obtained: Object.fromEntries(DRILL_FACTS.map((f) => [f, done.length ? m.filter((x) => x.factSeconds[f] != null).length / done.length : 0])) as Record<DrillFact, number>,
      accuracy: acc.t ? acc.c / acc.t : null,
      flagRecognized: done.length ? m.filter((x) => x.flagRecognized).length / done.length : null,
      meanSus: sus.length ? sus.reduce((a, b) => a + b, 0) / sus.length : null,
      susN: sus.length,
      meanConfidence: conf.length ? conf.reduce((a, b) => a + b, 0) / conf.length : null,
      misunderstandingsCaught: m.reduce((a, x) => a + x.rejected, 0),
      neededInterpreter: m.filter((x) => x.neededInterpreter).length,
    };
  });
}

const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function drillsCsv(runs: readonly DrillRun[]): string {
  const head = [
    "run", "tester", "arm", "scenario", "date", "total_s",
    ...DRILL_FACTS.map((f) => `${f}_s`), "flag_s", "flag_recognized",
    "accuracy_correct", "accuracy_total", "misses", "misunderstandings_caught", "questions", "freeform_questions",
    "median_translation_s", "needed_interpreter", "sus", "confidence", "would_use", "missing", "worried",
  ];
  const rows = runs.map((r) => {
    const m = r.metrics;
    return [
      r.id, r.tester, r.arm, r.scenarioId, new Date(r.createdAt).toISOString(), m?.totalSeconds,
      ...DRILL_FACTS.map((f) => m?.factSeconds[f]), m?.flagSeconds, m?.flagRecognized,
      m?.accuracy.correct, m?.accuracy.total, m?.accuracy.misses.join("; "), m?.rejected, m?.questions, m?.freeform,
      m?.medianTranslationSeconds, m?.neededInterpreter, r.survey?.sus ? susScore(r.survey.sus) : "", r.survey?.confidence, r.survey?.wouldUse, r.survey?.missing, r.survey?.worried,
    ].map(csvCell).join(",");
  });
  return [head.join(","), ...rows].join("\n");
}

// ---------------------------------------------------------------------------
// Storage (localStorage, metrics only)
// ---------------------------------------------------------------------------

const KEY = "firstwords:drills";

export function loadDrills(): DrillRun[] {
  const parsed = z.array(DrillRun).safeParse(readJson("local", KEY) ?? []);
  return parsed.success ? parsed.data : [];
}

export function saveDrill(run: DrillRun): void {
  const all = loadDrills().filter((r) => r.id !== run.id);
  writeJson("local", KEY, [...all, run]);
}

export function getDrill(id: string | null): DrillRun | undefined {
  return id ? loadDrills().find((r) => r.id === id) : undefined;
}

export function deleteDrill(id: string): void {
  writeJson("local", KEY, loadDrills().filter((r) => r.id !== id));
}

export function clearDrills(): void {
  writeJson("local", KEY, []);
}

/** Suggests the next arm for a tester so each EMT does one of each, alternating who starts. */
export function suggestNext(runs: readonly DrillRun[], tester: string): { arm: DrillArm; avoidScenarios: string[] } {
  const mine = runs.filter((r) => r.tester.trim().toLowerCase() === tester.trim().toLowerCase());
  const avoidScenarios = mine.map((r) => r.scenarioId);
  if (mine.length) return { arm: mine[mine.length - 1].arm === "firstwords" ? "usual" : "firstwords", avoidScenarios };
  const testers = new Set(runs.map((r) => r.tester.trim().toLowerCase()));
  return { arm: testers.size % 2 === 0 ? "firstwords" : "usual", avoidScenarios };
}
