import { describe, expect, it } from "vitest";
import { DRILL_SCENARIOS, drillGold, drillsCsv, firstWordsMetrics, suggestNext, summarizeDrills, susScore, usualMetrics, type DrillRun, type UsualRecord } from "./drill";
import { newSession, sessionReducer, type SessionEvent } from "./session";
import type { Answer } from "./schemas";
import { choice, makeAnswer } from "./testing";

const T0 = 1_000_000;
const at = (s: number) => T0 + s * 1000;

function confirmedAnswer(a: Answer, confirmSecond: number): SessionEvent[] {
  return [
    { type: "answerProposed", answer: { ...a, status: "pending" } },
    { type: "answerConfirmed", answerId: a.id, at: at(confirmSecond) },
  ];
}

describe("drill scenarios", () => {
  it("every drill scenario has a gold chart, and the picture board is left out", () => {
    expect(DRILL_SCENARIOS.length).toBeGreaterThanOrEqual(2);
    for (const s of DRILL_SCENARIOS) {
      expect(drillGold(s.id)).toBeDefined();
      expect(s.mode).not.toBe("picture");
    }
  });
});

describe("firstWordsMetrics", () => {
  // The Spanish chest pain scenario: gold is chest pain, pain 7, an antidiabetic, an aspirin allergy, and rule 3.
  const events: SessionEvent[] = [
    { type: "setMode", mode: "spoken", language: "es" },
    { type: "ask", questionId: "chief_complaint", at: at(2) },
    ...confirmedAnswer(makeAnswer("chief_complaint", choice("chest_pain"), { id: "cc", at: at(8) }), 10),
    ...confirmedAnswer(makeAnswer("severity", { kind: "scale", value: 7 }, { id: "sev", at: at(20) }), 22),
    ...confirmedAnswer(makeAnswer("allergy_any", { kind: "yesno", value: "yes" }, { id: "any", at: at(25) }), 26),
    { type: "answerProposed", answer: makeAnswer("allergy_detail", { kind: "free", text: "ibuprofeno" }, { id: "wrong", status: "pending", at: at(30) }) },
    { type: "answerRejected", answerId: "wrong" },
    ...confirmedAnswer(
      makeAnswer("allergy_detail", { kind: "free", text: "aspirina" }, { id: "al", at: at(40), patch: [{ field: "allergies", value: { raw: "aspirina", substance: "aspirin", category: "aspirin" }, confidence: "high" }] }),
      45,
    ),
    ...confirmedAnswer(
      makeAnswer("medications", { kind: "free", text: "metformina" }, { id: "med", at: at(60), patch: [{ field: "medications", value: { raw: "metformina", generic: "metformin", drugClass: "antidiabetic", classSource: "table" }, confidence: "high" }] }),
      65,
    ),
  ];
  const state = events.reduce(sessionReducer, newSession("d1", T0));

  it("times each key fact from the moment the patient confirmed it", () => {
    const m = firstWordsMetrics(state, "es-chest-pain", at(90));
    expect(m.factSeconds).toEqual({ complaint: 10, onset: null, allergies: 45, medications: 65 });
    expect(m.totalSeconds).toBe(90);
  });

  it("finds when the expected red flag first appeared", () => {
    const m = firstWordsMetrics(state, "es-chest-pain", at(90));
    expect(m.flagRecognized).toBe(true);
    expect(m.flagSeconds).toBe(45);
  });

  it("scores the confirmed chart against gold and counts misunderstandings caught", () => {
    const m = firstWordsMetrics(state, "es-chest-pain", at(90));
    expect(m.accuracy).toEqual({ correct: 4, total: 4, misses: [] });
    expect(m.rejected).toBe(1);
  });
});

