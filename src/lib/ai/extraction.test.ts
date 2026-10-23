import { describe, expect, it } from "vitest";
import { requireQuestion } from "../questions";
import { extractionToPatch, normalizeAllergy } from "./extraction";
import { ExtractOutput } from "./schemas";

const out = (o: Partial<ExtractOutput>) => ExtractOutput.parse(o);

describe("extractionToPatch", () => {
  it("never invents fields the output did not contain", () => {
    expect(extractionToPatch(requireQuestion("medications"), out({}))).toEqual([]);
  });

  it("uses the table class over the model's class", () => {
    const p = extractionToPatch(requireQuestion("medications"), out({ medications: [{ raw: "Eliquis", generic: "apixaban", drugClass: "antiplatelet" }], confidence: "high" }));
    expect(p).toEqual([{ field: "medications", value: { raw: "Eliquis", generic: "apixaban", drugClass: "anticoagulant", classSource: "table" }, confidence: "high" }]);
  });

  it("keeps the model's class for a colloquial description with no name", () => {
    const p = extractionToPatch(requireQuestion("medications"), out({ medications: [{ raw: "pastilla para la sangre rala", generic: null, drugClass: "anticoagulant" }], confidence: "medium" }));
    expect(p[0]).toMatchObject({ field: "medications", value: { generic: null, drugClass: "anticoagulant", classSource: "model" } });
  });

  it("records a drug named on the allergy question as an allergy", () => {
    const p = extractionToPatch(requireQuestion("allergy_detail"), out({ medications: [{ raw: "ibuprofeno", generic: "ibuprofen", drugClass: "nsaid" }] }));
    expect(p).toEqual([{ field: "allergies", value: { raw: "ibuprofeno", substance: "ibuprofen", category: "nsaid" }, confidence: "low" }]);
  });

  it("maps yes/no and durations onto the question's own field", () => {
    expect(extractionToPatch(requireQuestion("head_strike"), out({ yesNo: "yes", confidence: "high" }))).toEqual([{ field: "headStrike", value: true, confidence: "high" }]);
    const d = extractionToPatch(requireQuestion("last_known_well"), out({ duration: { bucket: "about_1_hour", amount: 90, unit: "minutes" } }));
    expect(d[0]).toMatchObject({ field: "lastKnownWell", value: { approxMinutes: 90 } });
  });

  it("ignores a chief complaint volunteered on an unrelated question", () => {
    expect(extractionToPatch(requireQuestion("medications"), out({ chiefComplaint: "chest_pain" }))).toEqual([]);
  });
});

describe("normalizeAllergy", () => {
  it("takes the category from the med table", () => {
    expect(normalizeAllergy({ raw: "Advil", substance: null, category: "other" })).toEqual({ raw: "Advil", substance: "ibuprofen", category: "nsaid" });
    expect(normalizeAllergy({ raw: "amoxicilina", substance: "amoxicillin", category: "other" }).category).toBe("penicillin");
  });
});
