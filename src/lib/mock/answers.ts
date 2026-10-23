import type { LangCode } from "../schemas";
import type { ExtractOutput } from "../ai/schemas";

// Canned AI responses for demo mode, keyed by scenario (or eval case) and
// question. These stand in for the model so the three demo scenarios run end
// to end with no key and no network. Anything not listed here goes to the
// keyword baseline.

export type MockAnswer = {
  questionId: string;
  language: LangCode;
  answerRaw: string;
  english: string;
  /** The English meaning translated back into the patient's language. */
  backTranslation: string;
  output: Partial<ExtractOutput>;
};

export const MOCK_ANSWERS: Record<string, MockAnswer[]> = {
  "es-chest-pain": [
    {
      questionId: "chief_complaint",
      language: "es",
      answerRaw: "Me duele mucho el pecho, como una presión.",
      english: "My chest hurts a lot, like pressure.",
      backTranslation: "Me duele mucho el pecho, como una presión.",
      output: { chiefComplaint: "chest_pain", quality: "pressure", region: ["chest"], confidence: "high", summaryEnglish: "Chest pain, pressure-like." },
    },
    {
      questionId: "allergy_detail",
      language: "es",
      answerRaw: "Soy alérgico a la aspirina, me salen ronchas.",
      english: "I am allergic to aspirin, I get hives.",
      backTranslation: "Soy alérgico a la aspirina, me salen ronchas.",
      output: {
        allergies: [{ raw: "aspirina", substance: "aspirin", category: "aspirin" }],
        notes: ["Reaction to aspirin: hives."],
        confidence: "high",
        summaryEnglish: "Allergic to aspirin (hives).",
      },
    },
    {
      questionId: "medications",
      language: "es",
      answerRaw: "Tomo metformina para el azúcar.",
      english: "I take metformin for my sugar.",
      backTranslation: "Tomo metformina para el azúcar.",
      output: { medications: [{ raw: "metformina", generic: "metformin", drugClass: "antidiabetic" }], confidence: "high", summaryEnglish: "Takes metformin." },
    },
    {
      questionId: "anything_else",
      language: "es",
      answerRaw: "No, nada más. Gracias.",
      english: "No, nothing else. Thank you.",
      backTranslation: "No, nada más. Gracias.",
      output: { notes: ["Patient has nothing else to add."], confidence: "high", summaryEnglish: "Nothing else to add." },
    },
  ],
  "asl-fall": [
    {
      questionId: "medications",
      language: "en",
      answerRaw: "Eliquis",
      english: "Eliquis",
      backTranslation: "Eliquis",
      output: { medications: [{ raw: "Eliquis", generic: "apixaban", drugClass: "anticoagulant" }], confidence: "high", summaryEnglish: "Takes Eliquis (apixaban)." },
    },
  ],
};
