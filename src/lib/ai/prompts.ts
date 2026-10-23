import { DRUG_CLASS_LABELS } from "../meds";
import { getLanguage } from "../languages";
import { choiceLabel } from "../i18n";
import type { Question, RedFlag } from "../schemas";
import type { ExtractRequest, TranslateRequest } from "./schemas";

// Prompts are short on purpose: the on-device model is 1.7B parameters.

export const GLOSSARY = [
  "chest pain = dolor de pecho = đau ngực = 胸痛 = ألم في الصدر = सीने में दर्द",
  "shortness of breath = falta de aire = khó thở = 呼吸困难 = ضيق التنفس = साँस फूलना",
  "blood thinner = anticoagulante = thuốc chống đông máu = 抗凝血药 = مميع للدم = खून पतला करने की दवा",
  "allergy = alergia = dị ứng = 过敏 = حساسية = एलर्जी",
  "dizziness = mareo = chóng mặt = 头晕 = دوخة = चक्कर",
  "hit my head = me golpeé la cabeza = đập đầu = 撞到头 = ضربت رأسي = सिर पर चोट लगी",
].join("\n");

export function translatePrompt(r: TranslateRequest): { system: string; user: string } {
  const from = getLanguage(r.from).englishName;
  const to = getLanguage(r.to).englishName;
  const system = [
    "You are a medical interpreter for an ambulance crew.",
    `Translate from ${from} to ${to}. The text is ${r.context === "question" ? "a question from the crew to the patient" : "a patient's answer to the crew"}.`,
    "Keep medication names exactly as written. Preserve every number, time, and unit exactly.",
    "Use plain words a patient understands. Do not add or remove medical facts.",
    `backTranslation: translate your translation back into ${from}, so the speaker can check it.`,
    "confidence: low for slang, ambiguity, or anything you had to guess; medium if mostly clear; high if exact.",
    "notes: one short sentence about anything uncertain, or an empty string.",
    "Glossary:",
    GLOSSARY,
  ].join("\n");
  return { system, user: r.text };
}

function optionList(q: Question): string {
  if (!q.choices.length) return "";
  return `Allowed ids for this question: ${q.choices.map((c) => `${c.id} (${choiceLabel(q, c.id, "en")})`).join(", ")}.`;
}

export function extractPrompt(r: ExtractRequest, q: Question): { system: string; user: string } {
  const system = [
    "You extract clinical facts from one patient answer during an emergency field assessment.",
    "Only record what the answer actually says. Leave everything else null or empty. Never guess a field the answer does not support.",
    `The question was about: ${q.chartField}. Fill that field when you can. Medications, allergies, and extra facts can be recorded from any answer.`,
    optionList(q),
    "medications: raw (as said), generic name (lowercase, for example Eliquis becomes apixaban), drugClass from this list: " + Object.keys(DRUG_CLASS_LABELS).join(", ") + ".",
    "A description without a name (for example 'a pill to thin my blood') is a medication with generic null and the matching drugClass.",
    "allergies: category is one of aspirin, nsaid, penicillin, sulfa, opioid, latex, food, other, none, unspecified.",
    "duration: bucket is minutes, about_1_hour, few_hours, today, yesterday, days, or unknown; add amount and unit when a number is given.",
    "yesNo: yes or no when the answer is a yes or no.",
    "notes: short English sentences for important facts that fit nowhere else.",
    "confidence: high if clear, medium if somewhat clear, low if you are guessing.",
    "summaryEnglish: one short English sentence of what the patient said.",
  ]
    .filter(Boolean)
    .join("\n");
  const user = [
    `Question (English): ${r.questionEnglish || q.english}`,
    `Answer (${getLanguage(r.answerLanguage).englishName}): ${r.answerRaw}`,
    r.answerEnglish && r.answerLanguage !== "en" ? `Answer in English: ${r.answerEnglish}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return { system, user };
}

export function explainPrompt(flag: RedFlag): { system: string; user: string } {
  return {
    system:
      "Rewrite a red-flag explanation for an EMT in one or two plain sentences. Use only the rule and facts given. Do not add new clinical claims and do not change how serious it is.",
    user: `Flag: ${flag.title}\nRule: ${flag.rule}\nFacts: ${flag.facts.map((f) => `${f.label}: ${f.value}${f.confirmed ? "" : " (unconfirmed)"}`).join("; ")}\nCurrent explanation: ${flag.explanation}`,
  };
}

export function narrativePrompt(handoffText: string): { system: string; user: string } {
  return {
    system:
      "Write one short paragraph (at most 3 sentences) summarizing this ambulance handoff for the emergency department. Use only facts in the handoff. Say 'unconfirmed' for anything listed as unconfirmed. Do not add a diagnosis.",
    user: handoffText,
  };
}
