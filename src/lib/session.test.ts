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
    const s = run([{ type: "ask", questionId: "understand" }]);
    expect(s.current).toEqual({ kind: "bank", questionId: "understand" });
    expect(s.asked).toEqual(["understand"]);
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
    const s = run([{ type: "ask", questionId: "onset" }, { type: "skip", questionId: "onset" }]);
    expect(s.current).toBeNull();
    expect(s.skipped).toEqual(["onset"]);
  });

  it("acknowledging a flag is idempotent", () => {
    const s = run([{ type: "ackFlag", ruleId: "stroke_alert" }, { type: "ackFlag", ruleId: "stroke_alert" }]);
    expect(s.acknowledgedFlags).toEqual(["stroke_alert"]);
  });
});
