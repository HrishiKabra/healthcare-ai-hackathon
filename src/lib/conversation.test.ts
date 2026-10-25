import { describe, expect, it } from "vitest";
import { interpretFree, type AiCalls } from "./ai/pipeline";
import { ExtractOutput } from "./ai/schemas";
import { conversationLines } from "./conversation";
import { requireQuestion } from "./questions";
import { newSession, sessionReducer } from "./session";
import { makeAnswer, yes } from "./testing";

describe("conversationLines", () => {
  it("orders questions, words, and taps by time and links words to their answer", () => {
    let s = newSession("c1", 0);
    s = sessionReducer(s, { type: "setMode", mode: "spoken", language: "es" });
    s = sessionReducer(s, { type: "ask", questionId: "head_strike", at: 10 });
    s = sessionReducer(s, { type: "answerProposed", answer: makeAnswer("head_strike", yes, { id: "tap", at: 20, lang: "es" }) });
    s = sessionReducer(s, { type: "utterance", utterance: { id: "w1", at: 30, from: "patient", original: "tomo Xarelto", language: "es", translation: "I take Xarelto", status: "done" } });
    s = sessionReducer(s, { type: "answerProposed", answer: makeAnswer("medications", { kind: "free", text: "tomo Xarelto" }, { id: "w1", at: 40, status: "pending" }) });

    const lines = conversationLines(s);
    expect(lines.map((l) => (l.kind === "said" ? `${l.u.from}:${l.u.id}` : `tap:${l.answer.id}`))).toEqual(["emt:ask-head_strike-10", "tap:tap", "patient:w1"]);
    const words = lines[2];
    expect(words.kind === "said" && words.answer?.status).toBe("pending");
  });

  it("leaves EMT observations out", () => {
    const s = sessionReducer(newSession("c2", 0), { type: "answerProposed", answer: makeAnswer("stroke_smile", { kind: "observation", value: true }, { by: "emt" }) });
    expect(conversationLines(s)).toEqual([]);
  });
});

describe("interpretFree live translation", () => {
  const extracted = ExtractOutput.parse({ medications: [{ raw: "Xarelto", generic: "rivaroxaban", drugClass: "anticoagulant" }], confidence: "high" });
  const calls = (fallback: boolean): { calls: AiCalls; order: string[] } => {
    const order: string[] = [];
    return {
      order,
      calls: {
        translate: async (r) => {
          order.push("translate");
          return { translation: fallback ? r.text : "I take Xarelto", backTranslation: r.text, confidence: fallback ? "low" : "high", notes: "", meta: { provider: "ollama", model: "m", ...(fallback ? { fallbackReason: "timeout" } : {}) } };
        },
        extract: async () => {
          order.push("extract");
          return { output: extracted, patch: [], needsReview: false, meta: { provider: "ollama", model: "m" } };
        },
      },
    };
  };

  it("hands over the English before extraction starts", async () => {
    const { calls: c, order } = calls(false);
    await interpretFree(c, requireQuestion("medications"), "tomo Xarelto", "es", (english, conf) => order.push(`heard:${english}:${conf}`));
    expect(order).toEqual(["translate", "heard:I take Xarelto:high", "extract"]);
  });

  it("reports no translation when the model failed", async () => {
    const { calls: c } = calls(true);
    const heard: (string | null)[] = [];
    await interpretFree(c, requireQuestion("medications"), "tomo Xarelto", "es", (english) => heard.push(english));
    expect(heard).toEqual([null]);
  });
});
