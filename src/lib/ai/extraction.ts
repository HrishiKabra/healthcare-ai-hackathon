import { allergyFromQuickPick, structuredPatch, toDuration } from "../interpret";
import { ALLERGY_WORDS } from "../baseline";
import { lookupMed, findMeds, normalizeMedication, normalizeText } from "../meds";
import { getQuestion } from "../questions";
import type { Allergy, AllergyCategory, PatchEntry, Question } from "../schemas";
import type { ExtractOutput, ExtractRequest } from "./schemas";

/** Allergy category from the med table when the substance is a known drug; the table wins. */
export function normalizeAllergy(a: { raw: string; substance: string | null; category: AllergyCategory }): Allergy {
  const entry = (a.substance && lookupMed(a.substance)) || findMeds(a.raw)[0]?.entry;
  if (entry?.allergyCategory) return { raw: a.raw, substance: entry.generic, category: entry.allergyCategory };
  if (entry) return { raw: a.raw, substance: entry.generic, category: a.category === "none" ? "none" : "other" };
  const quick = allergyFromQuickPick(a.category);
  if (quick && !a.substance) return { ...quick, raw: a.raw };
  return { raw: a.raw, substance: a.substance, category: a.category };
}

/** True when the patient's words (original or English) mention an allergy at all. */
export function mentionsAllergy(said: string[]): boolean {
  const hay = normalizeText(said.join(" "));
  return ALLERGY_WORDS.some((w) => hay.includes(normalizeText(w)));
}

/**
 * Maps a validated model (or baseline) extraction onto chart entries for one
 * question. Only fields the question can carry are used for the question's own
 * slot. Medications and notes are accepted from any answer because patients
 * volunteer them anywhere; a volunteered allergy is accepted only when the
 * patient's words mention an allergy (`said`), since small models tend to fill
 * every field. "None" answers only count on their own question. Never invents
 * values the output did not contain.
 */
export function extractionToPatch(q: Question, out: ExtractOutput, said?: string[]): PatchEntry[] {
  const c = out.confidence;
  const patch: PatchEntry[] = [];
  const f = q.chartField;

  if (out.chiefComplaint && f === "chiefComplaint") patch.push({ field: "chiefComplaint", value: out.chiefComplaint, confidence: c });
  if (out.activity && f === "activity") patch.push({ field: "activity", value: out.activity, confidence: c });
  if (out.quality && (f === "quality" || f === "chiefComplaint")) patch.push({ field: "quality", value: out.quality, confidence: c });
  if (f === "provocation") out.provocation.forEach((v) => patch.push({ field: "provocation", value: v, confidence: c }));
  if (f === "region" || f === "chiefComplaint") out.region.forEach((v) => patch.push({ field: "region", value: v, confidence: c }));
  if (f === "radiation") out.radiation.forEach((v) => patch.push({ field: "radiation", value: v, confidence: c }));
  if (out.severity != null && (f === "severity" || f === "chiefComplaint")) patch.push({ field: "severity", value: out.severity, confidence: c });
  if (out.duration && (f === "onset" || f === "lastOralIntake" || f === "lastKnownWell")) {
    patch.push({ field: f, value: toDuration(out.duration.bucket, out.duration.amount, out.duration.unit), confidence: c });
  }
  if (out.yesNo && q.answerType === "yesno") {
    structuredPatch(q, { kind: "yesno", value: out.yesNo }).forEach((e) => patch.push({ ...e, confidence: c } as PatchEntry));
  }
  if (f === "conditions" || f === "notes") out.conditions.forEach((v) => patch.push({ field: "conditions", value: v, confidence: c }));

  const allergyQuestion = f === "allergies";
  const volunteered = (a: ExtractOutput["allergies"][number]) => a.category !== "none" && a.category !== "unspecified" && (!said || mentionsAllergy(said));
  for (const a of out.allergies) {
    if (allergyQuestion || volunteered(a)) patch.push({ field: "allergies", value: normalizeAllergy(a), confidence: c });
  }
  for (const m of out.medications) {
    // On the allergy questions, a named drug is an allergy, not a medicine the patient takes.
    if (allergyQuestion) {
      if (!out.allergies.length) patch.push({ field: "allergies", value: normalizeAllergy({ raw: m.raw, substance: m.generic, category: "other" }), confidence: c });
      continue;
    }
    if (m.generic === "none") {
      if (f === "medications") patch.push({ field: "medications", value: { raw: m.raw, generic: "none", drugClass: "none", classSource: "none" }, confidence: c });
      continue;
    }
    patch.push({ field: "medications", value: normalizeMedication(m.raw, m.generic, m.drugClass), confidence: c });
  }
  for (const n of out.notes) if (n.trim()) patch.push({ field: "notes", value: n.trim(), confidence: c });
  return dedupe(patch);
}

function dedupe(patch: PatchEntry[]): PatchEntry[] {
  const seen = new Set<string>();
  return patch.filter((e) => {
    const k = `${e.field}:${JSON.stringify(e.value)}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** True when the patch carries something more than free-text notes. */
export function hasStructured(patch: PatchEntry[]): boolean {
  return patch.some((e) => e.field !== "notes");
}

/** Bank question, or a stand-in for a free-form EMT question (answers go to notes). */
export function questionForExtract(r: ExtractRequest): Question {
  const q = getQuestion(r.questionId);
  if (q) return q;
  return {
    id: r.questionId,
    phase: "closing",
    english: r.questionEnglish,
    answerType: "free",
    choices: [],
    chartField: "notes",
    showIf: null,
    icon: "chat",
    translations: { es: r.questionEnglish, vi: r.questionEnglish, zh: r.questionEnglish, ar: r.questionEnglish, hi: r.questionEnglish },
    translationsVerified: { es: false, vi: false, zh: false, ar: false, hi: false },
    aslVideo: "",
  };
}

