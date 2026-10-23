import { describe, expect, it } from "vitest";
import { buildChart, emptyChart, hasConflict, mergeAnswer } from "./chart";
import { choice, makeAnswer, no, yes } from "./testing";

const T0 = Date.UTC(2026, 9, 24, 14, 0, 0);

describe("mergeAnswer", () => {
  it("adds a structured value with its source, confidence and confirmation", () => {
    const a = makeAnswer("chief_complaint", choice("chest_pain"), { status: "pending" });
    const c = mergeAnswer(emptyChart(), a);
    expect(c.chiefComplaint).toEqual({
      value: "chest_pain",
      sourceAnswerId: a.id,
      sourceQuestionId: "chief_complaint",
      confidence: "high",
      confirmed: false,
    });
  });

  it("ignores rejected answers", () => {
    const a = makeAnswer("chief_complaint", choice("chest_pain"), { status: "rejected" });
    expect(mergeAnswer(emptyChart(), a).chiefComplaint).toBeUndefined();
  });

  it("upgrades a value to confirmed when the same value is confirmed later", () => {
    const pending = makeAnswer("severity", { kind: "scale", value: 7 }, { status: "pending" });
    const confirmed = makeAnswer("severity", { kind: "scale", value: 7 }, { status: "confirmed" });
    const c = buildChart([pending, confirmed], T0);
    expect(c.severity?.confirmed).toBe(true);
    expect(c.severity?.sourceAnswerId).toBe(confirmed.id);
  });

  it("lets a confirmed value override an unconfirmed one", () => {
    const head1 = makeAnswer("head_strike", yes, { status: "pending" });
    const notes = makeAnswer("anything_else", { kind: "free", text: "x" }, { status: "confirmed", patch: [{ field: "headStrike", value: false, confidence: "medium" }] });
    const c = buildChart([head1, notes], T0);
    expect(c.headStrike?.value).toBe(false);
    expect(c.headStrike?.confirmed).toBe(true);
    expect(hasConflict(c, "headStrike")).toBe(false);
  });

  it("keeps a confirmed value when a different unconfirmed one arrives", () => {
    const head1 = makeAnswer("head_strike", yes, { status: "confirmed" });
    const other = makeAnswer("anything_else", { kind: "free", text: "x" }, { status: "pending", patch: [{ field: "headStrike", value: false, confidence: "low" }] });
    const c = buildChart([head1, other], T0);
    expect(c.headStrike?.value).toBe(true);
    expect(hasConflict(c, "headStrike")).toBe(false);
  });

  it("keeps both values and flags a conflict when two confirmed answers disagree", () => {
    const head1 = makeAnswer("head_strike", yes, { status: "confirmed" });
    const other = makeAnswer("anything_else", { kind: "free", text: "x" }, { status: "confirmed", patch: [{ field: "headStrike", value: false, confidence: "medium" }] });
    const c = buildChart([head1, other], T0);
    expect(c.headStrike?.value).toBe(true);
    const conflict = c.conflicts.find((x) => x.field === "headStrike");
    expect(conflict?.values.map((v) => v.value)).toEqual([true, false]);
  });

  it("treats a newer answer to the same question as an update, not a conflict", () => {
    const first = makeAnswer("severity", { kind: "scale", value: 5 });
    const second = makeAnswer("severity", { kind: "scale", value: 8 });
    const c = buildChart([first, second], T0);
    expect(c.severity?.value).toBe(8);
    expect(c.conflicts).toEqual([]);
  });

  it("flags 'no allergies' next to a real allergy as a conflict", () => {
    const none = makeAnswer("allergy_any", no);
    const real = makeAnswer("anything_else", { kind: "free", text: "penicillin" }, {
      patch: [{ field: "allergies", value: { raw: "penicillin", substance: "penicillin", category: "penicillin" }, confidence: "medium" }],
    });
    const c = buildChart([none, real], T0);
    expect(c.allergies.map((a) => a.value.category)).toEqual(["none", "penicillin"]);
    expect(hasConflict(c, "allergies")).toBe(true);
  });

  it("drops the generic 'yes, I have an allergy' once the specific allergy is known", () => {
    const any = makeAnswer("allergy_any", yes);
    const detail = makeAnswer("allergy_detail", choice("aspirin"));
    const c = buildChart([any, detail], T0);
    expect(c.allergies.map((a) => a.value.category)).toEqual(["aspirin"]);
    expect(c.conflicts).toEqual([]);
  });

  it("flags 'no medicines' next to a real medicine as a conflict", () => {
    const none = makeAnswer("medications", choice("none"));
    const eliquis = makeAnswer("anything_else", { kind: "free", text: "Eliquis" }, {
      patch: [{ field: "medications", value: { raw: "Eliquis", generic: "apixaban", drugClass: "anticoagulant", classSource: "table" }, confidence: "high" }],
    });
    const c = buildChart([none, eliquis], T0);
    expect(hasConflict(c, "medications")).toBe(true);
  });

  it("replaces an unconfirmed class-only quick pick with the specific drug of the same class", () => {
    const pick = makeAnswer("medications", choice("blood_thinner"), { status: "pending" });
    const eliquis = makeAnswer("medications", { kind: "free", text: "Eliquis" }, {
      patch: [{ field: "medications", value: { raw: "Eliquis", generic: "apixaban", drugClass: "anticoagulant", classSource: "table" }, confidence: "high" }],
    });
    const c = buildChart([pick, eliquis], T0);
    expect(c.medications.map((m) => m.value.generic)).toEqual(["apixaban"]);
  });

  it("dedupes list items and keeps the confirmed copy", () => {
    const a = makeAnswer("region", { kind: "bodymap", regions: ["chest"] }, { status: "pending" });
    const b = makeAnswer("region", { kind: "bodymap", regions: ["chest", "left_arm"] }, { status: "confirmed" });
    const c = buildChart([a, b], T0);
    expect(c.region.map((r) => [r.value, r.confirmed])).toEqual([
      ["chest", true],
      ["left_arm", true],
    ]);
  });

  it("flags 'does not spread' next to a real radiation site", () => {
    const none = makeAnswer("radiation", { kind: "bodymap", regions: [] });
    const back = makeAnswer("anything_else", { kind: "free", text: "back" }, { patch: [{ field: "radiation", value: "back", confidence: "medium" }] });
    expect(hasConflict(buildChart([none, back], T0), "radiation")).toBe(true);
  });
});

describe("buildChart", () => {
  it("computes absolute times for durations from the call start", () => {
    const onset = makeAnswer("onset", { kind: "duration", bucket: "minutes", amount: 40, unit: "minutes" });
    const lkw = makeAnswer("last_known_well", { kind: "duration", bucket: "about_1_hour", amount: 1.5, unit: "hours" });
    const c = buildChart([onset, lkw], T0);
    expect(c.onset?.value.approxMinutes).toBe(40);
    expect(c.onset?.value.absoluteTime).toBe(T0 - 40 * 60_000);
    expect(c.lastKnownWell?.value.absoluteTime).toBe(T0 - 90 * 60_000);
  });

  it("leaves absolute time empty when the patient does not know", () => {
    const c = buildChart([makeAnswer("onset", { kind: "duration", bucket: "unknown" })], T0);
    expect(c.onset?.value.absoluteTime).toBeNull();
  });

  it("routes stroke observations into the stroke screen", () => {
    const c = buildChart([makeAnswer("stroke_smile", { kind: "observation", value: true }, { by: "emt" })], T0);
    expect(c.strokeScreen.facialDroop?.value).toBe(true);
  });
});
