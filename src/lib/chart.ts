import type {
  Allergy,
  Answer,
  ChartField,
  ChartValue,
  ClinicalChart,
  Confidence,
  Duration,
  DurationField,
  ListField,
  Medication,
  PatchEntry,
  ScalarField,
} from "./schemas";

export type { ClinicalChart } from "./schemas";

export function emptyChart(): ClinicalChart {
  return {
    provocation: [],
    region: [],
    radiation: [],
    allergies: [],
    medications: [],
    conditions: [],
    strokeScreen: {},
    notes: [],
    conflicts: [],
  };
}

const RANK: Record<Confidence, number> = { low: 1, medium: 2, high: 3 };

export function maxConfidence(a: Confidence, b: Confidence): Confidence {
  return RANK[a] >= RANK[b] ? a : b;
}

/** Sentinel values meaning "the patient said none". A sentinel next to a real item is a conflict. */
export const NONE_VALUES: Partial<Record<ChartField, string>> = {
  conditions: "none",
  provocation: "nothing",
  radiation: "none",
};

export function isNoneAllergy(a: Allergy): boolean {
  return a.category === "none";
}
export function isRealAllergy(a: Allergy): boolean {
  return a.category !== "none" && a.category !== "unspecified";
}
export function isNoneMedication(m: Medication): boolean {
  return m.generic === "none";
}

// ---------------------------------------------------------------------------
// Keys used to decide whether two values are "the same"
// ---------------------------------------------------------------------------

function durationKey(d: Duration): string {
  return `${d.bucket}|${d.amount ?? ""}|${d.unit ?? ""}`;
}
function allergyKey(a: Allergy): string {
  return `${a.category}|${(a.substance ?? "").toLowerCase()}`;
}
function medKey(m: Medication): string {
  return m.generic ? `g:${m.generic.toLowerCase()}` : `c:${m.drugClass}|${m.raw.toLowerCase()}`;
}
function valueKey(field: ChartField, v: unknown): string {
  if (field === "onset" || field === "lastOralIntake" || field === "lastKnownWell") return durationKey(v as Duration);
  if (field === "allergies") return allergyKey(v as Allergy);
  if (field === "medications") return medKey(v as Medication);
  return JSON.stringify(v);
}

// ---------------------------------------------------------------------------
// Merge helpers
// ---------------------------------------------------------------------------

function combine<T>(existing: ChartValue<T>, incoming: ChartValue<T>): ChartValue<T> {
  const confirmedSource = existing.confirmed ? existing : incoming.confirmed ? incoming : incoming;
  return {
    value: existing.value,
    sourceAnswerId: confirmedSource.sourceAnswerId,
    sourceQuestionId: confirmedSource.sourceQuestionId,
    confidence: maxConfidence(existing.confidence, incoming.confidence),
    confirmed: existing.confirmed || incoming.confirmed,
  };
}

function addConflict(chart: ClinicalChart, field: ChartField, values: ChartValue<unknown>[]): ClinicalChart {
  const others = chart.conflicts.filter((c) => c.field !== field);
  const prior = chart.conflicts.find((c) => c.field === field)?.values ?? [];
  const merged = [...prior];
  for (const v of values) {
    if (!merged.some((m) => m.sourceAnswerId === v.sourceAnswerId && valueKey(field, m.value) === valueKey(field, v.value))) {
      merged.push(v);
    }
  }
  return { ...chart, conflicts: [...others, { field, values: merged }] };
}

/**
 * Scalar merge rules:
 * - same value: keep one, upgrade confirmation and confidence
 * - a newer answer to the same question replaces the older one (unless it is
 *   less confirmed: a pending re-answer waits until the patient confirms it)
 * - confirmed beats unconfirmed
 * - otherwise both are kept and the field is flagged as conflicting
 */
function mergeScalar<T>(
  chart: ClinicalChart,
  field: ChartField,
  existing: ChartValue<T> | undefined,
  incoming: ChartValue<T>,
): { chart: ClinicalChart; value: ChartValue<T> } {
  if (!existing) return { chart, value: incoming };
  if (valueKey(field, existing.value) === valueKey(field, incoming.value)) {
    return { chart, value: combine(existing, incoming) };
  }
  const sameQuestion = existing.sourceQuestionId === incoming.sourceQuestionId;
  if (sameQuestion && (incoming.confirmed || !existing.confirmed)) {
    return { chart, value: incoming };
  }
  if (incoming.confirmed && !existing.confirmed) return { chart, value: incoming };
  if (existing.confirmed && !incoming.confirmed) return { chart, value: existing };
  return {
    chart: addConflict(chart, field, [existing as ChartValue<unknown>, incoming as ChartValue<unknown>]),
    value: existing,
  };
}

function mergeIntoList<T>(field: ChartField, list: ChartValue<T>[], incoming: ChartValue<T>): ChartValue<T>[] {
  const key = valueKey(field, incoming.value);
  const idx = list.findIndex((x) => valueKey(field, x.value) === key);
  if (idx >= 0) {
    const next = [...list];
    next[idx] = combine(list[idx], incoming);
    return next;
  }
  return [...list, incoming];
}

/** Re-derives the "none next to a real item" conflict for a list field. */
function refreshListConflict<T>(
  chart: ClinicalChart,
  field: ChartField,
  list: ChartValue<T>[],
  isNone: (v: T) => boolean,
): ClinicalChart {
  const nones = list.filter((x) => isNone(x.value));
  const reals = list.filter((x) => !isNone(x.value));
  const withoutField = { ...chart, conflicts: chart.conflicts.filter((c) => c.field !== field) };
  if (nones.length && reals.length) {
    return { ...withoutField, conflicts: [...withoutField.conflicts, { field, values: [...nones, ...reals] as ChartValue<unknown>[] }] };
  }
  return withoutField;
}

