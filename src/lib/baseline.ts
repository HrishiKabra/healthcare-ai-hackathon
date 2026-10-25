import uiStrings from "@/data/ui-strings.json";
import { emptyExtract, type ExtractOutput } from "./ai/schemas";
import { containsTerm, findMeds, normalizeText } from "./meds";
import { BODY_REGIONS, type AllergyCategory, type DurationUnit, type LangCode, type Question } from "./schemas";

// Keyword baseline: a deliberately simple extractor with no AI. It matches
// medication names from the table (in all six scripts), allergy words,
// negations, numbers, and the question's own option labels. It is the safe
// fallback when no model is available, and the "without AI" column in the eval.

const NEGATIONS = ["no", "none", "nothing", "never", "ninguno", "ninguna", "nada", "không", "没有", "لا", "ليس", "नहीं", "कोई नहीं"];
const AFFIRMATIONS = ["yes", "yeah", "sí", "si", "có", "是", "是的", "有", "对", "نعم", "أيوه", "हाँ", "हां", "जी"];
export const ALLERGY_WORDS = ["allerg", "alergi", "alérgic", "dị ứng", "过敏", "حساسية", "حساسيه", "एलर्जी"];
const UNIT_WORDS: Record<DurationUnit, string[]> = {
  minutes: ["minute", "min", "minuto", "phút", "分钟", "دقيقة", "دقائق", "मिनट"],
  hours: ["hour", "hr", "hora", "giờ", "tiếng", "小时", "ساعة", "ساعات", "घंटे", "घंटा"],
  days: ["day", "día", "dia", "ngày", "天", "يوم", "أيام", "दिन"],
};

type Entry = Record<LangCode, string>;
const UI = uiStrings as Record<string, Entry>;

function tokens(hay: string): string[] {
  return hay.split(/[\s,.;:!?¿¡،。，、！？]+/).filter(Boolean);
}

function hasWord(hay: string, words: string[]): boolean {
  const toks = tokens(hay);
  return words.some((w) => {
    const n = normalizeText(w);
    // CJK and other unspaced scripts: substring; spaced scripts: whole token.
    return /^[\p{Script=Han}]+$/u.test(n) ? hay.includes(n) : toks.includes(n) || (n.includes(" ") && hay.includes(n));
  });
}

function labelMatches(hay: string, labels: string[]): boolean {
  return labels.some((l) => {
    const n = normalizeText(l);
    return n.length >= 2 && containsTerm(hay, n);
  });
}

function choiceLabels(q: Question, choiceId: string, lang: LangCode): string[] {
  const c = q.choices.find((x) => x.id === choiceId);
  if (!c) return [];
  return [c.english, lang !== "en" ? c.translations[lang] : undefined].filter((x): x is string => !!x);
}

function regionLabels(region: string, lang: LangCode): string[] {
  const e = UI[`region.${region}`];
  return e ? [e.en, e[lang]] : [];
}

function firstNumber(hay: string): number | null {
  const m = hay.match(/(\d+(?:[.,]\d+)?)/);
  return m ? Number(m[1].replace(",", ".")) : null;
}

const ALLERGY_CATEGORY_BY_CLASS: Record<string, AllergyCategory> = { nsaid: "nsaid", opioid: "opioid", penicillin: "penicillin", sulfa: "sulfa" };

export function baselineExtract(q: Question, text: string, lang: LangCode): ExtractOutput {
  const hay = normalizeText(text);
  const out = emptyExtract();
  const matched: string[] = [];
  const negated = hasWord(hay, NEGATIONS);

  // Option labels for the question being asked, in the patient's language and English.
  for (const c of q.choices) {
    if (!labelMatches(hay, choiceLabels(q, c.id, lang))) continue;
    matched.push(c.id);
    if (q.chartField === "chiefComplaint" && !out.chiefComplaint) out.chiefComplaint = c.id as ExtractOutput["chiefComplaint"];
    if (q.chartField === "activity" && !out.activity) out.activity = c.id as ExtractOutput["activity"];
    if (q.chartField === "quality" && !out.quality) out.quality = c.id as ExtractOutput["quality"];
    if (q.chartField === "provocation") out.provocation.push(c.id as ExtractOutput["provocation"][number]);
    if (q.chartField === "conditions") out.conditions.push(c.id as ExtractOutput["conditions"][number]);
  }

  // Body regions by label.
  if (q.answerType === "bodymap") {
    for (const r of BODY_REGIONS) {
      if (labelMatches(hay, regionLabels(r, lang))) {
        matched.push(r);
        (q.chartField === "radiation" ? out.radiation : out.region).push(r);
      }
    }
    if (q.chartField === "radiation" && !out.radiation.length && negated) out.radiation.push("none");
  }

  // Numbers.
  const n = firstNumber(hay);
  if (q.answerType === "scale" && n != null && n >= 0 && n <= 10) {
    out.severity = Math.round(n);
    matched.push(`severity ${n}`);
  }
  if (q.answerType === "duration" && n != null) {
    const unit = (Object.keys(UNIT_WORDS) as DurationUnit[]).find((u) => UNIT_WORDS[u].some((w) => hay.includes(normalizeText(w))));
    if (unit) {
      const bucket = unit === "minutes" ? "minutes" : unit === "hours" ? (n <= 1.5 ? "about_1_hour" : "few_hours") : "days";
      out.duration = { bucket, amount: n, unit };
      matched.push(`${n} ${unit}`);
    }
  }

  // Yes / no.
  if (q.answerType === "yesno") {
    if (negated) out.yesNo = "no";
    else if (hasWord(hay, AFFIRMATIONS)) out.yesNo = "yes";
    if (out.yesNo) matched.push(out.yesNo);
  }

  // Medications by name (brand or generic, any script).
  const meds = findMeds(text);
  const allergyContext = q.chartField === "allergies" || ALLERGY_WORDS.some((w) => hay.includes(normalizeText(w)));
  for (const { entry, matched: alias } of meds) {
    matched.push(entry.generic);
    if (allergyContext) {
      out.allergies.push({ raw: alias, substance: entry.generic, category: entry.allergyCategory ?? ALLERGY_CATEGORY_BY_CLASS[entry.drugClass] ?? "other" });
    } else {
      out.medications.push({ raw: alias, generic: entry.generic, drugClass: entry.drugClass });
    }
  }
  if (!meds.length && negated) {
    if (q.chartField === "medications") out.medications.push({ raw: text, generic: "none", drugClass: "none" });
    if (q.chartField === "allergies") out.allergies.push({ raw: text, substance: null, category: "none" });
    if (q.chartField === "conditions") out.conditions.push("none");
  }

  if (q.chartField === "notes" && q.answerType === "free" && !matched.length) {
    out.notes.push(text.trim());
  }

  out.confidence = matched.length ? "medium" : "low";
  out.summaryEnglish = matched.length ? `Keyword match: ${matched.join(", ")}` : "No keywords matched.";
  return out;
}
