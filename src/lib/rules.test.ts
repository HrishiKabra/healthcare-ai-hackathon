import { describe, expect, it } from "vitest";
import { buildChart } from "./chart";
import { RULES, evaluateRules } from "./rules";
import type { Answer, PatchEntry } from "./schemas";
import { choice, makeAnswer, no, observed, yes } from "./testing";

const T0 = Date.UTC(2026, 9, 24, 14, 0, 0);
const flagsFor = (answers: Answer[], now = T0) => evaluateRules(buildChart(answers, T0), now).map((f) => f.ruleId);
const free = (patch: PatchEntry[], status: Answer["status"] = "confirmed") =>
  makeAnswer("anything_else", { kind: "free", text: "free" }, { patch, status });
const med = (raw: string, generic: string | null, drugClass: string): PatchEntry => ({
  field: "medications",
  value: { raw, generic, drugClass, classSource: "table" },
  confidence: "high",
});
const eliquis = med("Eliquis", "apixaban", "anticoagulant");

describe("rules engine", () => {
  it("has the nine rules from the spec, numbered 1 to 9", () => {
    expect(RULES.map((r) => r.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("fires nothing on an empty chart", () => {
    expect(flagsFor([])).toEqual([]);
  });

  describe("1. anticoagulant + fall or head strike", () => {
    it("fires for a fall on a blood thinner", () => {
      expect(flagsFor([makeAnswer("chief_complaint", choice("fall_injury")), free([eliquis])])).toContain("anticoag_head");
    });
    it("fires for a head strike on a blood thinner quick pick", () => {
      expect(flagsFor([makeAnswer("head_strike", yes), makeAnswer("medications", choice("blood_thinner"))])).toContain("anticoag_head");
    });
    it("does not fire for a fall without a blood thinner", () => {
      expect(flagsFor([makeAnswer("chief_complaint", choice("fall_injury")), free([med("Metformin", "metformin", "antidiabetic")])])).not.toContain("anticoag_head");
    });
    it("does not fire for a blood thinner without a fall or head strike", () => {
      expect(flagsFor([makeAnswer("chief_complaint", choice("chest_pain")), makeAnswer("head_strike", no), free([eliquis])])).not.toContain("anticoag_head");
    });
    it("does not count antiplatelets as anticoagulants", () => {
      expect(flagsFor([makeAnswer("head_strike", yes), free([med("Plavix", "clopidogrel", "antiplatelet")])])).not.toContain("anticoag_head");
    });
  });

  describe("2. stroke screen positive", () => {
    it("fires on facial droop and reports hours since last known well", () => {
      const answers = [
        makeAnswer("stroke_smile", observed(true), { by: "emt" }),
        makeAnswer("last_known_well", { kind: "duration", bucket: "about_1_hour", amount: 1.5, unit: "hours" }),
      ];
      const flags = evaluateRules(buildChart(answers, T0), T0);
      const f = flags.find((x) => x.ruleId === "stroke_alert")!;
      expect(f).toBeDefined();
      expect(f.facts.find((x) => x.label === "Hours since last known well")?.value).toBe("1.5");
      expect(f.explanation).toContain("inside the 4.5 hour window");
    });
    it("fires on arm drift or abnormal speech alone", () => {
      expect(flagsFor([makeAnswer("stroke_arms", observed(true), { by: "emt" })])).toContain("stroke_alert");
      expect(flagsFor([makeAnswer("stroke_speech", observed(true), { by: "emt" })])).toContain("stroke_alert");
    });
    it("says when the patient is outside the 4.5 hour window", () => {
      const answers = [
        makeAnswer("stroke_smile", observed(true), { by: "emt" }),
        makeAnswer("last_known_well", { kind: "duration", bucket: "few_hours", amount: 6, unit: "hours" }),
      ];
      const f = evaluateRules(buildChart(answers, T0), T0).find((x) => x.ruleId === "stroke_alert")!;
      expect(f.explanation).toContain("Outside the 4.5 hour window");
    });
    it("does not fire on a normal stroke screen", () => {
      expect(
        flagsFor([
          makeAnswer("stroke_smile", observed(false), { by: "emt" }),
          makeAnswer("stroke_arms", observed(false), { by: "emt" }),
          makeAnswer("stroke_speech", observed(false), { by: "emt" }),
        ]),
      ).not.toContain("stroke_alert");
    });
  });

  describe("3. chest pain + aspirin or NSAID allergy", () => {
    it("fires for an aspirin allergy", () => {
      expect(flagsFor([makeAnswer("chief_complaint", choice("chest_pain")), makeAnswer("allergy_detail", choice("aspirin"))])).toContain("chest_pain_aspirin_allergy");
    });
    it("fires for an NSAID allergy", () => {
      expect(flagsFor([makeAnswer("chief_complaint", choice("chest_pain")), makeAnswer("allergy_detail", choice("nsaid"))])).toContain("chest_pain_aspirin_allergy");
    });
    it("does not fire for a penicillin allergy", () => {
      expect(flagsFor([makeAnswer("chief_complaint", choice("chest_pain")), makeAnswer("allergy_detail", choice("penicillin"))])).not.toContain("chest_pain_aspirin_allergy");
    });
    it("does not fire for an aspirin allergy without chest pain", () => {
      expect(flagsFor([makeAnswer("chief_complaint", choice("belly_pain")), makeAnswer("allergy_detail", choice("aspirin"))])).not.toContain("chest_pain_aspirin_allergy");
    });
  });

  describe("4. torn aorta", () => {
    it("fires for tearing chest pain", () => {
      expect(flagsFor([makeAnswer("chief_complaint", choice("chest_pain")), makeAnswer("quality", choice("tearing"))])).toContain("aortic_dissection");
    });
    it("fires for chest pain spreading to the back", () => {
      expect(flagsFor([makeAnswer("chief_complaint", choice("chest_pain")), makeAnswer("radiation", { kind: "bodymap", regions: ["back"] })])).toContain("aortic_dissection");
    });
    it("does not fire for pressure spreading to the arm", () => {
      expect(
        flagsFor([
          makeAnswer("chief_complaint", choice("chest_pain")),
          makeAnswer("quality", choice("pressure")),
          makeAnswer("radiation", { kind: "bodymap", regions: ["left_arm"] }),
        ]),
      ).not.toContain("aortic_dissection");
    });
    it("does not fire for back pain without chest pain", () => {
      expect(flagsFor([makeAnswer("chief_complaint", choice("fall_injury")), makeAnswer("radiation", { kind: "bodymap", regions: ["back"] })])).not.toContain("aortic_dissection");
    });
  });

  describe("5. possible allergic reaction", () => {
    it("fires for a known allergy with trouble breathing", () => {
      expect(flagsFor([makeAnswer("chief_complaint", choice("trouble_breathing")), makeAnswer("allergy_detail", choice("penicillin"))])).toContain("allergic_reaction");
    });
    it("fires for a known allergy with facial swelling in the notes", () => {
      expect(flagsFor([makeAnswer("allergy_detail", choice("penicillin")), free([{ field: "notes", value: "Lips and face are swelling", confidence: "medium" }])])).toContain("allergic_reaction");
    });
    it("does not fire for trouble breathing without a known allergy", () => {
      expect(flagsFor([makeAnswer("chief_complaint", choice("trouble_breathing")), makeAnswer("allergy_any", no)])).not.toContain("allergic_reaction");
    });
    it("does not count an unspecified 'yes' as a known allergy", () => {
      expect(flagsFor([makeAnswer("chief_complaint", choice("trouble_breathing")), makeAnswer("allergy_any", yes)])).not.toContain("allergic_reaction");
    });
  });

  describe("6. diabetes or insulin + weakness, dizziness, or confusion", () => {
    it("fires for diabetes with dizziness", () => {
      expect(flagsFor([makeAnswer("chief_complaint", choice("dizziness")), makeAnswer("conditions", choice("diabetes"))])).toContain("check_glucose");
    });
    it("fires for insulin with weakness", () => {
      expect(flagsFor([makeAnswer("chief_complaint", choice("weakness_numbness")), makeAnswer("medications", choice("insulin"))])).toContain("check_glucose");
    });
    it("fires for a diabetes medicine with confusion in the notes", () => {
      expect(flagsFor([free([med("metformin", "metformin", "antidiabetic"), { field: "notes", value: "Family says he seems confused", confidence: "medium" }])])).toContain("check_glucose");
    });
    it("does not fire for diabetes with chest pain", () => {
      expect(flagsFor([makeAnswer("chief_complaint", choice("chest_pain")), makeAnswer("conditions", choice("diabetes"))])).not.toContain("check_glucose");
    });
    it("does not fire for dizziness without diabetes", () => {
      expect(flagsFor([makeAnswer("chief_complaint", choice("dizziness")), makeAnswer("conditions", choice("asthma"))])).not.toContain("check_glucose");
    });
  });

  describe("7. pregnancy + belly pain or bleeding", () => {
    it("fires for pregnancy with belly pain", () => {
      expect(flagsFor([makeAnswer("chief_complaint", choice("belly_pain")), makeAnswer("pregnancy", yes)])).toContain("pregnancy_belly");
    });
    it("fires for pregnancy as a condition with bleeding", () => {
      expect(flagsFor([makeAnswer("chief_complaint", choice("bleeding")), makeAnswer("conditions", choice("pregnancy"))])).toContain("pregnancy_belly");
    });
    it("does not fire when not pregnant", () => {
      expect(flagsFor([makeAnswer("chief_complaint", choice("belly_pain")), makeAnswer("pregnancy", no)])).not.toContain("pregnancy_belly");
    });
    it("does not fire for pregnancy with chest pain", () => {
      expect(flagsFor([makeAnswer("chief_complaint", choice("chest_pain")), makeAnswer("pregnancy", yes)])).not.toContain("pregnancy_belly");
    });
  });

  describe("8. severe pain with unknown cause", () => {
    it("fires for 9 out of 10 with 'something else'", () => {
      expect(flagsFor([makeAnswer("chief_complaint", choice("other")), makeAnswer("severity", { kind: "scale", value: 9 })])).toContain("severe_pain_unknown");
    });
    it("fires for 8 out of 10 with no chief complaint", () => {
      expect(flagsFor([makeAnswer("severity", { kind: "scale", value: 8 })])).toContain("severe_pain_unknown");
    });
    it("does not fire for 7 out of 10", () => {
      expect(flagsFor([makeAnswer("chief_complaint", choice("other")), makeAnswer("severity", { kind: "scale", value: 7 })])).not.toContain("severe_pain_unknown");
    });
    it("does not fire when the cause is known", () => {
      expect(flagsFor([makeAnswer("chief_complaint", choice("chest_pain")), makeAnswer("severity", { kind: "scale", value: 9 })])).not.toContain("severe_pain_unknown");
    });
  });

  describe("9. conflicting answers on allergies or medications", () => {
    it("fires when 'no allergies' meets a real allergy", () => {
      expect(flagsFor([makeAnswer("allergy_any", no), free([{ field: "allergies", value: { raw: "penicilina", substance: "penicillin", category: "penicillin" }, confidence: "medium" }])])).toContain("conflicting_meds_allergies");
    });
    it("fires when 'no medicines' meets a real medicine", () => {
      expect(flagsFor([makeAnswer("medications", choice("none")), free([eliquis])])).toContain("conflicting_meds_allergies");
    });
    it("does not fire for consistent answers", () => {
      expect(flagsFor([makeAnswer("allergy_any", yes), makeAnswer("allergy_detail", choice("aspirin")), free([eliquis])])).not.toContain("conflicting_meds_allergies");
    });
    it("does not fire for conflicts on other fields", () => {
      expect(flagsFor([makeAnswer("head_strike", yes), free([{ field: "headStrike", value: false, confidence: "high" }])])).not.toContain("conflicting_meds_allergies");
    });
  });

  describe("reasons and confirmation", () => {
    it("every flag carries the rule text, the triggering facts, and an explanation", () => {
      const flags = evaluateRules(buildChart([makeAnswer("chief_complaint", choice("chest_pain")), makeAnswer("allergy_detail", choice("aspirin"))], T0), T0);
      const f = flags[0];
      expect(f.rule).toBeTruthy();
      expect(f.explanation).toBeTruthy();
      expect(f.facts.map((x) => x.value)).toEqual(["Chest pain", "Aspirin"]);
    });
    it("labels a flag as based on unconfirmed data when any fact is unconfirmed", () => {
      const flags = evaluateRules(
        buildChart([makeAnswer("chief_complaint", choice("chest_pain")), makeAnswer("allergy_detail", choice("aspirin"), { status: "pending" })], T0),
        T0,
      );
      expect(flags[0].basedOnUnconfirmed).toBe(true);
    });
    it("is not labeled unconfirmed when every fact is confirmed", () => {
      const flags = evaluateRules(buildChart([makeAnswer("chief_complaint", choice("chest_pain")), makeAnswer("allergy_detail", choice("aspirin"))], T0), T0);
      expect(flags[0].basedOnUnconfirmed).toBe(false);
    });
  });
});
