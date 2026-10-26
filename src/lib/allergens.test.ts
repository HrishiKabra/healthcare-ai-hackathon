import { describe, expect, it } from "vitest";
import { extractionToPatch, normalizeAllergy } from "./ai/extraction";
import { interpretFree, type AiCalls } from "./ai/pipeline";
import { ExtractOutput } from "./ai/schemas";
import { allergenNote, findAllergens, lookupAllergen, lostAllergens } from "./allergens";
import { requireQuestion } from "./questions";

describe("allergen table", () => {
  it("finds food allergens in every patient language", () => {
    const said: [string, string][] = [
      ["Soy alérgico al maní", "peanut"],
      ["Tôi bị dị ứng tôm", "shellfish"],
      ["我对花生过敏", "peanut"],
      ["عندي حساسية من البيض", "egg"],
      ["मुझे दूध से एलर्जी है", "milk"],
      ["Sou alérgica a amendoim", "peanut"],
    ];
    for (const [text, english] of said) expect(findAllergens(text).map((m) => m.allergen.english), text).toEqual([english]);
    expect(lookupAllergen("amendoim")?.english).toBe("peanut");
  });

  it("catches the real qwen3:1.7b mistake: amendoim translated as almonds", () => {
    const lost = lostAllergens("Sou alérgica a amendoim", "I am allergic to almonds");
    expect(lost.map((m) => m.allergen.english)).toEqual(["peanut"]);
    expect(allergenNote(lost)).toBe('Allergen check: the patient said "amendoim", which means peanut.');
    expect(lostAllergens("Sou alérgica a amendoim", "I am allergic to peanuts")).toEqual([]);
  });
});

describe("allergen safety net in the pipeline", () => {
  const calls: AiCalls = {
    translate: async () => ({ translation: "I am allergic to almonds.", backTranslation: "", confidence: "high", notes: "", meta: { provider: "ollama", model: "qwen3:1.7b" } }),
    extract: async (r) => {
      const output = ExtractOutput.parse({ allergies: [{ raw: "almonds", substance: "almond", category: "food" }], confidence: "high" });
      return { output, patch: extractionToPatch(requireQuestion("allergy_detail"), output, [r.answerRaw, r.answerEnglish ?? ""]), needsReview: false, meta: { provider: "ollama", model: "qwen3:1.7b" } };
    },
  };

  it("flags the lost allergen, distrusts the translation, and charts the right one", async () => {
    const heard: [string | null, string][] = [];
    const r = await interpretFree(calls, requireQuestion("allergy_detail"), "Sou alérgica a amendoim", "pt", (e, c) => heard.push([e, c]));
    expect(heard[0][0]).toContain('Allergen check: the patient said "amendoim", which means peanut.');
    expect(heard[0][1]).toBe("low");
    expect(r.needsReview).toBe(true);
    expect(r.patch).toContainEqual({ field: "allergies", value: { raw: "almonds", substance: "peanut", category: "food" }, confidence: "high" });
  });

  it("maps a table name to the English allergen", () => {
    expect(normalizeAllergy({ raw: "amendoim", substance: "amendoim", category: "food" })).toEqual({ raw: "amendoim", substance: "peanut", category: "food" });
  });
});
