import { OLLAMA_PRESETS, type OllamaPreset } from "../settings";

// Server-side configuration. Keys are read here, inside API routes only, and
// never sent to the browser.

export type AiConfig = {
  demoMode: boolean;
  defaultProvider: "mock" | "anthropic" | "ollama";
  anthropicKey: string | null;
  anthropicModel: string;
  ollamaBaseUrl: string;
  ollamaModel: string;
  ollamaTranslateModel: string;
};

export function readAiConfig(env: Record<string, string | undefined> = process.env): AiConfig {
  const p = (env.AI_PROVIDER ?? "mock").trim().toLowerCase();
  const defaultProvider = p === "anthropic" || p === "ollama" ? p : "mock";
  const ollamaModel = env.OLLAMA_MODEL?.trim() || OLLAMA_PRESETS.light.model;
  return {
    // Unset means demo mode, so a fresh clone can never make a paid call.
    demoMode: (env.DEMO_MODE ?? "true").trim().toLowerCase() !== "false",
    defaultProvider,
    anthropicKey: env.ANTHROPIC_API_KEY?.trim() || null,
    anthropicModel: env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-5-5",
    ollamaBaseUrl: (env.OLLAMA_BASE_URL?.trim() || "http://localhost:11434").replace(/\/+$/, ""),
    ollamaModel,
    ollamaTranslateModel: env.OLLAMA_TRANSLATE_MODEL?.trim() || ollamaModel,
  };
}

export type Selection = {
  provider: "mock" | "anthropic" | "ollama";
  /** Model to use for Ollama, possibly from the settings preset. */
  ollamaModel: string;
  note?: string;
};

/**
 * Picks the provider for one request.
 * - DEMO_MODE=true: always mock.
 * - Otherwise AI_PROVIDER is the default. The settings panel may switch to mock
 *   or on-device at runtime. Cloud is only used when the team set
 *   AI_PROVIDER=anthropic and a key exists, so a browser can never opt into a paid call.
 */
export function selectProvider(cfg: AiConfig, requested: string | null, preset: string | null): Selection {
  const presetModel = preset && preset in OLLAMA_PRESETS ? OLLAMA_PRESETS[preset as OllamaPreset].model : null;
  const ollamaModel = presetModel ?? cfg.ollamaModel;
  if (cfg.demoMode) return { provider: "mock", ollamaModel, note: requested && requested !== "default" && requested !== "mock" ? "DEMO_MODE is on" : undefined };
  const cloudAllowed = cfg.defaultProvider === "anthropic" && !!cfg.anthropicKey;
  const want = !requested || requested === "default" ? cfg.defaultProvider : requested;
  if (want === "anthropic") return cloudAllowed ? { provider: "anthropic", ollamaModel } : { provider: "mock", ollamaModel, note: "Cloud needs AI_PROVIDER=anthropic and ANTHROPIC_API_KEY in .env" };
  if (want === "ollama") return { provider: "ollama", ollamaModel };
  return { provider: "mock", ollamaModel };
}
