import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";
import { jsonSchemaFor } from "./jsonSchema";
import { extractPrompt, explainPrompt, narrativePrompt, translatePrompt } from "./prompts";
import { ProviderError, type AiProvider } from "./provider";
import { ExplainOutput, ExtractOutput, NarrativeOutput, TranslateOutput } from "./schemas";

// Cloud provider. Structured output comes from a strict tool whose input schema
// is derived from the Zod schema; the result is validated with Zod again.
// Forced tool_choice is not available on this model family, so the prompt
// names the tool and a missing tool call counts as invalid output.

async function callTool<T>(client: Anthropic, model: string, schema: z.ZodType<T>, toolName: string, description: string, system: string, user: string): Promise<T> {
  let response;
  try {
    response = await client.beta.messages.create({
      model,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      system,
      tools: [{ name: toolName, description, strict: true, input_schema: jsonSchemaFor(schema, { strict: true }) as Anthropic.Beta.BetaTool.InputSchema }],
      tool_choice: { type: "auto" },
      messages: [{ role: "user", content: `${user}\n\nRespond by calling the ${toolName} tool.` }],
    });
  } catch (e) {
    if (e instanceof Anthropic.APIConnectionTimeoutError) throw new ProviderError("Cloud request timed out", "timeout");
    if (e instanceof Anthropic.APIConnectionError) throw new ProviderError("Cloud provider unreachable", "unreachable");
    if (e instanceof Anthropic.APIError) throw new ProviderError(`Cloud provider error ${e.status ?? ""}`.trim(), "http");
    throw e;
  }
  if (response.stop_reason === "refusal") throw new ProviderError("Cloud provider declined", "refused");
  const block = response.content.find((b) => b.type === "tool_use" && b.name === toolName);
  if (!block || block.type !== "tool_use") throw new ProviderError("No tool call in response", "invalid_output");
  const parsed = schema.safeParse(block.input);
  if (!parsed.success) throw new ProviderError("Cloud output failed validation", "invalid_output");
  return parsed.data;
}

export function anthropicProvider(apiKey: string, model: string): AiProvider {
  const client = new Anthropic({ apiKey, timeout: 30_000, maxRetries: 1 });
  return {
    name: "anthropic",
    model,
    translate: async (r) => {
      const p = translatePrompt(r);
      return callTool(client, model, TranslateOutput, "record_translation", "Record the translation, back-translation, confidence, and notes.", p.system, p.user);
    },
    extract: async (r, q) => {
      const p = extractPrompt(r, q);
      return callTool(client, model, ExtractOutput, "record_facts", "Record the clinical facts stated in the patient's answer.", p.system, p.user);
    },
    explain: async (flag) => {
      const p = explainPrompt(flag);
      return (await callTool(client, model, ExplainOutput, "record_explanation", "Record the plain-English explanation.", p.system, p.user)).explanation;
    },
    narrate: async (text) => {
      const p = narrativePrompt(text);
      return (await callTool(client, model, NarrativeOutput, "record_summary", "Record the one-paragraph summary.", p.system, p.user)).narrative;
    },
  };
}