describe("usualMetrics", () => {
  const record: UsualRecord = {
    chiefComplaint: "chest_pain",
    onset: null,
    severity: 5,
    headStrike: null,
    medications: "",
    noMedications: false,
    allergies: "aspirin",
    noAllergies: false,
    redFlag: null,
  };

  it("scores what the EMT wrote down the same way", () => {
    const m = usualMetrics({ scenarioId: "es-chest-pain", startedAt: T0, finishedAt: at(300), times: { complaint: at(40), allergies: at(200) }, record, neededInterpreter: true });
    expect(m.accuracy.correct).toBe(2); // complaint and aspirin allergy; wrong pain score, missing medication
    expect(m.accuracy.misses).toEqual(["Pain score", "Medication (antidiabetic)"]);
    expect(m.factSeconds).toEqual({ complaint: 40, onset: null, allergies: 200, medications: null });
    expect(m.flagRecognized).toBe(false);
    expect(m.neededInterpreter).toBe(true);
  });

  it("credits the red flag only when the EMT named the right one", () => {
    const m = usualMetrics({ scenarioId: "es-chest-pain", startedAt: T0, finishedAt: at(300), times: { flag: at(250) }, record: { ...record, redFlag: "chest_pain_aspirin_allergy" }, neededInterpreter: false });
    expect([m.flagRecognized, m.flagSeconds]).toEqual([true, 250]);
  });

  it("reads typed medicine names through the medication table", () => {
    const m = usualMetrics({ scenarioId: "asl-fall", startedAt: T0, finishedAt: at(100), times: {}, record: { ...record, chiefComplaint: "fall_injury", severity: 5, headStrike: "yes", medications: "Eliquis", allergies: "", noAllergies: true }, neededInterpreter: false });
    expect(m.accuracy).toEqual({ correct: 5, total: 5, misses: [] });
  });
});

describe("survey and summary", () => {
  it("scores SUS the standard way", () => {
    expect(susScore(Array(10).fill(3))).toBe(50);
    expect(susScore([5, 1, 5, 1, 5, 1, 5, 1, 5, 1])).toBe(100);
    expect(susScore([1, 5, 1, 5, 1, 5, 1, 5, 1, 5])).toBe(0);
  });

  const base = { factSeconds: { complaint: 10, onset: null, allergies: 40, medications: 60 }, flagSeconds: 40, flagRecognized: true, accuracy: { correct: 4, total: 4, misses: [] }, rejected: 1, questions: 10, freeform: 0, medianTranslationSeconds: 5, neededInterpreter: false };
  const runs: DrillRun[] = [
    { id: "1", tester: "A", arm: "firstwords", scenarioId: "es-chest-pain", createdAt: T0, metrics: { ...base, totalSeconds: 100 }, survey: { sus: Array(10).fill(3), confidence: 4 } },
    { id: "2", tester: "B", arm: "firstwords", scenarioId: "asl-fall", createdAt: T0, metrics: { ...base, totalSeconds: 200, factSeconds: { ...base.factSeconds, complaint: 30 } } },
    { id: "3", tester: "A", arm: "usual", scenarioId: "asl-fall", createdAt: T0, metrics: { ...base, totalSeconds: 400, flagRecognized: false, flagSeconds: null, accuracy: { correct: 1, total: 4, misses: [] } } },
  ];

  it("summarizes each arm", () => {
    const [fw, usual] = summarizeDrills(runs);
    expect(fw).toMatchObject({ arm: "firstwords", n: 2, medianTotal: 150, accuracy: 1, flagRecognized: 1, meanSus: 50, susN: 1, meanConfidence: 4, misunderstandingsCaught: 2 });
    expect(fw.medianFact.complaint).toBe(20);
    expect(fw.obtained.onset).toBe(0);
    expect(usual).toMatchObject({ arm: "usual", n: 1, accuracy: 0.25, flagRecognized: 0, meanSus: null });
  });

  it("exports one CSV row per run", () => {
    const csv = drillsCsv(runs).split("\n");
    expect(csv).toHaveLength(4);
    expect(csv[0].startsWith("run,tester,arm,scenario")).toBe(true);
  });

  it("alternates arms per tester and avoids repeating a scenario", () => {
    expect(suggestNext(runs, "a")).toEqual({ arm: "firstwords", avoidScenarios: ["es-chest-pain", "asl-fall"] });
    expect(suggestNext([], "C").arm).toBe("firstwords");
  });
});
