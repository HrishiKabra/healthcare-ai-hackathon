import {
  choiceLabel,
  fieldLabel,
  fmt,
  formatDuration,
  joinList,
  regionLabel,
  t,
  tKey,
} from "./i18n";
import { normalizeMedication } from "./meds";
import { QUESTIONS } from "./questions";
import type {
  Allergy,
  AllergyCategory,
  AnswerValue,
  ChartField,
  ConfirmText,
  Duration,
  DurationBucket,
  DurationUnit,
  LangCode,
  Medication,
  PatchEntry,
  Question,
} from "./schemas";

// ---------------------------------------------------------------------------
// Durations
// ---------------------------------------------------------------------------

/** Rough minutes-ago estimate for each "How long ago?" step. */
export const BUCKET_MINUTES: Record<DurationBucket, number | null> = {
  minutes: 15,
  about_1_hour: 60,
  few_hours: 180,
  today: 480,
  yesterday: 1440,
  days: 4320,
  unknown: null,
};
const UNIT_MINUTES: Record<DurationUnit, number> = { minutes: 1, hours: 60, days: 1440 };

export function toDuration(bucket: DurationBucket, amount?: number | null, unit?: DurationUnit | null): Duration {
  const exact = amount != null && unit ? amount * UNIT_MINUTES[unit] : null;
  return { bucket, amount: amount ?? null, unit: unit ?? null, approxMinutes: exact ?? BUCKET_MINUTES[bucket] };
}

// ---------------------------------------------------------------------------
// Quick picks that carry clinical meaning
// ---------------------------------------------------------------------------

const MED_QUICK_PICKS: Record<string, () => Medication> = {
  blood_thinner: () => ({ raw: "blood thinner", generic: null, drugClass: "anticoagulant", classSource: "quickpick" }),
  insulin: () => normalizeMedication("insulin"),
  heart_medicine: () => ({ raw: "heart medicine", generic: null, drugClass: "cardiac", classSource: "quickpick" }),
  inhaler: () => ({ raw: "inhaler", generic: null, drugClass: "bronchodilator", classSource: "quickpick" }),
  none: () => ({ raw: "none", generic: "none", drugClass: "none", classSource: "none" }),
};
/** Reverse lookup so a class-only medicine is shown with its quick-pick label. */
const CLASS_TO_QUICK_PICK: Record<string, string> = {
  anticoagulant: "blood_thinner",
  cardiac: "heart_medicine",
  bronchodilator: "inhaler",
};

const ALLERGY_QUICK_PICKS: Record<string, Allergy> = {
  aspirin: { raw: "aspirin", substance: "aspirin", category: "aspirin" },
  nsaid: { raw: "ibuprofen or similar", substance: "ibuprofen", category: "nsaid" },
  penicillin: { raw: "penicillin", substance: "penicillin", category: "penicillin" },
  sulfa: { raw: "sulfa drugs", substance: "sulfa", category: "sulfa" },
  opioid: { raw: "opioids", substance: "morphine", category: "opioid" },
};

export function medicationFromQuickPick(id: string): Medication | null {
  return MED_QUICK_PICKS[id]?.() ?? null;
}
export function allergyFromQuickPick(id: string): Allergy | null {
  return ALLERGY_QUICK_PICKS[id] ?? null;
}

// ---------------------------------------------------------------------------
// Structured answer to patch
// ---------------------------------------------------------------------------

const UNDERSTAND_NOTE = {
  yes: "Patient says they can hear and understand the questions.",
  no: "Patient says they cannot hear or understand the questions well.",
};

function yesNoPatch(q: Question, yes: boolean): PatchEntry[] {
  if (q.id === "understand") return [{ field: "notes", value: yes ? UNDERSTAND_NOTE.yes : UNDERSTAND_NOTE.no, confidence: "high" }];
  if (q.chartField === "allergies") {
    const value: Allergy = yes
      ? { raw: "yes", substance: null, category: "unspecified" }
      : { raw: "no", substance: null, category: "none" };
    return [{ field: "allergies", value, confidence: "high" }];
  }
  if (q.chartField === "medications") {
    return yes ? [] : [{ field: "medications", value: medicationFromQuickPick("none")!, confidence: "high" }];
  }
  switch (q.chartField) {
    case "headStrike":
    case "pregnancy":
    case "intoxication":
    case "facialDroop":
    case "armDrift":
    case "speechAbnormal":
      return [{ field: q.chartField, value: yes, confidence: "high" }];
    default:
      return [{ field: "notes", value: `${q.english} ${yes ? "Yes" : "No"}`, confidence: "high" }];
  }
}

function choicePatch(q: Question, ids: string[]): PatchEntry[] {
  const f = q.chartField;
  if (f === "medications") {
    return ids.flatMap((id) => {
      const m = medicationFromQuickPick(id);
      return m ? [{ field: "medications" as const, value: m, confidence: "high" as const }] : [];
    });
  }
  if (f === "allergies") {
    return ids.flatMap((id) => {
      const a = allergyFromQuickPick(id);
      return a ? [{ field: "allergies" as const, value: a, confidence: "high" as const }] : [];
    });
  }
  if (f === "chiefComplaint" || f === "activity" || f === "quality") {
    return ids.length ? [{ field: f, value: ids[0], confidence: "high" }] : [];
  }
  if (f === "provocation" || f === "conditions" || f === "region" || f === "radiation") {
    return ids.map((id) => ({ field: f, value: id, confidence: "high" as const }));
  }
  return ids.map((id) => ({ field: "notes" as const, value: `${q.english} ${choiceLabel(q, id, "en")}`, confidence: "high" as const }));
}

