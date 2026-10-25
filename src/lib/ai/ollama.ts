import type { z } from "zod";
import { jsonSchemaFor } from "./jsonSchema";
import { extractPrompt, explainPrompt, narrativePrompt, translatePrompt } from "./prompts";
import { ProviderError, type AiProvider } from "./provider";
import { ExplainOutput, ExtractOutput, NarrativeOutput, TranslateOutput } from "./schemas";

// On-device provider through Ollama's native chat endpoint. `format` carries the
// JSON schema so the model is forced into valid JSON; Zod validates it anyway.

const TIMEOUT_MS = 60_000;
// Keep the model in memory between answers so a call does not pay the load time again.
const KEEP_ALIVE = "30m";

async function callJson<T>(baseUrl: string, model: string, schema: z.ZodType<T>, system: string, user: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        model,
        stream: false,
        think: false,
        keep_alive: KEEP_ALIVE,
        format: jsonSchemaFor(schema),
        options: { temperature: 0 },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
  } catch (e) {
    const timeout = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    throw new ProviderError(timeout ? "On-device model timed out" : "Ollama is not running", timeout ? "timeout" : "unreachable");
  }
  if (!res.ok) throw new ProviderError(res.status === 404 ? `Model ${model} is not installed in Ollama` : `Ollama error ${res.status}`, "http");
  let content: unknown;
  try {
    const data = (await res.json()) as { message?: { content?: string } };
    content = JSON.parse(data.message?.content ?? "");
  } catch {
    throw new ProviderError("On-device output was not JSON", "invalid_output");
  }
  const parsed = schema.safeParse(content);
  if (!parsed.success) throw new ProviderError("On-device output failed validation", "invalid_output");
  return parsed.data;
}

export function ollamaProvider(baseUrl: string, model: string, translateModel: string = model): AiProvider {
  return {
    name: "ollama",
    model,
    translate: async (r) => {
      const p = translatePrompt(r);
      return callJson(baseUrl, translateModel, TranslateOutput, p.system, p.user);
    },
    extract: async (r, q) => {
      const p = extractPrompt(r, q);
      return callJson(baseUrl, model, ExtractOutput, p.system, p.user);
    },
    explain: async (flag) => {
      const p = explainPrompt(flag);
      return (await callJson(baseUrl, model, ExplainOutput, p.system, p.user)).explanation;
    },
    narrate: async (text) => {
      const p = narrativePrompt(text);
      return (await callJson(baseUrl, model, NarrativeOutput, p.system, p.user)).narrative;
    },
  };
}

export type OllamaStatus = { reachable: boolean; installed: boolean; models: string[]; error?: string };

/** GET /api/tags: is Ollama running, and is the chosen model pulled? */
export async function ollamaStatus(baseUrl: string, model: string): Promise<OllamaStatus> {
  try {
    const res = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return { reachable: false, installed: false, models: [], error: `HTTP ${res.status}` };
    const data = (await res.json()) as { models?: { name?: string }[] };
    const models = (data.models ?? []).map((m) => m.name ?? "").filter(Boolean);
    const want = model.includes(":") ? model : `${model}:latest`;
    return { reachable: true, installed: models.includes(model) || models.includes(want), models };
  } catch {
    return { reachable: false, installed: false, models: [], error: "Ollama is not running" };
  }
}
