import { describe, expect, it } from "vitest";
import { findMeds, lookupMed, normalizeMedication, normalizeText } from "./meds";

describe("medication lookup", () => {
  it("finds brand names in every script", () => {
    const cases: [string, string][] = [
      ["Tomo Eliquis todos los días", "apixaban"],
      ["我吃艾乐妥", "apixaban"],
      ["أتناول إليكويس", "apixaban"],
      ["मैं एलिक्विस लेता हूँ", "apixaban"],
      ["tôi uống Xarelto", "rivaroxaban"],
      ["我每天打胰岛素", "insulin"],
      ["tomo metformina", "metformin"],
    ];
    for (const [text, generic] of cases) expect(findMeds(text).map((m) => m.entry.generic), text).toContain(generic);
  });

  it("strips Latin accents but leaves Devanagari intact", () => {
    expect(normalizeText("Losartán")).toBe("losartan");
    expect(normalizeText("मेटफॉर्मिन")).toBe("मेटफॉर्मिन");
  });

  it("needs word boundaries for Latin names", () => {
    expect(findMeds("I take aspirin")).toHaveLength(1);
    expect(findMeds("caspirinx")).toHaveLength(0);
  });

  it("does not catch colloquial descriptions (that is the model's job)", () => {
    expect(findMeds("una pastilla para la sangre rala")).toEqual([]);
    expect(findMeds("खून पतला करने की दवा")).toEqual([]);
  });

  it("uses the table class over the model's class", () => {
    expect(normalizeMedication("Eliquis", "apixaban", "antiplatelet")).toEqual({ raw: "Eliquis", generic: "apixaban", drugClass: "anticoagulant", classSource: "table" });
  });

  it("falls back to the model's class for drugs not in the table", () => {
    expect(normalizeMedication("Zylotrex", "zylotrexin", "beta_blocker")).toEqual({ raw: "Zylotrex", generic: "zylotrexin", drugClass: "beta_blocker", classSource: "model" });
    expect(lookupMed("Zylotrex")).toBeUndefined();
  });
});
