import { z } from "zod";
import { readJson, writeJson } from "./storage";

// Settings only. Never patient data.
export const ProviderChoice = z.enum(["default", "mock", "anthropic", "ollama"]);
export type ProviderChoice = z.infer<typeof ProviderChoice>;

export const OLLAMA_PRESETS = {
  light: { model: "qwen3:1.7b", label: "Light (default)", memory: "about 1.5 GB" },
  balanced: { model: "qwen3:4b", label: "Balanced", memory: "about 3 GB" },
  better: { model: "gemma4:e2b", label: "Better (needs more free memory)", memory: "about 5 GB or more" },
} as const;
export type OllamaPreset = keyof typeof OLLAMA_PRESETS;

export const Settings = z.object({
  provider: ProviderChoice.default("default"),
  ollamaPreset: z.enum(["light", "balanced", "better"]).default("light"),
  gestureAnswers: z.boolean().default(false),
  /** EMT console reads each translated patient answer and each new red flag or warning aloud in English. */
  readAloud: z.boolean().default(false),
});
export type Settings = z.infer<typeof Settings>;

const KEY = "firstwords.settings";

export function defaultSettings(): Settings {
  return Settings.parse({});
}

export function loadSettings(): Settings {
  const parsed = Settings.safeParse(readJson("local", KEY) ?? {});
  return parsed.success ? parsed.data : defaultSettings();
}

export function saveSettings(s: Settings): void {
  writeJson("local", KEY, s);
}
