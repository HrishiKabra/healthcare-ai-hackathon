import { describe, expect, it } from "vitest";
import { baselineExtract } from "./baseline";
import { requireQuestion } from "./questions";

const q = requireQuestion;

describe("keyword baseline", () => {
  it("finds named medications in any script, with the table class", () => {
    expect(baselineExtract(q("medications"), "Tomo Xarelto y metformina", "es").medications.map((m) => [m.generic, m.drugClass])).toEqual([
      ["rivaroxaban", "anticoagulant"],
      ["metformin", "antidiabetic"],
    ]);
    expect(baselineExtract(q("medications"), "我每天打胰岛素", "zh").medications[0].generic).toBe("insulin");
  });

  it("knows Brazilian Portuguese drug names, yes, and no", () => {
    expect(baselineExtract(q("medications"), "Tomo apixabana e Glifage", "pt").medications.map((m) => m.drugClass)).toEqual(["anticoagulant", "antidiabetic"]);
    expect(baselineExtract(q("head_strike"), "Sim, bati", "pt").yesNo).toBe("yes");
    expect(baselineExtract(q("head_strike"), "Não", "pt").yesNo).toBe("no");
    expect(baselineExtract(q("medications"), "Não tomo nenhum remédio", "pt").medications[0].generic).toBe("none");
  });

  it("misses colloquial descriptions without a drug name (the gap the model fills)", () => {
    expect(baselineExtract(q("medications"), "tomo una pastilla para la sangre rala", "es").medications).toEqual([]);
    expect(baselineExtract(q("medications"), "मैं खून पतला करने की दवा लेता हूँ", "hi").medications).toEqual([]);
  });

  it("treats named drugs as allergies on the allergy questions", () => {
    const out = baselineExtract(q("allergy_detail"), "Soy alérgico a la aspirina", "es");
    expect(out.allergies).toEqual([{ raw: "aspirina", substance: "aspirin", category: "aspirin" }]);
    expect(out.medications).toEqual([]);
  });

  it("matches localized option labels", () => {
    expect(baselineExtract(q("chief_complaint"), "tengo dolor de pecho", "es").chiefComplaint).toBe("chest_pain");
    expect(baselineExtract(q("chief_complaint"), "我胸痛", "zh").chiefComplaint).toBe("chest_pain");
  });

  it("understands negations for yes/no and 'none' answers", () => {
    expect(baselineExtract(q("head_strike"), "No", "es").yesNo).toBe("no");
    expect(baselineExtract(q("head_strike"), "có", "vi").yesNo).toBe("yes");
    expect(baselineExtract(q("medications"), "ninguno", "es").medications[0].generic).toBe("none");
    expect(baselineExtract(q("allergy_detail"), "没有", "zh").allergies[0].category).toBe("none");
  });

  it("reads numbers for pain and durations", () => {
    expect(baselineExtract(q("severity"), "como un 8", "es").severity).toBe(8);
    expect(baselineExtract(q("onset"), "hace 40 minutos", "es").duration).toEqual({ bucket: "minutes", amount: 40, unit: "minutes" });
  });

  it("reports low confidence when nothing matched", () => {
    const out = baselineExtract(q("chief_complaint"), "algo raro", "es");
    expect(out.confidence).toBe("low");
    expect(out.chiefComplaint).toBeNull();
  });
});
