import { baselineExtract } from "../baseline";
import type { RedFlag } from "../schemas";
import { mockProvider, templateNarrative } from "../mock";
import { anthropicProvider } from "./anthropic";
import { readAiConfig, selectProvider, type AiConfig } from "./config";
import { extractionToPatch, questionForExtract } from "./extraction";
import { ollamaProvider } from "./ollama";
import { ProviderError, type AiProvider } from "./provider";
import type { AiMeta, ExplainResponse, ExtractOutput, ExtractRequest, ExtractResponse, NarrativeResponse, TranslateRequest, TranslateResponse } from "./schemas";

// Shared by every API route. Request bodies are never logged.

export type ProviderHeaders = { get(name: string): string | null };

export function providerFor(headers: ProviderHeaders, cfg: AiConfig = readAiConfig()): { provider: AiProvider; note?: string } {
  const sel = selectProvider(cfg, headers.get("x-ai-provider"), headers.get("x-ollama-preset"));
  if (sel.provider === "anthropic" && cfg.anthropicKey) return { provider: anthropicProvider(cfg.anthropicKey, cfg.anthropicModel), note: sel.note };
  if (sel.provider === "ollama") {
    const translateModel = headers.get("x-ollama-preset") ? sel.ollamaModel : cfg.ollamaTranslateModel;
    return { provider: ollamaProvider(cfg.ollamaBaseUrl, sel.ollamaModel, translateModel), note: sel.note };
  }
  return { provider: mockProvider, note: sel.note };
}

function reason(e: unknown): string {
  return e instanceof ProviderError ? e.message : "Provider failed";
}

async function timed<T>(fn: () => Promise<T>): Promise<{ value: T; ms: number }> {
  const t0 = performance.now();
  const value = await fn();
  return { value, ms: Math.round(performance.now() - t0) };
}

export async function runTranslate(provider: AiProvider, r: TranslateRequest): Promise<TranslateResponse> {
  try {
    const { value, ms } = await timed(() => provider.translate(r));
    return { ...value, meta: { provider: provider.name, model: provider.model, ms } };
  } catch (e) {
    return {
      translation: r.text,
      backTranslation: r.text,
      confidence: "low",
      notes: "Translation unavailable. Shown as written. Needs review.",
      meta: { provider: "baseline", model: "none", fallbackReason: reason(e) },
    };
  }
}

export async function runExtract(provider: AiProvider, r: ExtractRequest): Promise<ExtractResponse> {
  const q = questionForExtract(r);
  let meta: AiMeta;
  let output: ExtractOutput;
  try {
    const t = await timed(() => provider.extract(r, q));
    output = t.value;
    meta = { provider: provider.name, model: provider.model, ms: t.ms };
  } catch (e) {
    // Safe fallback: the keyword baseline, always marked for review.
    output = baselineExtract(q, r.answerRaw, r.answerLanguage);
    if (output.confidence === "high") output = { ...output, confidence: "medium" as const };
    meta = { provider: "baseline", model: "keyword matching", fallbackReason: reason(e) };
  }
  // Prefer the English rendering for free-text notes when we have one.
  if (q.chartField === "notes" && r.answerEnglish && meta.provider === "baseline") {
    output = { ...output, notes: output.notes.map((n) => (n === r.answerRaw.trim() ? r.answerEnglish!.trim() : n)) };
  }
  const patch = extractionToPatch(q, output);
  return { output, patch, needsReview: output.confidence === "low" || meta.provider === "baseline", meta };
}

export async function runExplain(provider: AiProvider, flag: RedFlag): Promise<ExplainResponse> {
  try {
    const { value, ms } = await timed(() => provider.explain(flag));
    return { explanation: value, meta: { provider: provider.name, model: provider.model, ms } };
  } catch (e) {
    return { explanation: flag.explanation, meta: { provider: "baseline", model: "rule text", fallbackReason: reason(e) } };
  }
}

export async function runNarrative(provider: AiProvider, handoffText: string): Promise<NarrativeResponse> {
  try {
    const { value, ms } = await timed(() => provider.narrate(handoffText));
    return { narrative: value, meta: { provider: provider.name, model: provider.model, ms } };
  } catch (e) {
    return { narrative: templateNarrative(handoffText), meta: { provider: "baseline", model: "template", fallbackReason: reason(e) } };
  }
}
