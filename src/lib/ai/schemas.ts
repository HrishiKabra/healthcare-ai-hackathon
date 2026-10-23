import { z } from "zod";
import { QUESTIONS } from "../questions";
import { AllergyCategory, BODY_REGIONS, Confidence, DurationBucket, DurationUnit, LangCode, PatchEntry, RedFlag } from "../schemas";

// Request and response shapes shared by the API routes and the browser.
// Every model output is validated against these before it is used.

export const ProviderName = z.enum(["mock", "anthropic", "ollama", "baseline"]);
export type ProviderName = z.infer<typeof ProviderName>;

export const AiMeta = z.object({
  provider: ProviderName,
  model: z.string(),
  /** Set when the requested provider failed and a fallback answered instead. */
  fallbackReason: z.string().optional(),
  ms: z.number().optional(),
});
export type AiMeta = z.infer<typeof AiMeta>;

// --- translate --------------------------------------------------------------

export const TranslateRequest = z.object({
  text: z.string().min(1).max(2000),
  from: LangCode,
  to: LangCode,
  context: z.enum(["question", "answer"]),
});
export type TranslateRequest = z.infer<typeof TranslateRequest>;

export const TranslateOutput = z.object({
  translation: z.string(),
  /** Always back into the source language, for the confirm-back step. */
  backTranslation: z.string(),
  confidence: Confidence,
  notes: z.string(),
});
export type TranslateOutput = z.infer<typeof TranslateOutput>;

export const TranslateResponse = TranslateOutput.extend({ meta: AiMeta });
export type TranslateResponse = z.infer<typeof TranslateResponse>;

// --- extract ----------------------------------------------------------------

const ids = (questionId: string) => QUESTIONS.find((q) => q.id === questionId)!.choices.map((c) => c.id) as [string, ...string[]];

export const CHIEF_COMPLAINT_IDS = ids("chief_complaint");
export const ACTIVITY_IDS = ids("activity");
export const PROVOCATION_IDS = ids("provocation");
export const QUALITY_IDS = ids("quality");
export const CONDITION_IDS = ids("conditions");

/**
 * What the model returns for one answer. Flat and small on purpose: a 1.7B
 * on-device model only has to pick ids from lists. Every key has a default so
 * a partial answer still parses.
 */
export const ExtractOutput = z.object({
  chiefComplaint: z.enum(CHIEF_COMPLAINT_IDS).nullable().default(null),
  activity: z.enum(ACTIVITY_IDS).nullable().default(null),
  provocation: z.array(z.enum(PROVOCATION_IDS)).default([]),
  quality: z.enum(QUALITY_IDS).nullable().default(null),
  region: z.array(z.enum(BODY_REGIONS)).default([]),
  radiation: z.array(z.enum([...BODY_REGIONS, "none"])).default([]),
  severity: z.number().int().min(0).max(10).nullable().default(null),
  duration: z
    .object({ bucket: DurationBucket, amount: z.number().nonnegative().nullable(), unit: DurationUnit.nullable() })
    .nullable()
    .default(null),
  yesNo: z.enum(["yes", "no"]).nullable().default(null),
  allergies: z.array(z.object({ raw: z.string(), substance: z.string().nullable(), category: AllergyCategory })).default([]),
  medications: z.array(z.object({ raw: z.string(), generic: z.string().nullable(), drugClass: z.string().nullable() })).default([]),
  conditions: z.array(z.enum(CONDITION_IDS)).default([]),
  notes: z.array(z.string()).default([]),
  confidence: Confidence.default("low"),
  summaryEnglish: z.string().default(""),
});
export type ExtractOutput = z.infer<typeof ExtractOutput>;

export function emptyExtract(summaryEnglish = ""): ExtractOutput {
  return ExtractOutput.parse({ summaryEnglish });
}

export const ExtractRequest = z.object({
  questionId: z.string().min(1).max(100),
  questionEnglish: z.string().max(500),
  answerRaw: z.string().min(1).max(2000),
  answerLanguage: LangCode,
  answerEnglish: z.string().max(2000).optional(),
});
export type ExtractRequest = z.infer<typeof ExtractRequest>;

export const ExtractResponse = z.object({
  output: ExtractOutput,
  patch: z.array(PatchEntry),
  needsReview: z.boolean(),
  meta: AiMeta,
});
export type ExtractResponse = z.infer<typeof ExtractResponse>;

// --- explain-flag -----------------------------------------------------------

export const ExplainRequest = z.object({ flag: RedFlag });
export const ExplainOutput = z.object({ explanation: z.string().min(1).max(600) });
export const ExplainResponse = ExplainOutput.extend({ meta: AiMeta });
export type ExplainResponse = z.infer<typeof ExplainResponse>;

// --- handoff narrative ------------------------------------------------------

export const NarrativeRequest = z.object({ handoffText: z.string().min(1).max(8000) });
export const NarrativeOutput = z.object({ narrative: z.string().min(1).max(1500) });
export const NarrativeResponse = NarrativeOutput.extend({ meta: AiMeta });
export type NarrativeResponse = z.infer<typeof NarrativeResponse>;
