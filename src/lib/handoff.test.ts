import { describe, expect, it } from "vitest";
import { directCalls } from "./ai/direct";
import { buildHandoff, handoffText } from "./handoff";
import { mockProvider } from "./mock";
import { runScenario } from "./scenarioRunner";
import { SCENARIOS, scenarioSetupEvents } from "./scenarios";
import { newSession, sessionReducer, type SessionState } from "./session";
import { choice, makeAnswer, no } from "./testing";

const T0 = Date.UTC(2026, 9, 24, 14, 0, 0);
const NOW = T0 + 12 * 60_000;

async function scenarioSession(i: number): Promise<SessionState> {
  const sc = SCENARIOS[i];
  const run = await runScenario(sc, directCalls(mockProvider), T0, NOW);
  const base = scenarioSetupEvents(sc, T0).reduce(sessionReducer, newSession(`s-${sc.id}`, T0));
  return { ...base, answers: run.answers };
}

describe("handoff for each demo scenario", () => {
  it("Spanish chest pain: MIST, aspirin allergy flag, Spanish interpreter", async () => {
    const h = buildHandoff(await scenarioSession(0), NOW);
    expect(h.mist.m).toEqual([
      { label: "Chief complaint", value: "Chest pain" },
      { label: "Activity at onset", value: "Resting or sitting" },
      { label: "Onset", value: "40 minutes ago (about 13:20)" },
    ]);
    expect(h.mist.s).toContainEqual({ label: "Pain", value: "7 out of 10" });
    expect(h.mist.s).toContainEqual({ label: "Radiates to", value: "Left arm" });
    expect(h.mist.t).toEqual([{ label: "Given", value: "Oxygen" }]);
    expect(h.allergies).toEqual(["Aspirin"]);
    expect(h.medications).toEqual([{ name: "metformin (metformina)", drugClass: "Diabetes medicine" }]);
    expect(h.redFlags.map((f) => f.title)).toEqual(["Chest pain with aspirin or NSAID allergy"]);
    expect(h.communication).toMatchObject({ headline: "Spanish interpreter needed on arrival", interpreterNeeded: true, language: "Spanish (Español)" });
    expect(h.unconfirmed).toEqual([]);
  });

  it("ASL fall: mechanism, head strike, anticoagulant, ASL interpreter", async () => {
    const h = buildHandoff(await scenarioSession(1), NOW);
    expect(h.mist.m).toContainEqual({ label: "Mechanism", value: "Fall while: on the stairs" });
    expect(h.mist.i).toContainEqual({ label: "Head strike", value: "Yes" });
    expect(h.mist.i).toContainEqual({ label: "Location", value: "Head, Back" });
    expect(h.medications).toEqual([{ name: "apixaban (Eliquis)", drugClass: "Anticoagulant (blood thinner)" }]);
    expect(h.redFlags.map((f) => f.title)).toEqual(["Blood thinner with fall or head strike"]);
    expect(h.communication.headline).toBe("ASL interpreter needed on arrival");
    expect(h.mist.t).toEqual([{ label: "Given", value: "C-collar" }]);
  });

  it("Picture board stroke: EMT findings, last known well, stroke alert", async () => {
    const h = buildHandoff(await scenarioSession(2), NOW);
    expect(h.mist.i).toEqual(
      expect.arrayContaining([
        { label: "Facial droop (EMT)", value: "Yes" },
        { label: "Arm drift (EMT)", value: "Yes" },
        { label: "Speech abnormal (EMT)", value: "Yes" },
      ]),
    );
    expect(h.mist.s).toContainEqual({ label: "Last known well", value: "1.5 hours ago (about 12:30)" });
    expect(h.redFlags[0]).toMatchObject({ title: "Stroke alert" });
    expect(h.communication.preferredMode).toContain("Picture board");
    expect(h.communication.notes).toContain("Speech abnormal: slurred, wrong words, or unable to speak.");
  });

  for (let i = 0; i < 3; i++) {
    it(`plain text matches snapshot: ${SCENARIOS[i].id}`, async () => {
      expect(handoffText(buildHandoff(await scenarioSession(i), NOW))).toMatchSnapshot();
    });
  }
});

describe("handoff only contains what the patient confirmed", () => {
  it("lists unconfirmed and low-confidence items separately", () => {
    let s = newSession("x", T0);
    s = sessionReducer(s, { type: "setMode", mode: "spoken", language: "vi" });
    s = { ...s, answers: [
      makeAnswer("chief_complaint", choice("belly_pain"), { status: "pending" }),
      makeAnswer("anything_else", { kind: "free", text: "x" }, { patch: [{ field: "notes", value: "Maybe pregnant", confidence: "low" }] }),
    ] };
    const h = buildHandoff(s, NOW);
    expect(h.mist.m).toEqual([]);
    expect(h.history).toEqual([]);
    expect(h.unconfirmed).toEqual([
      { label: "Chief complaint", value: "Belly pain", reason: "Not confirmed by patient" },
      { label: "Notes", value: "Maybe pregnant", reason: "Low confidence" },
    ]);
  });

  it("moves conflicting allergy answers out of the allergy list", () => {
    let s = newSession("x", T0);
    s = { ...s, answers: [
      makeAnswer("allergy_any", no),
      makeAnswer("anything_else", { kind: "free", text: "x" }, { patch: [{ field: "allergies", value: { raw: "penicilina", substance: "penicillin", category: "penicillin" }, confidence: "high" }] }),
    ] };
    const h = buildHandoff(s, NOW);
    expect(h.allergies).toEqual([]);
    expect(h.unconfirmed.map((u) => [u.value, u.reason])).toEqual([
      ["No allergies", "Conflicting answers"],
      ["Penicillin", "Conflicting answers"],
    ]);
    expect(h.redFlags.map((f) => f.title)).toContain("Conflicting answers on allergies or medicines");
  });

  it("records no treatment explicitly", () => {
    expect(buildHandoff(newSession("x", T0), NOW).mist.t).toEqual([{ label: "Given", value: "None recorded" }]);
  });
});

describe("handoff recipient", () => {
  it("a NOEMS handoff is addressed to the arriving crew and leads with the red flags", async () => {
    const s = await scenarioSession(1);
    const text = handoffText(buildHandoff({ ...s, emt: { ...s.emt, handoffTo: "noems" } }, NOW)).split("\n");
    expect(text[0]).toBe("FirstWords handoff to arriving NOEMS crew");
    expect(text[2]).toMatch(/^Red flags: Blood thinner with fall or head strike/);
    expect(text.filter((l) => l.startsWith("Red flags:"))).toHaveLength(1);
  });

  it("defaults to the emergency department", async () => {
    expect(buildHandoff(await scenarioSession(0), NOW).to).toBe("ed");
  });
});

