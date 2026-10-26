import { normalizeText, termIndex } from "./meds";

// Common food allergens, named in the patient's languages. Like the medication
// table, this table wins over the model: small models mistranslate allergens
// (qwen3:1.7b turned Portuguese "amendoim", peanut, into "almonds"), and an
// allergy is the one fact a crew cannot afford to get wrong.

export type Allergen = { english: string; names: string[] };

export const ALLERGENS: readonly Allergen[] = [
  { english: "peanut", names: ["peanut", "peanuts", "maní", "cacahuate", "cacahuete", "đậu phộng", "花生", "فول سوداني", "मूंगफली", "amendoim"] },
  { english: "tree nuts", names: ["tree nut", "tree nuts", "nueces", "坚果", "مكسرات", "nozes", "castanha", "castanhas"] },
  { english: "shellfish", names: ["shellfish", "shrimp", "mariscos", "camarón", "camarones", "tôm", "hải sản", "虾", "海鲜", "روبيان", "جمبري", "झींगा", "camarão", "frutos do mar"] },
  { english: "egg", names: ["egg", "eggs", "huevo", "huevos", "trứng", "鸡蛋", "بيض", "अंडा", "अंडे", "ovo", "ovos"] },
  { english: "milk", names: ["milk", "leche", "sữa", "牛奶", "حليب", "दूध", "leite"] },
  { english: "fish", names: ["fish", "pescado", "鱼", "سمك", "मछली", "peixe"] },
  { english: "sesame", names: ["sesame", "ajonjolí", "sésamo", "vừng", "芝麻", "سمسم", "तिल", "gergelim"] },
];

const ALIASES = ALLERGENS.flatMap((a) => a.names.map((n) => ({ allergen: a, alias: normalizeText(n) }))).sort((x, y) => y.alias.length - x.alias.length);

export type AllergenMatch = { allergen: Allergen; said: string };

/** Every table allergen named in the text, in any of the six languages. */
export function findAllergens(text: string): AllergenMatch[] {
  const hay = normalizeText(text);
  const out: AllergenMatch[] = [];
  for (const { allergen, alias } of ALIASES) {
    if (out.some((m) => m.allergen === allergen)) continue;
    if (termIndex(hay, alias) >= 0) out.push({ allergen, said: alias });
  }
  return out;
}

/** The table allergen a single name refers to, if any ("amendoim" is peanut). */
export function lookupAllergen(name: string | null | undefined): Allergen | undefined {
  if (!name) return undefined;
  const n = normalizeText(name);
  return ALIASES.find((a) => a.alias === n || termIndex(n, a.alias) >= 0)?.allergen;
}

/**
 * Allergens the patient named that the English translation lost. A non-empty
 * result means the translation cannot be trusted on the one point that matters.
 */
export function lostAllergens(original: string, english: string): AllergenMatch[] {
  const found = findAllergens(original);
  if (!found.length) return [];
  const inEnglish = new Set(findAllergens(english).map((m) => m.allergen.english));
  return found.filter((m) => !inEnglish.has(m.allergen.english));
}

/** Plain note shown with the translation, for example: Allergen check: the patient said "amendoim", which means peanut. */
export function allergenNote(lost: AllergenMatch[]): string {
  return lost.map((m) => `Allergen check: the patient said "${m.said}", which means ${m.allergen.english}.`).join(" ");
}