/** Turns a tapped (non-free) answer into chart entries. No AI involved. */
export function structuredPatch(q: Question, value: AnswerValue): PatchEntry[] {
  switch (value.kind) {
    case "yesno":
    case "gesture":
      return yesNoPatch(q, value.value === "yes");
    case "observation":
      return yesNoPatch(q, value.value);
    case "scale":
      return [{ field: "severity", value: value.value, confidence: "high" }];
    case "bodymap": {
      const field = q.chartField === "radiation" ? "radiation" : "region";
      if (!value.regions.length) {
        return field === "radiation" ? [{ field, value: "none", confidence: "high" }] : [];
      }
      return value.regions.map((r) => ({ field, value: r, confidence: "high" as const }));
    }
    case "choice":
      return choicePatch(q, value.choiceIds);
    case "duration": {
      const f = q.chartField;
      if (f !== "onset" && f !== "lastOralIntake" && f !== "lastKnownWell") return [];
      return [{ field: f, value: toDuration(value.bucket, value.amount, value.unit), confidence: "high" }];
    }
    case "free":
      return [];
  }
}

// ---------------------------------------------------------------------------
// Confirm-back text, built in code from the patch with localized labels
// ---------------------------------------------------------------------------

const CHOICE_OWNER: Partial<Record<ChartField, Question>> = Object.fromEntries(
  QUESTIONS.filter((q) => q.answerType === "choice").map((q) => [q.chartField, q]),
);
const MED_QUESTION = QUESTIONS.find((q) => q.id === "medications");

function yesNoWord(v: boolean, lang: LangCode): string {
  return t(v ? "yes" : "no", lang);
}

export function allergyLabel(a: Allergy, lang: LangCode): string {
  const known: AllergyCategory[] = ["aspirin", "nsaid", "penicillin", "sulfa", "opioid", "latex", "none", "unspecified"];
  if (known.includes(a.category)) return tKey(`allergy.${a.category}`, lang);
  // The patient sees their own word ("amendoim"); the crew sees the English with it ("peanut (amendoim)").
  if (lang !== "en") return a.raw.trim() || a.substance || "";
  const raw = a.raw.trim();
  if (!a.substance) return raw;
  return raw && raw.toLowerCase() !== a.substance.toLowerCase() ? `${a.substance} (${raw})` : a.substance;
}

export function medicationLabel(m: Medication, lang: LangCode): string {
  if (m.generic === "none") return t("noMedicines", lang);
  if (m.generic) {
    const brand = m.raw.trim();
    return brand && brand.toLowerCase() !== m.generic.toLowerCase() ? `${m.generic} (${brand})` : m.generic;
  }
  const pick = CLASS_TO_QUICK_PICK[m.drugClass];
  if (pick && MED_QUESTION) return choiceLabel(MED_QUESTION, pick, lang);
  return m.raw;
}

/** Formats one entry's value for display in the given language. */
export function formatEntryValue(e: PatchEntry, lang: LangCode): string {
  switch (e.field) {
    case "chiefComplaint":
    case "activity":
    case "quality":
    case "provocation":
    case "conditions": {
      const owner = CHOICE_OWNER[e.field];
      return owner ? choiceLabel(owner, e.value, lang) : e.value;
    }
    case "region":
    case "radiation":
      return e.value === "none" ? t("noSpread", lang) : regionLabel(e.value, lang);
    case "onset":
    case "lastOralIntake":
    case "lastKnownWell":
      return formatDuration(e.value, lang);
    case "severity":
      return fmt(t("painOutOf", lang), { n: e.value });
    case "allergies":
      return allergyLabel(e.value, lang);
    case "medications":
      return medicationLabel(e.value, lang);
    case "headStrike":
    case "pregnancy":
    case "intoxication":
    case "facialDroop":
    case "armDrift":
    case "speechAbnormal":
      return yesNoWord(e.value, lang);
    case "notes":
      return e.value;
  }
}

function confirmLine(entries: PatchEntry[], lang: LangCode): string[] {
  const groups = new Map<ChartField, PatchEntry[]>();
  for (const e of entries) groups.set(e.field, [...(groups.get(e.field) ?? []), e]);
  const lines: string[] = [];
  for (const [field, es] of groups) {
    const values = joinList(es.map((e) => formatEntryValue(e, lang)), lang);
    lines.push(field === "notes" ? values : `${fieldLabel(field, lang)}: ${values}`);
  }
  return lines;
}

/** Native and English confirm-back text for a patch. */
export function confirmFromPatch(patch: PatchEntry[], lang: LangCode): ConfirmText {
  return {
    native: confirmLine(patch, lang).join("\n"),
    english: confirmLine(patch, "en").join("\n"),
  };
}

/**
 * Structured answers: the patch and the confirm text both come from code.
 * The "understand" note is shown to the patient as a short localized phrase.
 */
export function interpretStructured(q: Question, value: AnswerValue, lang: LangCode): { patch: PatchEntry[]; confirmText: ConfirmText } {
  const patch = structuredPatch(q, value);
  if (q.id === "understand" && (value.kind === "yesno" || value.kind === "gesture")) {
    const k = value.value === "yes" ? "understood.yes" : "understood.no";
    return { patch, confirmText: { native: t(k, lang), english: t(k, "en") } };
  }
  if (!patch.length) {
    return { patch, confirmText: { native: t("duration.unknown", lang), english: t("duration.unknown", "en") } };
  }
  return { patch, confirmText: confirmFromPatch(patch, lang) };
}

/** Display any chart value in the given language (used by the EMT console, rules, and handoff). */
export function displayValue(field: ChartField, value: unknown, lang: LangCode): string {
  return formatEntryValue({ field, value, confidence: "high" } as PatchEntry, lang);
}
