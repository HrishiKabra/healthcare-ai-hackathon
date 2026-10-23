import { describe, expect, it } from "vitest";
import { POST as extract } from "../extract/route";
import { POST as translate } from "../translate/route";
import { POST as explain } from "../explain-flag/route";
import { POST as handoff } from "../handoff/route";

const post = (body: unknown) => new Request("http://localhost/api", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

describe("API routes in demo mode", () => {
  it("extract returns a validated patch from the mock", async () => {
    const res = await extract(post({ questionId: "medications", questionEnglish: "What medicines do you take?", answerRaw: "Eliquis", answerLanguage: "en" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.meta.provider).toBe("mock");
    expect(body.patch[0].value.generic).toBe("apixaban");
  });

  it("translate returns translation and back-translation", async () => {
    const res = await translate(post({ text: "Me duele mucho el pecho, como una presión.", from: "es", to: "en", context: "answer" }));
    const body = await res.json();
    expect(body.translation).toBe("My chest hurts a lot, like pressure.");
    expect(body.backTranslation).toBeTruthy();
  });

  it("rejects malformed requests with 400", async () => {
    expect((await extract(post({ nope: true }))).status).toBe(400);
    expect((await translate(new Request("http://localhost/api", { method: "POST", body: "not json" }))).status).toBe(400);
  });

  it("explain-flag falls back to the rule text in demo mode", async () => {
    const flag = { ruleId: "stroke_alert", number: 2, title: "Stroke alert", severity: "critical", rule: "r", facts: [], explanation: "Built-in text.", basedOnUnconfirmed: false };
    expect((await (await explain(post({ flag }))).json()).explanation).toBe("Built-in text.");
  });

  it("handoff narrative is a template sentence in demo mode", async () => {
    const body = await (await handoff(post({ handoffText: "M: Chest pain\nI: none" }))).json();
    expect(body.narrative).toContain("Chest pain");
  });
});
