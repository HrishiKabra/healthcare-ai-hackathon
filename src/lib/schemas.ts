import { z } from "zod";

// ---------------------------------------------------------------------------
// Languages and modes
// ---------------------------------------------------------------------------

export const PATIENT_LANGS = ["es", "vi", "zh", "ar", "hi"] as const;
export const LangCode = z.enum(["en", ...PATIENT_LANGS]);
export type LangCode = z.infer<typeof LangCode>;
export type PatientLang = (typeof PATIENT_LANGS)[number];

export const Language = z.object({
  code: LangCode,
  englishName: z.string(),
  nativeName: z.string(),
  dir: z.enum(["ltr", "rtl"]),
  speechTag: z.string(),
  verified: z.boolean(),
});
export type Language = z.infer<typeof Language>;

export const PatientMode = z.enum(["spoken", "asl", "picture"]);
export type PatientMode = z.infer<typeof PatientMode>;

export const Confidence = z.enum(["high", "medium", "low"]);
export type Confidence = z.infer<typeof Confidence>;

// ---------------------------------------------------------------------------
// Question bank
// ---------------------------------------------------------------------------

const Translations = z.record(z.enum(PATIENT_LANGS), z.string());
const Verified = z.record(z.enum(PATIENT_LANGS), z.boolean());

export const Choice = z.object({
  id: z.string(),
  english: z.string(),
  icon: z.string(),
  exclusive: z.boolean().optional(),
  translations: Translations,
  translationsVerified: Verified,
});
export type Choice = z.infer<typeof Choice>;

export const ScalarField = z.enum(["chiefComplaint", "activity", "quality"]);
export const ListField = z.enum(["provocation", "region", "radiation", "conditions", "notes"]);
export const DurationField = z.enum(["onset", "lastOralIntake", "lastKnownWell"]);
export const BoolField = z.enum(["headStrike", "pregnancy", "facialDroop", "armDrift", "speechAbnormal"]);
export type ScalarField = z.infer<typeof ScalarField>;
export type ListField = z.infer<typeof ListField>;
export type DurationField = z.infer<typeof DurationField>;
export type BoolField = z.infer<typeof BoolField>;

export const ChartField = z.enum([
  ...ScalarField.options,
  ...ListField.options,
  ...DurationField.options,
  ...BoolField.options,
  "severity",
  "allergies",
  "medications",
]);
export type ChartField = z.infer<typeof ChartField>;

export const PredicateName = z.enum(["painComplaint", "strokeSuspected", "possiblyPregnant", "allergyNeedsDetail"]);
export type PredicateName = z.infer<typeof PredicateName>;

export type Condition =
  | { type: "chartIn"; field: "chiefComplaint" | "conditions"; values: string[] }
  | { type: "predicate"; name: PredicateName }
  | { type: "all"; conditions: Condition[] }
  | { type: "any"; conditions: Condition[] };

export const Condition: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    z.object({ type: z.literal("chartIn"), field: z.enum(["chiefComplaint", "conditions"]), values: z.array(z.string()) }),
    z.object({ type: z.literal("predicate"), name: PredicateName }),
    z.object({ type: z.literal("all"), conditions: z.array(Condition) }),
    z.object({ type: z.literal("any"), conditions: z.array(Condition) }),
  ]),
);

export const AnswerType = z.enum(["yesno", "scale", "bodymap", "choice", "duration", "free", "instruction"]);
export type AnswerType = z.infer<typeof AnswerType>;

export const QuestionPhase = z.enum(["opening", "opqrst", "sample", "followup", "stroke", "closing"]);

export const Question = z.object({
  id: z.string(),
  phase: QuestionPhase,
  english: z.string(),
  answerType: AnswerType,
  multi: z.boolean().optional(),
  choices: z.array(Choice),
  chartField: ChartField,
  showIf: Condition.nullable(),
  icon: z.string(),
  translations: Translations,
  translationsVerified: Verified,
  aslVideo: z.string(),
});
export type Question = z.infer<typeof Question>;

export const QuestionBank = z.object({
  version: z.number(),
  languages: z.array(z.enum(PATIENT_LANGS)),
  questions: z.array(Question),
});

// ---------------------------------------------------------------------------
// Body regions, durations, meds, allergies
// ---------------------------------------------------------------------------

