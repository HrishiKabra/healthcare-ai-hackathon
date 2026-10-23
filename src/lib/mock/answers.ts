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
  // Canned outputs for the extra eval cases (eval/scenarios/04 to 10). In demo
  // mode these play the part of the model; real providers are measured with
  // npm run eval -- --provider anthropic | ollama.
  "es-xarelto-fall": [
    {
      questionId: "chief_complaint",
      language: "es",
      answerRaw: "Me caí en el baño y me pegué en la cabeza.",
      english: "I fell in the bathroom and hit my head.",
      backTranslation: "Me caí en el baño y me golpeé la cabeza.",
      output: { chiefComplaint: "fall_injury", region: ["head"], notes: ["Fell in the bathroom and hit head."], confidence: "high", summaryEnglish: "Fell and hit head." },
    },
    {
      questionId: "medications",
      language: "es",
      answerRaw: "Tomo una pastilla para adelgazar la sangre, creo que se llama Xarelto.",
      english: "I take a pill to thin my blood, I think it is called Xarelto.",
      backTranslation: "Tomo una pastilla para adelgazar la sangre, creo que se llama Xarelto.",
      output: { medications: [{ raw: "Xarelto", generic: "rivaroxaban", drugClass: "anticoagulant" }], confidence: "medium", summaryEnglish: "Takes Xarelto (rivaroxaban), a blood thinner." },
    },
    {
      questionId: "head_strike",
      language: "es",
      answerRaw: "Sí, con el lavamanos.",
      english: "Yes, on the sink.",
      backTranslation: "Sí, con el lavamanos.",
      output: { yesNo: "yes", confidence: "high", summaryEnglish: "Hit head on the sink." },
    },
  ],
  "zh-insulin-dizzy": [
    {
      questionId: "chief_complaint",
      language: "zh",
      answerRaw: "我头很晕，站都站不稳。",
      english: "I am very dizzy and cannot stand steady.",
      backTranslation: "我头很晕，站不稳。",
      output: { chiefComplaint: "dizziness", confidence: "high", summaryEnglish: "Very dizzy, unsteady." },
    },
    {
      questionId: "medications",
      language: "zh",
      answerRaw: "我每天打胰岛素。",
      english: "I inject insulin every day.",
      backTranslation: "我每天打胰岛素。",
      output: { medications: [{ raw: "胰岛素", generic: "insulin", drugClass: "insulin" }], confidence: "high", summaryEnglish: "Daily insulin." },
    },
    {
      questionId: "conditions",
      language: "zh",
      answerRaw: "我有糖尿病。",
      english: "I have diabetes.",
      backTranslation: "我有糖尿病。",
      output: { conditions: ["diabetes"], confidence: "high", summaryEnglish: "Diabetes." },
    },
  ],
  "hi-blood-thinner-fall": [
    {
      questionId: "chief_complaint",
      language: "hi",
      answerRaw: "मैं सीढ़ियों से गिर गया और सिर में चोट लगी।",
      english: "I fell down the stairs and hurt my head.",
      backTranslation: "मैं सीढ़ियों से गिर गया और सिर में चोट लगी।",
      output: { chiefComplaint: "fall_injury", region: ["head"], confidence: "high", summaryEnglish: "Fell down stairs, head injury." },
    },
    {
      questionId: "medications",
      language: "hi",
      answerRaw: "मैं खून पतला करने की दवा लेता हूँ।",
      english: "I take a medicine to thin my blood.",
      backTranslation: "मैं खून पतला करने की दवा लेता हूँ।",
      output: { medications: [{ raw: "खून पतला करने की दवा", generic: null, drugClass: "anticoagulant" }], confidence: "medium", summaryEnglish: "Takes a blood thinner, name not given." },
    },
    {
      questionId: "head_strike",
      language: "hi",
      answerRaw: "हाँ",
      english: "Yes",
      backTranslation: "हाँ",
      output: { yesNo: "yes", confidence: "high", summaryEnglish: "Yes." },
    },
  ],
  "vi-penicillin-breathing": [
    {
      questionId: "chief_complaint",
      language: "vi",
      answerRaw: "Tôi thở không nổi, ngực nặng lắm.",
      english: "I can barely breathe, my chest feels very heavy.",
      backTranslation: "Tôi gần như không thở được, ngực rất nặng.",
      output: { chiefComplaint: "trouble_breathing", confidence: "high", summaryEnglish: "Severe trouble breathing, chest heaviness." },
    },
    {
      questionId: "allergy_detail",
      language: "vi",
      answerRaw: "Tôi bị dị ứng với amoxicillin.",
      english: "I am allergic to amoxicillin.",
      backTranslation: "Tôi bị dị ứng với amoxicillin.",
      output: { allergies: [{ raw: "amoxicillin", substance: "amoxicillin", category: "penicillin" }], confidence: "high", summaryEnglish: "Allergic to amoxicillin." },
    },
    {
      questionId: "anything_else",
      language: "vi",
      answerRaw: "Môi tôi đang sưng lên.",
      english: "My lips are swelling.",
      backTranslation: "Môi tôi đang sưng lên.",
      output: { notes: ["Lips are swelling."], confidence: "high", summaryEnglish: "Lips swelling." },
    },
  ],
  "ar-chest-tearing": [
    {
      questionId: "chief_complaint",
      language: "ar",
      answerRaw: "عندي ألم شديد في صدري، كأنه يتمزق.",
      english: "I have severe pain in my chest, like it is tearing.",
      backTranslation: "عندي ألم شديد في صدري، كأنه يتمزق.",
      output: { chiefComplaint: "chest_pain", quality: "tearing", region: ["chest"], confidence: "high", summaryEnglish: "Severe tearing chest pain." },
    },
    {
      questionId: "radiation",
      language: "ar",
      answerRaw: "ينتقل إلى ظهري.",
      english: "It moves to my back.",
      backTranslation: "ينتقل إلى ظهري.",
      output: { radiation: ["back"], confidence: "high", summaryEnglish: "Radiates to the back." },
    },
    {
      questionId: "medications",
      language: "ar",
      answerRaw: "لا آخذ أي دواء.",
      english: "I do not take any medicine.",
      backTranslation: "لا آخذ أي دواء.",
      output: { medications: [{ raw: "لا آخذ أي دواء", generic: "none", drugClass: "none" }], confidence: "high", summaryEnglish: "No medications." },
    },
  ],
  "es-pregnant-belly": [
    {
      questionId: "chief_complaint",
      language: "es",
      answerRaw: "Me duele mucho la panza, aquí abajo.",
      english: "My belly hurts a lot, down here.",
      backTranslation: "Me duele mucho la barriga, aquí abajo.",
      output: { chiefComplaint: "belly_pain", region: ["lower_abdomen"], confidence: "high", summaryEnglish: "Severe lower belly pain." },
    },
    {
      questionId: "pregnancy",
      language: "es",
      answerRaw: "Sí, tengo como tres meses.",
      english: "Yes, I am about three months along.",
      backTranslation: "Sí, tengo unos tres meses de embarazo.",
      output: { yesNo: "yes", notes: ["About three months pregnant."], confidence: "high", summaryEnglish: "Pregnant, about 3 months." },
    },
  ],
  "zh-aspirin-conflict": [
    {
      questionId: "chief_complaint",
      language: "zh",
      answerRaw: "胸口很闷，像有东西压着。",
      english: "My chest feels very tight, like something is pressing on it.",
      backTranslation: "我胸口很闷，像有东西压着。",
      output: { chiefComplaint: "chest_pain", quality: "pressure", region: ["chest"], confidence: "high", summaryEnglish: "Chest tightness, pressure-like." },
    },
    {
      questionId: "allergy_any",
      language: "zh",
      answerRaw: "没有。",
      english: "No.",
      backTranslation: "没有。",
      output: { yesNo: "no", confidence: "high", summaryEnglish: "No allergies." },
    },
    {
      questionId: "anything_else",
      language: "zh",
      answerRaw: "其实我对阿司匹林过敏，吃了会起疹子。",
      english: "Actually I am allergic to aspirin, it gives me a rash.",
      backTranslation: "其实我对阿司匹林过敏，吃了会起疹子。",
      output: { allergies: [{ raw: "阿司匹林", substance: "aspirin", category: "aspirin" }], notes: ["Aspirin causes a rash."], confidence: "high", summaryEnglish: "Allergic to aspirin (rash)." },
    },
  ],
};
