import { baselineExtract } from "../baseline";
import { normalizeText } from "../meds";
import { ExtractOutput, type ExtractRequest, type TranslateOutput, type TranslateRequest } from "../ai/schemas";
import type { AiProvider } from "../ai/provider";
import type { Question, RedFlag } from "../schemas";
import { MOCK_ANSWERS, type MockAnswer } from "./answers";
import { MOCK_FREEFORM } from "./freeform";

const strip = (s: string) => normalizeText(s).replace(/[^\p{L}\p{N} ]+/gu, "").replace(/\s+/g, " ").trim();

/** Extra canned answers registered at runtime (the eval adds its cases). */
const EXTRA: MockAnswer[] = [];
export function registerMockAnswers(list: MockAnswer[]): void {
  EXTRA.push(...list);
}

export function findMockAnswer(questionId: string | null, text: string): MockAnswer | undefined {
  const key = strip(text);
  const all = [...Object.values(MOCK_ANSWERS).flat(), ...EXTRA];
  return all.find((m) => (questionId == null || m.questionId === questionId || questionId.startsWith("ff-")) && strip(m.answerRaw) === key);
}

export function mockTranslate(r: TranslateRequest): TranslateOutput {
  if (r.from === r.to) return { translation: r.text, backTranslation: r.text, confidence: "high", notes: "" };
  if (r.context === "question" && r.from === "en" && r.to !== "en") {
    const hit = MOCK_FREEFORM.find((f) => strip(f.english) === strip(r.text));
    if (hit) return { translation: hit.translations[r.to], backTranslation: hit.english, confidence: "high", notes: "" };
  }
  if (r.context === "answer" && r.to === "en") {
    const hit = findMockAnswer(null, r.text);
    if (hit) return { translation: hit.english, backTranslation: hit.backTranslation, confidence: "high", notes: "" };
  }
  return {
    translation: r.text,
    backTranslation: r.text,
    confidence: "low",
    notes: "Demo mode cannot translate new sentences. Shown as written.",
  };
}

export function mockExtract(r: ExtractRequest, q: Question): ExtractOutput {
  const hit = findMockAnswer(r.questionId, r.answerRaw);
  if (hit) return ExtractOutput.parse(hit.output);
  return baselineExtract(q, r.answerRaw, r.answerLanguage);
}

export function templateNarrative(handoffText: string): string {
  const first = handoffText.split("\n").find((l) => l.startsWith("M:"))?.replace(/^M:\s*/, "") ?? "See handoff";
  return `Demo summary: ${first}. Review the structured handoff below before acting.`;
}

/** Demo-mode provider: canned responses, keyword baseline for anything else. No network. */
export const mockProvider: AiProvider = {
  name: "mock",
  model: "canned responses",
  translate: async (r) => mockTranslate(r),
  extract: async (r, q) => mockExtract(r, q),
  explain: async (flag: RedFlag) => flag.explanation,
  narrate: async (text) => templateNarrative(text),
};