const SCALAR_FIELDS: readonly ScalarField[] = ["chiefComplaint", "activity", "quality"];
const LIST_FIELDS: readonly ListField[] = ["provocation", "region", "radiation", "conditions", "notes"];
const DURATION_FIELDS: readonly DurationField[] = ["onset", "lastOralIntake", "lastKnownWell"];
const STROKE_FIELDS = ["facialDroop", "armDrift", "speechAbnormal"] as const;

function isOneOf<T extends string>(arr: readonly T[], v: string): v is T {
  return (arr as readonly string[]).includes(v);
}

function applyEntry(chart: ClinicalChart, answer: Answer, entry: PatchEntry): ClinicalChart {
  const confirmed = answer.status === "confirmed";
  const meta = { sourceAnswerId: answer.id, sourceQuestionId: answer.questionId, confidence: entry.confidence, confirmed };
  const field = entry.field;

  if (isOneOf(SCALAR_FIELDS, field) || isOneOf(DURATION_FIELDS, field) || field === "severity" || field === "headStrike" || field === "pregnancy") {
    const incoming = { ...meta, value: entry.value } as ChartValue<unknown>;
    const existing = chart[field] as ChartValue<unknown> | undefined;
    const r = mergeScalar(chart, field, existing, incoming);
    return { ...r.chart, [field]: r.value };
  }

  if (isOneOf(STROKE_FIELDS, field)) {
    const incoming = { ...meta, value: entry.value as boolean };
    const r = mergeScalar(chart, field, chart.strokeScreen[field], incoming);
    return { ...r.chart, strokeScreen: { ...r.chart.strokeScreen, [field]: r.value } };
  }

  if (isOneOf(LIST_FIELDS, field)) {
    const list = mergeIntoList(field, chart[field], { ...meta, value: entry.value as string });
    const next = { ...chart, [field]: list };
    const sentinel = NONE_VALUES[field];
    return sentinel ? refreshListConflict(next, field, list, (v) => v === sentinel) : next;
  }

  if (field === "allergies") {
    let list = mergeIntoList(field, chart.allergies, { ...meta, value: entry.value as Allergy });
    // "Yes, I have an allergy" is subsumed once the specific allergy is known.
    if (list.some((a) => isRealAllergy(a.value))) list = list.filter((a) => a.value.category !== "unspecified");
    return refreshListConflict({ ...chart, allergies: list }, "allergies", list, isNoneAllergy);
  }

  if (field === "medications") {
    const med = entry.value as Medication;
    let list = chart.medications;
    // A specific drug replaces a class-only quick pick of the same class ("blood thinner" then "Eliquis").
    if (med.generic && med.generic !== "none") {
      list = list.filter((m) => !(m.value.generic === null && m.value.drugClass === med.drugClass && !m.confirmed));
    }
    list = mergeIntoList(field, list, { ...meta, value: med });
    return refreshListConflict({ ...chart, medications: list }, "medications", list, isNoneMedication);
  }

  return chart;
}

/**
 * Pure merge of one answer's extraction into the chart. Confirmed values
 * override unconfirmed ones; conflicting values are both kept and flagged.
 */
export function mergeAnswer(chart: ClinicalChart, answer: Answer, extraction: PatchEntry[] = answer.patch): ClinicalChart {
  if (answer.status === "rejected") return chart;
  return extraction.reduce((c, e) => applyEntry(c, answer, e), chart);
}

function withAbsolute(v: ChartValue<Duration> | undefined, startedAt: number): ChartValue<Duration> | undefined {
  if (!v) return v;
  const mins = v.value.approxMinutes;
  return { ...v, value: { ...v.value, absoluteTime: mins == null ? null : startedAt - mins * 60_000 } };
}

/** Rebuilds the whole chart from the answer log. Rejected answers are ignored. */
export function buildChart(answers: readonly Answer[], startedAt: number): ClinicalChart {
  const chart = answers.reduce((c, a) => mergeAnswer(c, a), emptyChart());
  return {
    ...chart,
    onset: withAbsolute(chart.onset, startedAt),
    lastOralIntake: withAbsolute(chart.lastOralIntake, startedAt),
    lastKnownWell: withAbsolute(chart.lastKnownWell, startedAt),
  };
}

export function hasConflict(chart: ClinicalChart, field: ChartField): boolean {
  return chart.conflicts.some((c) => c.field === field);
}

/** Every ChartValue in the chart, flattened, with its field. Used by the handoff and the live chart. */
export function allValues(chart: ClinicalChart): { field: ChartField; cv: ChartValue<unknown> }[] {
  const out: { field: ChartField; cv: ChartValue<unknown> }[] = [];
  const push = (field: ChartField, cv: ChartValue<unknown> | undefined) => cv && out.push({ field, cv });
  for (const f of SCALAR_FIELDS) push(f, chart[f]);
  for (const f of DURATION_FIELDS) push(f, chart[f]);
  push("severity", chart.severity);
  push("headStrike", chart.headStrike);
  push("pregnancy", chart.pregnancy);
  for (const f of STROKE_FIELDS) push(f, chart.strokeScreen[f]);
  for (const f of LIST_FIELDS) chart[f].forEach((cv) => push(f, cv));
  chart.allergies.forEach((cv) => push("allergies", cv));
  chart.medications.forEach((cv) => push("medications", cv));
  return out;
}
