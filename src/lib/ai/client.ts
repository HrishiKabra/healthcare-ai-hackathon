// Browser-side calls to the AI routes. Replaced with real API calls in phase 4.
import type { FreeInterpretation } from "@/hooks/usePatientAnswering";
import type { LangCode, Question } from "../schemas";

export async function interpretFreeAnswer(q: Question, text: string, lang: LangCode): Promise<FreeInterpretation> {
  void q;
  void lang;
  return {
    patch: [{ field: "notes", value: text, confidence: "low" }],
    confirmText: { native: text, english: text },
    english: text,
    source: "baseline",
    needsReview: true,
  };
}
