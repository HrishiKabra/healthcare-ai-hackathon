import { describe, expect, it } from "vitest";
import { defaultSettings, loadSettings } from "./settings";

describe("settings", () => {
  it("defaults to the server provider and the light Ollama preset", () => {
    expect(defaultSettings()).toEqual({ provider: "default", ollamaPreset: "light", gestureAnswers: false });
  });

  it("falls back to defaults when storage is unavailable (server)", () => {
    expect(loadSettings()).toEqual(defaultSettings());
  });
});
