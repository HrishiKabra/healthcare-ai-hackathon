import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { directCalls } from "./ai/direct";
import { mockProvider } from "./mock";
import { runScenario } from "./scenarioRunner";
import { SCENARIOS, nextScenarioStep, scenarioSetupEvents } from "./scenarios";
import { newSession, sessionReducer } from "./session";
import { questionStatus } from "./flow";

const T0 = Date.UTC(2026, 9, 24, 14, 0, 0);

describe("demo scenarios in DEMO_MODE (no network)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", () => {
      throw new Error("Network call attempted in demo mode");
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("has the three demo scenarios and the three Tulane campus calls", () => {
    expect(SCENARIOS.map((s) => s.id)).toEqual(["es-chest-pain", "asl-fall", "picture-stroke", "vi-student-fall", "hi-parent-dizzy", "pt-student-allergy"]);
    expect(SCENARIOS.filter((s) => s.setting === "campus")).toHaveLength(3);
  });

  for (const sc of SCENARIOS) {
    it(`${sc.title}: runs end to end and fires exactly ${sc.expectedFlags.join(", ")}`, async () => {
      const run = await runScenario(sc, directCalls(mockProvider), T0, T0 + 10 * 60_000);
      expect(run.unreadable).toEqual([]);
      expect(run.flags.map((f) => f.ruleId)).toEqual(sc.expectedFlags);
      expect(run.flags.every((f) => !f.basedOnUnconfirmed)).toBe(true);
    });
  }

  it("Spanish chest pain: free answers are understood and confirmed back in Spanish", async () => {
    const run = await runScenario(SCENARIOS[0], directCalls(mockProvider), T0);
    const cc = run.answers.find((a) => a.questionId === "chief_complaint")!;
    expect(cc.confirmText.native).toBe("Problema principal: Dolor de pecho\nSe siente: Presión u opresión\nDónde: Pecho");
    const meds = run.answers.find((a) => a.questionId === "medications")!;
    expect(meds.confirmText.native).toBe("Medicamentos: metformin (metformina)");
    expect(run.chart.medications[0].value).toMatchObject({ generic: "metformin", drugClass: "antidiabetic", classSource: "table" });
    expect(run.chart.allergies.map((a) => a.value.category)).toEqual(["aspirin"]);
    expect(run.chart.severity?.value).toBe(7);
    expect(run.chart.radiation.map((r) => r.value)).toEqual(["left_arm"]);
  });

  it("ASL fall: Eliquis is normalized to apixaban, an anticoagulant", async () => {
    const run = await runScenario(SCENARIOS[1], directCalls(mockProvider), T0);
    expect(run.chart.medications[0].value).toMatchObject({ generic: "apixaban", drugClass: "anticoagulant" });
    expect(run.answers.find((a) => a.questionId === "medications")!.confirmText.english).toBe("Medicines: apixaban (Eliquis)");
    expect(run.chart.headStrike?.value).toBe(true);
  });

  it("Picture board stroke: last known well 1.5 hours, inside the window", async () => {
    const run = await runScenario(SCENARIOS[2], directCalls(mockProvider), T0, T0);
    const f = run.flags[0];
    expect(f.facts.find((x) => x.label === "Hours since last known well")?.value).toBe("1.5");
    expect(f.explanation).toContain("inside the 4.5 hour window");
  });

  it("scenario setup loads mode, language, vitals, and initial observations", () => {
    const sc = SCENARIOS[2];
    const s = scenarioSetupEvents(sc, T0).reduce(sessionReducer, newSession("x", T0));
    expect([s.mode, s.language, s.scenarioId, s.emt.vitals.bloodPressure]).toEqual(["picture", "en", "picture-stroke", "182/98"]);
    expect(questionStatus("stroke_speech", s)).toBe("confirmed");
    expect(nextScenarioStep(sc, s)?.step.questionId).toBe("understand");
  });
});