export const BODY_REGIONS = [
  "head",
  "face",
  "neck",
  "chest",
  "upper_abdomen",
  "lower_abdomen",
  "pelvis",
  "back",
  "left_arm",
  "right_arm",
  "left_leg",
  "right_leg",
] as const;
export const BodyRegion = z.enum(BODY_REGIONS);
export type BodyRegion = z.infer<typeof BodyRegion>;

export const DurationBucket = z.enum(["minutes", "about_1_hour", "few_hours", "today", "yesterday", "days", "unknown"]);
export type DurationBucket = z.infer<typeof DurationBucket>;
export const DurationUnit = z.enum(["minutes", "hours", "days"]);
export type DurationUnit = z.infer<typeof DurationUnit>;

export const Duration = z.object({
  bucket: DurationBucket,
  amount: z.number().nonnegative().nullable().optional(),
  unit: DurationUnit.nullable().optional(),
  /** Best estimate of how long ago, in minutes. null when unknown. */
  approxMinutes: z.number().nullable(),
  /** Epoch ms, computed from the call start. Filled in by the chart builder. */
  absoluteTime: z.number().nullable().optional(),
});
export type Duration = z.infer<typeof Duration>;

export const AllergyCategory = z.enum([
  "aspirin",
  "nsaid",
  "penicillin",
  "sulfa",
  "opioid",
  "latex",
  "food",
  "other",
  "none",
  "unspecified",
]);
export type AllergyCategory = z.infer<typeof AllergyCategory>;

export const Allergy = z.object({
  raw: z.string(),
  substance: z.string().nullable(),
  category: AllergyCategory,
});
export type Allergy = z.infer<typeof Allergy>;

export const Medication = z.object({
  raw: z.string(),
  /** Generic name, or null when only a class is known ("blood thinner"). "none" means the patient takes no medicines. */
  generic: z.string().nullable(),
  drugClass: z.string(),
  /** Where the class came from: the local table (trusted) or the model (fallback). */
  classSource: z.enum(["table", "model", "quickpick", "none"]).optional(),
});
export type Medication = z.infer<typeof Medication>;

// ---------------------------------------------------------------------------
// Chart patches (what one answer contributes)
// ---------------------------------------------------------------------------

export const PatchEntry = z.union([
  z.object({ field: ScalarField, value: z.string(), confidence: Confidence }),
  z.object({ field: ListField, value: z.string(), confidence: Confidence }),
  z.object({ field: DurationField, value: Duration, confidence: Confidence }),
  z.object({ field: BoolField, value: z.boolean(), confidence: Confidence }),
  z.object({ field: z.literal("severity"), value: z.number().min(0).max(10), confidence: Confidence }),
  z.object({ field: z.literal("allergies"), value: Allergy, confidence: Confidence }),
  z.object({ field: z.literal("medications"), value: Medication, confidence: Confidence }),
]);
export type PatchEntry = z.infer<typeof PatchEntry>;

// ---------------------------------------------------------------------------
// Clinical chart
// ---------------------------------------------------------------------------

export function chartValue<T extends z.ZodTypeAny>(inner: T) {
  return z.object({
    value: inner,
    sourceAnswerId: z.string(),
    sourceQuestionId: z.string(),
    confidence: Confidence,
    confirmed: z.boolean(),
  });
}
export type ChartValue<T> = {
  value: T;
  sourceAnswerId: string;
  sourceQuestionId: string;
  confidence: Confidence;
  confirmed: boolean;
};

export const Conflict = z.object({
  field: ChartField,
  values: z.array(chartValue(z.unknown())),
});
export type Conflict = { field: ChartField; values: ChartValue<unknown>[] };

