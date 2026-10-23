import { describe, expect, it } from "vitest";
import { readAiConfig, selectProvider } from "./config";

describe("provider selection", () => {
  it("defaults to demo mode with no env at all", () => {
    const cfg = readAiConfig({});
    expect(cfg.demoMode).toBe(true);
    expect(selectProvider(cfg, "ollama", null).provider).toBe("mock");
  });

  it("DEMO_MODE=true wins over AI_PROVIDER and the settings panel", () => {
    const cfg = readAiConfig({ AI_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "k", DEMO_MODE: "true" });
    expect(selectProvider(cfg, "anthropic", null).provider).toBe("mock");
  });

  it("never lets the browser opt into a paid call", () => {
    const cfg = readAiConfig({ AI_PROVIDER: "ollama", ANTHROPIC_API_KEY: "k", DEMO_MODE: "false" });
    expect(selectProvider(cfg, "anthropic", null).provider).toBe("mock");
  });

  it("uses cloud only with AI_PROVIDER=anthropic and a key", () => {
    expect(selectProvider(readAiConfig({ AI_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "k", DEMO_MODE: "false" }), null, null).provider).toBe("anthropic");
    expect(selectProvider(readAiConfig({ AI_PROVIDER: "anthropic", DEMO_MODE: "false" }), null, null).provider).toBe("mock");
  });

  it("lets the settings panel switch to on-device or demo, with the preset's model", () => {
    const cfg = readAiConfig({ AI_PROVIDER: "mock", DEMO_MODE: "false" });
    expect(selectProvider(cfg, "ollama", "balanced")).toEqual({ provider: "ollama", ollamaModel: "qwen3:4b" });
    expect(selectProvider(readAiConfig({ AI_PROVIDER: "ollama", DEMO_MODE: "false" }), "mock", null).provider).toBe("mock");
  });

  it("defaults the cloud model and the on-device model", () => {
    const cfg = readAiConfig({});
    expect(cfg.anthropicModel).toBe("claude-sonnet-5-5");
    expect(cfg.ollamaModel).toBe("qwen3:1.7b");
    expect(cfg.ollamaTranslateModel).toBe("qwen3:1.7b");
  });
});
