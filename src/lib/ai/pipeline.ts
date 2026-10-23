import { confirmFromPatch } from "../interpret";
import type { Answer, LangCode, Question } from "../schemas";
import { hasStructured } from "./extraction";
import type { AiMeta, ExtractRequest, ExtractResponse, TranslateRequest, TranslateResponse } from "./schemas";

export type AiCalls = {
  translate: (r: TranslateRequest) => Promise<TranslateResponse>;
  extract: (r: ExtractRequest) => Promise<ExtractResponse>;
};

export type FreeResult = {
  patch: ExtractResponse["patch"];
  confirmText: { native: string; english: string };
  english: string;
  source: Answer["source"];
  needsReview: boolean;
  meta: AiMeta;
};

/**
 * A free answer in the patient's own words: translate to English, extract
 * chart fields, then build the confirm-back text in code from what was
 * understood (localized labels). The model's own wording is only used when
 * nothing structured came out. An empty patch means "could not understand".
 */
export async function interpretFree(calls: AiCalls, q: Question, text: string, lang: LangCode): Promise<FreeResult> {
  let english = text;
  let back = text;
  let lowTranslation = false;
  if (lang !== "en") {
    const t = await calls.translate({ text, from: lang, to: "en", context: "answer" });
    english = t.translation;
    back = t.backTranslation || text;
    lowTranslation = t.confidence === "low";
  }
  const x = await calls.extract({ questionId: q.id, questionEnglish: q.english, answerRaw: text, answerLanguage: lang, answerEnglish: english });
  const source: Answer["source"] = x.meta.provider;
  const needsReview = x.needsReview || lowTranslation;
  if (!x.patch.length) {
    return { patch: [], confirmText: { native: "", english }, english, source, needsReview: true, meta: x.meta };
  }
  const structured = x.patch.filter((e) => e.field !== "notes");
  const confirmText = hasStructured(x.patch)
    ? { native: confirmFromPatch(structured, lang).native, english: confirmFromPatch(x.patch, "en").english }
    : { native: back, english: x.patch.map((e) => String(e.value)).join("\n") || english };
  return { patch: x.patch, confirmText, english, source, needsReview, meta: x.meta };
}