export const ClinicalChart = z.object({
  chiefComplaint: chartValue(z.string()).optional(),
  onset: chartValue(Duration).optional(),
  activity: chartValue(z.string()).optional(),
  provocation: z.array(chartValue(z.string())),
  quality: chartValue(z.string()).optional(),
  region: z.array(chartValue(z.string())),
  radiation: z.array(chartValue(z.string())),
  severity: chartValue(z.number()).optional(),
  allergies: z.array(chartValue(Allergy)),
  medications: z.array(chartValue(Medication)),
  conditions: z.array(chartValue(z.string())),
  lastOralIntake: chartValue(Duration).optional(),
  headStrike: chartValue(z.boolean()).optional(),
  pregnancy: chartValue(z.boolean()).optional(),
  strokeScreen: z.object({
    facialDroop: chartValue(z.boolean()).optional(),
    armDrift: chartValue(z.boolean()).optional(),
    speechAbnormal: chartValue(z.boolean()).optional(),
  }),
  lastKnownWell: chartValue(Duration).optional(),
  notes: z.array(chartValue(z.string())),
  conflicts: z.array(Conflict),
});
export type ClinicalChart = z.infer<typeof ClinicalChart>;

// ---------------------------------------------------------------------------
// Answers
// ---------------------------------------------------------------------------

export const AnswerValue = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("yesno"), value: z.enum(["yes", "no"]) }),
  z.object({ kind: z.literal("scale"), value: z.number().int().min(0).max(10) }),
  z.object({ kind: z.literal("bodymap"), regions: z.array(BodyRegion) }),
  z.object({ kind: z.literal("choice"), choiceIds: z.array(z.string()) }),
  z.object({
    kind: z.literal("duration"),
    bucket: DurationBucket,
    amount: z.number().nonnegative().nullable().optional(),
    unit: DurationUnit.nullable().optional(),
  }),
  z.object({ kind: z.literal("free"), text: z.string(), english: z.string().optional() }),
  z.object({ kind: z.literal("observation"), value: z.boolean() }),
  z.object({ kind: z.literal("gesture"), value: z.enum(["yes", "no"]) }),
]);
export type AnswerValue = z.infer<typeof AnswerValue>;

export const ConfirmText = z.object({
  /** Shown to the patient, in the patient's language. */
  native: z.string(),
  /** Shown to the EMT. */
  english: z.string(),
});
export type ConfirmText = z.infer<typeof ConfirmText>;

export const Answer = z.object({
  id: z.string(),
  questionId: z.string(),
  value: AnswerValue,
  language: LangCode,
  by: z.enum(["patient", "emt"]),
  status: z.enum(["pending", "confirmed", "rejected"]),
  at: z.number(),
  patch: z.array(PatchEntry),
  confirmText: ConfirmText,
  /** Which pipeline produced the patch, for the EMT's information. */
  source: z.enum(["structured", "mock", "baseline", "anthropic", "ollama", "emt"]),
  needsReview: z.boolean().optional(),
});
export type Answer = z.infer<typeof Answer>;

// ---------------------------------------------------------------------------
// EMT inputs
// ---------------------------------------------------------------------------

export const TREATMENTS = ["oxygen", "aspirin", "iv_access", "glucose_checked", "splint", "c_collar"] as const;
export const Treatment = z.enum(TREATMENTS);
export type Treatment = z.infer<typeof Treatment>;

export const Vitals = z.object({
  heartRate: z.string().default(""),
  bloodPressure: z.string().default(""),
  spo2: z.string().default(""),
  respRate: z.string().default(""),
  glucose: z.string().default(""),
});
export type Vitals = z.infer<typeof Vitals>;

export const Sex = z.enum(["unknown", "female", "male", "other"]);
export type Sex = z.infer<typeof Sex>;

export const EmtInputs = z.object({
  age: z.string().default(""),
  sex: Sex.default("unknown"),
  vitals: Vitals.default({ heartRate: "", bloodPressure: "", spo2: "", respRate: "", glucose: "" }),
  treatments: z.array(Treatment).default([]),
});
export type EmtInputs = z.infer<typeof EmtInputs>;

// ---------------------------------------------------------------------------
// Red flags
// ---------------------------------------------------------------------------

export const Fact = z.object({ label: z.string(), value: z.string(), confirmed: z.boolean() });
export type Fact = z.infer<typeof Fact>;

export const RedFlag = z.object({
  ruleId: z.string(),
  number: z.number(),
  title: z.string(),
  severity: z.enum(["critical", "warning"]),
  rule: z.string(),
  facts: z.array(Fact),
  explanation: z.string(),
  basedOnUnconfirmed: z.boolean(),
});
export type RedFlag = z.infer<typeof RedFlag>;
