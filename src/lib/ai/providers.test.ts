import { afterEach, describe, expect, it, vi } from "vitest";
import { requireQuestion } from "../questions";
import { mockTranslate } from "../mock";
import { jsonSchemaFor } from "./jsonSchema";
import { ollamaProvider } from "./ollama";
import { runExtract, runTranslate } from "./server";
import { ExtractOutput } from "./schemas";

afterEach(() => vi.unstubAllGlobals());

const req = { questionId: "medications", questionEnglish: "What medicines do you take?", answerRaw: "tomo Eliquis", answerLanguage: "es" as const, answerEnglish: "I take Eliquis" };

describe("jsonSchemaFor", () => {
  it("makes every key required and closes objects for strict tool use", () => {
    const s = jsonSchemaFor(ExtractOutput, { strict: true }) as { required: string[]; additionalProperties: boolean; properties: Record<string, unknown> };
    expect(s.additionalProperties).toBe(false);
    expect(s.required.sort()).toEqual(Object.keys(s.properties).sort());
    expect(JSON.stringify(s)).not.toContain("minimum");
  });
});

describe("ollama provider", () => {
  it("sends the JSON schema as format and validates the answer", async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      expect(body).toMatchObject({ model: "qwen3:1.7b", stream: false, think: false });
      expect(body.format.type).toBe("object");
      const content = JSON.stringify({ ...ExtractOutput.parse({}), medications: [{ raw: "Eliquis", generic: "apixaban", drugClass: "anticoagulant" }], confidence: "high" });
      return new Response(JSON.stringify({ message: { content } }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const r = await runExtract(ollamaProvider("http://localhost:11434", "qwen3:1.7b"), req);
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:11434/api/chat", expect.anything());
    expect(r.meta.provider).toBe("ollama");
    expect(r.patch[0]).toMatchObject({ value: { generic: "apixaban" } });
  });

  it("falls back to the keyword baseline when Ollama is not running, and says so", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("fetch failed");
    });
    const r = await runExtract(ollamaProvider("http://localhost:11434", "qwen3:1.7b"), req);
    expect(r.meta.provider).toBe("baseline");
    expect(r.meta.fallbackReason).toBe("Ollama is not running");
    expect(r.needsReview).toBe(true);
    expect(r.patch[0]).toMatchObject({ value: { generic: "apixaban", drugClass: "anticoagulant" } });
  });

  it("treats invalid JSON from the model as a failed call", async () => {
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ message: { content: "not json" } }), { status: 200 }));
    const r = await runTranslate(ollamaProvider("http://x", "m"), { text: "hola", from: "es", to: "en", context: "answer" });
    expect(r.meta.fallbackReason).toBe("On-device output was not JSON");
    expect(r.confidence).toBe("low");
  });
});

describe("mock translate", () => {
  it("knows the canned free-form questions", () => {
    expect(mockTranslate({ text: "Is anyone with you?", from: "en", to: "ar", context: "question" }).translation).toBe("هل معك أحد؟");
  });
  it("says so when it cannot translate", () => {
    const r = mockTranslate({ text: "Where is your wallet?", from: "en", to: "es", context: "question" });
    expect(r.confidence).toBe("low");
    expect(r.translation).toBe("Where is your wallet?");
  });
  it("question bank text never needs translating at runtime", () => {
    expect(requireQuestion("onset").translations.es).toBeTruthy();
  });
});
