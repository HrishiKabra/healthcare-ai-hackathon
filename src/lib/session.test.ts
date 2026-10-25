import { describe, expect, it } from "vitest";
import { newSession, sessionChart, sessionReducer, type SessionEvent, type SessionState } from "./session";
import { choice, makeAnswer } from "./testing";

const run = (events: SessionEvent[], s: SessionState = newSession("s1", 1000)) => events.reduce(sessionReducer, s);

describe("sessionReducer", () => {
  it("sets the mode and language", () => {
    const s = run([{ type: "setMode", mode: "spoken", language: "ar" }]);
    expect([s.mode, s.language]).toEqual(["spoken", "ar"]);
  });

  it("asking marks a question as asked and current", () => {
    const s = run([{ type: "ask", questionId: "understand", at: 5 }]);
    expect(s.current).toEqual({ kind: "bank", questionId: "understand", at: 5 });
    expect(s.asked).toEqual(["understand"]);
  });

  it("asking a bank question adds it to the conversation with what the patient saw", () => {
    const s = run([
      { type: "setMode", mode: "spoken", language: "es" },
      { type: "ask", questionId: "medications", at: 5 },
    ]);
    expect(s.utterances).toHaveLength(1);
    expect(s.utterances[0]).toMatchObject({ from: "emt", original: "What medicines do you take?", status: "done", questionId: "medications" });
    expect(s.utterances[0].translation).toBeTruthy();
  });

  it("a free-form question shows as translating, then completes in place", () => {
    const draft = { id: "ff-1", at: 10, from: "emt" as const, original: "Do you feel dizzy?", language: "en" as const, translation: null, status: "translating" as const };
    let s = run([{ type: "setMode", mode: "spoken", language: "es" }, { type: "utterance", utterance: draft }]);
    expect(s.utterances[0].status).toBe("translating");
    s = sessionReducer(s, { type: "askFreeform", question: { id: "ff-1", english: "Do you feel dizzy?", native: "¿Siente mareo?", language: "es", confidence: "high" }, at: 30 });
    expect(s.utterances).toHaveLength(1);
    expect(s.utterances[0]).toMatchObject({ at: 10, status: "done", translation: "¿Siente mareo?" });
  });

  it("a patient line is replaced when its translation arrives", () => {
    const line = { id: "a1", at: 10, from: "patient" as const, original: "me duele el pecho", language: "es" as const, translation: null, status: "translating" as const };
    const s = run([
      { type: "utterance", utterance: line },
      { type: "utterance", utterance: { ...line, translation: "My chest hurts", status: "done" } },
    ]);
    expect(s.utterances).toEqual([{ ...line, translation: "My chest hurts", status: "done" }]);
  });

  it("a proposed answer shows in the chart unconfirmed, then confirmed", () => {
    const a = makeAnswer("chief_complaint", choice("fall_injury"), { status: "pending", id: "x1" });
    let s = run([{ type: "answerProposed", answer: a }]);
    expect(sessionChart(s).chiefComplaint?.confirmed).toBe(false);
    s = sessionReducer(s, { type: "answerConfirmed", answerId: "x1" });
    expect(sessionChart(s).chiefComplaint?.confirmed).toBe(true);
  });

  it("a rejected answer drops out of the chart", () => {
    const a = makeAnswer("chief_complaint", choice("fall_injury"), { status: "pending", id: "x2" });
    const s = run([{ type: "answerProposed", answer: a }, { type: "answerRejected", answerId: "x2" }]);
    expect(sessionChart(s).chiefComplaint).toBeUndefined();
  });

  it("ignores duplicate deliveries of the same answer", () => {
    const a = makeAnswer("understand", { kind: "yesno", value: "yes" }, { id: "dup" });
    const s = run([{ type: "answerProposed", answer: a }, { type: "answerProposed", answer: a }]);
    expect(s.answers).toHaveLength(1);
  });

  it("merges EMT inputs including partial vitals", () => {
    const s = run([
      { type: "setEmt", emt: { age: "58", vitals: { heartRate: "98", bloodPressure: "", spo2: "", respRate: "", glucose: "" } } },
      { type: "setEmt", emt: { vitals: { heartRate: "98", bloodPressure: "150/90", spo2: "", respRate: "", glucose: "" } } },
    ]);
    expect(s.emt.age).toBe("58");
    expect(s.emt.vitals.bloodPressure).toBe("150/90");
  });

  it("skipping the current question clears it", () => {
    const s = run([{ type: "ask", questionId: "onset", at: 1 }, { type: "skip", questionId: "onset" }]);
    expect(s.current).toBeNull();
    expect(s.skipped).toEqual(["onset"]);
  });

  it("acknowledging a flag is idempotent", () => {
    const s = run([{ type: "ackFlag", ruleId: "stroke_alert" }, { type: "ackFlag", ruleId: "stroke_alert" }]);
    expect(s.acknowledgedFlags).toEqual(["stroke_alert"]);
  });
});
