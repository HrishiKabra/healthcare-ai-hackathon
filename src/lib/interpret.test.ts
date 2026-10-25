import { describe, expect, it } from "vitest";
import { allergyLabel, confirmFromPatch, interpretStructured, toDuration } from "./interpret";
import { requireQuestion } from "./questions";

describe("interpretStructured", () => {
  it("builds Spanish confirm text from localized labels", () => {
    const r = interpretStructured(requireQuestion("chief_complaint"), { kind: "choice", choiceIds: ["chest_pain"] }, "es");
    expect(r.confirmText.native).toBe("Problema principal: Dolor de pecho");
    expect(r.confirmText.english).toBe("Main problem: Chest pain");
  });

  it("formats body map regions and 'does not spread'", () => {
    const q = requireQuestion("radiation");
    expect(interpretStructured(q, { kind: "bodymap", regions: ["left_arm"] }, "ar").confirmText.native).toBe("ينتشر إلى: الذراع اليسرى");
    const none = interpretStructured(q, { kind: "bodymap", regions: [] }, "en");
    expect(none.patch).toEqual([{ field: "radiation", value: "none", confidence: "high" }]);
    expect(none.confirmText.english).toBe("Spreads to: It does not spread");
  });

  it("formats durations with an exact number", () => {
    const r = interpretStructured(requireQuestion("onset"), { kind: "duration", bucket: "minutes", amount: 40, unit: "minutes" }, "es");
    expect(r.confirmText.native).toBe("Empezó: hace 40 minutos");
  });

  it("maps the blood thinner quick pick to the anticoagulant class", () => {
    const r = interpretStructured(requireQuestion("medications"), { kind: "choice", choiceIds: ["blood_thinner"] }, "en");
    expect(r.patch[0]).toMatchObject({ field: "medications", value: { generic: null, drugClass: "anticoagulant" } });
    expect(r.confirmText.english).toBe("Medicines: Blood thinner");
  });

  it("maps yes/no to the question's field", () => {
    expect(interpretStructured(requireQuestion("head_strike"), { kind: "yesno", value: "yes" }, "vi").patch).toEqual([{ field: "headStrike", value: true, confidence: "high" }]);
    expect(interpretStructured(requireQuestion("allergy_any"), { kind: "yesno", value: "no" }, "en").confirmText.english).toBe("Allergies: No allergies");
  });

  it("shows the opening question's answer as a short phrase", () => {
    expect(interpretStructured(requireQuestion("understand"), { kind: "yesno", value: "yes" }, "zh").confirmText.native).toBe("我能听懂");
  });
});

describe("confirmFromPatch", () => {
  it("shows what was understood, e.g. Medicines: apixaban (Eliquis)", () => {
    const c = confirmFromPatch([{ field: "medications", value: { raw: "Eliquis", generic: "apixaban", drugClass: "anticoagulant" }, confidence: "high" }], "es");
    expect(c.native).toBe("Medicamentos: apixaban (Eliquis)");
    expect(c.english).toBe("Medicines: apixaban (Eliquis)");
  });
});

describe("toDuration", () => {
  it("prefers the exact number over the bucket estimate", () => {
    expect(toDuration("about_1_hour", 90, "minutes").approxMinutes).toBe(90);
    expect(toDuration("yesterday").approxMinutes).toBe(1440);
    expect(toDuration("unknown").approxMinutes).toBeNull();
  });
});

describe("allergyLabel", () => {
  const peanut = { raw: "amendoim", substance: "peanut", category: "food" as const };
  it("shows the patient their own word and the crew the English with it", () => {
    expect(allergyLabel(peanut, "pt")).toBe("amendoim");
    expect(allergyLabel(peanut, "en")).toBe("peanut (amendoim)");
  });
  it("uses the localized label for known categories", () => {
    expect(allergyLabel({ raw: "aspirina", substance: "aspirin", category: "aspirin" }, "pt")).toBe("Aspirina");
  });
});

