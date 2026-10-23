// Browser-side calls to the AI routes. Keys never reach the browser: the
// server picks the provider; the browser only sends the settings choice.
import type { z } from "zod";
import type { FreeInterpretation } from "@/hooks/usePatientAnswering";
import { loadSettings } from "../settings";
import type { LangCode, Question, RedFlag } from "../schemas";
import { interpretFree, type AiCalls } from "./pipeline";
import {
  ExplainResponse,
  ExtractResponse,
  NarrativeResponse,
  TranslateResponse,
  type AiMeta,
  type ExtractRequest,
  type TranslateRequest,
} from "./schemas";

export const AI_EVENT = "firstwords:ai";

export function settingsHeaders(): Record<string, string> {
  const s = loadSettings();
  const h: Record<string, string> = { "content-type": "application/json" };
  if (s.provider !== "default") h["x-ai-provider"] = s.provider;
  h["x-ollama-preset"] = s.ollamaPreset;
  return h;
}

async function post<T>(path: string, body: unknown, schema: z.ZodType<T & { meta: AiMeta }>): Promise<T & { meta: AiMeta }> {
  const res = await fetch(path, { method: "POST", headers: settingsHeaders(), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${path} failed with ${res.status}`);
  const parsed = schema.safeParse(await res.json());
  if (!parsed.success) throw new Error(`${path} returned an unexpected shape`);
  try {
    window.dispatchEvent(new CustomEvent(AI_EVENT, { detail: parsed.data.meta }));
  } catch {
    // ignore
  }
  return parsed.data;
}

export const apiCalls: AiCalls = {
  translate: (r: TranslateRequest) => post("/api/translate", r, TranslateResponse),
  extract: (r: ExtractRequest) => post("/api/extract", r, ExtractResponse),
};

export async function interpretFreeAnswer(q: Question, text: string, lang: LangCode): Promise<FreeInterpretation> {
  return interpretFree(apiCalls, q, text, lang);
}

export async function translateQuestion(text: string, to: LangCode) {
  return apiCalls.translate({ text, from: "en", to, context: "question" });
}

export async function explainFlag(flag: RedFlag) {
  return post("/api/explain-flag", { flag }, ExplainResponse);
}

export async function handoffNarrative(handoffText: string) {
  return post("/api/handoff", { handoffText }, NarrativeResponse);
}
