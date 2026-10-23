import chestJson from "@/data/scenarios/es-chest-pain.json";
import fallJson from "@/data/scenarios/asl-fall.json";
import strokeJson from "@/data/scenarios/picture-stroke.json";
import { z } from "zod";
import { AnswerValue, EmtInputs, LangCode, PatientMode } from "./schemas";

export const ScenarioStep = z.object({
  questionId: z.string(),
  /** A tapped answer. */
  answer: AnswerValue.optional(),
  /** A free answer in the patient's own words (spoken or typed), in the scenario language. */
  say: z.string().optional(),
  /** An EMT observation for stroke checks. */
  observe: z.boolean().optional(),
  skip: z.boolean().optional(),
});
export type ScenarioStep = z.infer<typeof ScenarioStep>;

export const Scenario = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  mode: PatientMode,
  language: LangCode,
  emt: EmtInputs,
  /** EMT observations recorded before the first question (for example "cannot speak"). */
  initialObservations: z.array(z.object({ questionId: z.string(), value: z.boolean() })).default([]),
  expectedFlags: z.array(z.string()),
  communicationNeed: z.string(),
  steps: z.array(ScenarioStep),
});
export type Scenario = z.infer<typeof Scenario>;

export const SCENARIOS: readonly Scenario[] = [chestJson, fallJson, strokeJson].map((s) => Scenario.parse(s));

export function getScenario(id: string | null | undefined): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

// ---------------------------------------------------------------------------
// Scenario helpers (pure)
// ---------------------------------------------------------------------------

import { emtObservation } from "./emt";
import { questionStatus, type FlowInput } from "./flow";
import type { SessionEvent } from "./session";

/** Events that load a scenario into a fresh session: mode, language, EMT fields, initial observations. */
export function scenarioSetupEvents(sc: Scenario, at: number): SessionEvent[] {
  return [
    { type: "setScenario", scenarioId: sc.id },
    { type: "setMode", mode: sc.mode, language: sc.language },
    { type: "setEmt", emt: sc.emt },
    ...sc.initialObservations.map((o, i): SessionEvent => ({ type: "answerProposed", answer: emtObservation(o.questionId, o.value, at + i) })),
  ];
}

export type StepProgress = { index: number; step: ScenarioStep; status: ReturnType<typeof questionStatus> } | null;

/** The first scripted step whose question is not yet confirmed or skipped. */
export function nextScenarioStep(sc: Scenario, s: FlowInput): StepProgress {
  for (let i = 0; i < sc.steps.length; i++) {
    const st = questionStatus(sc.steps[i].questionId, s);
    if (st !== "confirmed" && st !== "skipped") return { index: i, step: sc.steps[i], status: st };
  }
  return null;
}
