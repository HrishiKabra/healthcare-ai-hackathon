import { describe, expect, it } from "vitest";
import { isQuestionVisible, nextQuestion, questionStatus, visibleQuestions, type FlowInput } from "./flow";
import { requireQuestion } from "./questions";
import { EmtInputs, type Answer } from "./schemas";
import { choice, makeAnswer, no, observed, yes } from "./testing";

function flow(answers: Answer[] = [], extra: Partial<FlowInput> = {}): FlowInput {
  return { answers, asked: answers.map((a) => a.questionId), skipped: [], emt: EmtInputs.parse({}), startedAt: 0, ...extra };
}
const ids = (s: FlowInput) => visibleQuestions(s).map((q) => q.id);

describe("nextQuestion", () => {
  it("starts with the opening questions in order", () => {
    expect(nextQuestion(flow())?.id).toBe("understand");
    expect(nextQuestion(flow([makeAnswer("understand", yes)]))?.id).toBe("chief_complaint");
  });

  it("skips the current question so Next always moves forward", () => {
    expect(nextQuestion(flow(), "understand")?.id).toBe("chief_complaint");
  });

  it("counts a pending answer as answered and a rejected one as needing a re-ask", () => {
    const pending = makeAnswer("understand", yes, { status: "pending" });
    expect(questionStatus("understand", flow([pending]))).toBe("answered");
    const rejected = makeAnswer("understand", yes, { status: "rejected" });
    expect(questionStatus("understand", flow([rejected]))).toBe("asked");
    expect(nextQuestion(flow([rejected]))?.id).toBe("understand");
  });

  it("skips skipped questions", () => {
    expect(nextQuestion(flow([], { skipped: ["understand"] }))?.id).toBe("chief_complaint");
    expect(questionStatus("understand", flow([], { skipped: ["understand"] }))).toBe("skipped");
  });

  it("returns null when everything is done", () => {
    const all = visibleQuestions(flow()).map((q) => q.id);
    expect(nextQuestion(flow([], { skipped: all }))).toBeNull();
  });
});

describe("follow-up questions (showIf)", () => {
  it("asks about a head strike only after a fall", () => {
    expect(ids(flow([makeAnswer("chief_complaint", choice("chest_pain"))]))).not.toContain("head_strike");
    expect(ids(flow([makeAnswer("chief_complaint", choice("fall_injury"))]))).toContain("head_strike");
  });

  it("asks about pregnancy only for belly pain in a patient who could be pregnant", () => {
    const belly = makeAnswer("chief_complaint", choice("belly_pain"));
    expect(ids(flow([belly], { emt: EmtInputs.parse({ sex: "female", age: "28" }) }))).toContain("pregnancy");
    expect(ids(flow([belly], { emt: EmtInputs.parse({ sex: "unknown" }) }))).toContain("pregnancy");
    expect(ids(flow([belly], { emt: EmtInputs.parse({ sex: "male", age: "28" }) }))).not.toContain("pregnancy");
    expect(ids(flow([belly], { emt: EmtInputs.parse({ sex: "female", age: "70" }) }))).not.toContain("pregnancy");
    const chest = makeAnswer("chief_complaint", choice("chest_pain"));
    expect(ids(flow([chest], { emt: EmtInputs.parse({ sex: "female", age: "28" }) }))).not.toContain("pregnancy");
  });

  it("asks which medicine only after the patient says they have an allergy", () => {
    expect(ids(flow([makeAnswer("allergy_any", no)]))).not.toContain("allergy_detail");
    expect(ids(flow([makeAnswer("allergy_any", yes)]))).toContain("allergy_detail");
  });

  it("keeps an answered follow-up visible even after its condition stops holding", () => {
    const s = flow([makeAnswer("allergy_any", yes), makeAnswer("allergy_detail", choice("aspirin"))]);
    expect(isQuestionVisible(requireQuestion("allergy_detail"), s)).toBe(true);
  });

  it("runs the stroke check for weakness or numbness", () => {
    const stroke = ["stroke_smile", "stroke_arms", "stroke_speech", "last_known_well"];
    const chest = ids(flow([makeAnswer("chief_complaint", choice("chest_pain"))]));
    stroke.forEach((id) => expect(chest).not.toContain(id));
    const weak = ids(flow([makeAnswer("chief_complaint", choice("weakness_numbness"))]));
    stroke.forEach((id) => expect(weak).toContain(id));
  });

  it("runs the stroke check when the EMT records a speech problem", () => {
    const s = flow([makeAnswer("stroke_speech", observed(true), { by: "emt" }), makeAnswer("chief_complaint", choice("dizziness"))]);
    expect(ids(s)).toContain("last_known_well");
  });

  it("only asks pain questions for painful complaints", () => {
    const pain = ["quality", "radiation", "severity"];
    const weak = ids(flow([makeAnswer("chief_complaint", choice("weakness_numbness"))]));
    pain.forEach((id) => expect(weak).not.toContain(id));
    const chest = ids(flow([makeAnswer("chief_complaint", choice("chest_pain"))]));
    pain.forEach((id) => expect(chest).toContain(id));
    // Before the complaint is known, err on the side of asking.
    pain.forEach((id) => expect(ids(flow())).toContain(id));
  });

  it("walks a whole chest pain assessment in protocol order", () => {
    const answers: Answer[] = [];
    const order: string[] = [];
    const script: Record<string, Answer["value"]> = {
      understand: yes,
      chief_complaint: choice("chest_pain"),
      onset: { kind: "duration", bucket: "minutes", amount: 40, unit: "minutes" },
      activity: choice("resting"),
      provocation: choice("nothing"),
      quality: choice("pressure"),
      region: { kind: "bodymap", regions: ["chest"] },
      radiation: { kind: "bodymap", regions: ["left_arm"] },
      severity: { kind: "scale", value: 7 },
      allergy_any: yes,
      allergy_detail: choice("aspirin"),
      medications: choice("none"),
      conditions: choice("diabetes"),
      last_oral_intake: { kind: "duration", bucket: "few_hours" },
      alcohol_drugs: no,
      anything_else: { kind: "free", text: "no" },
    };
    for (let i = 0; i < 30; i++) {
      const q = nextQuestion(flow(answers));
      if (!q) break;
      order.push(q.id);
      answers.push(makeAnswer(q.id, script[q.id]));
    }
    expect(order).toEqual(Object.keys(script));
  });
});
