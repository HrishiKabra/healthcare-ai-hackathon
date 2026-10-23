import medJson from "@/data/med-classes.json";
import { z } from "zod";
import { AllergyCategory, type Medication } from "./schemas";

const MedEntry = z.object({
  generic: z.string(),
  drugClass: z.string(),
  names: z.array(z.string()).min(1),
  allergyCategory: AllergyCategory.optional(),
});
export type MedEntry = z.infer<typeof MedEntry>;

const MedTable = z.object({
  classes: z.record(z.string(), z.string()),
  medications: z.array(MedEntry),
});

const table = MedTable.parse(medJson);
export const MED_TABLE: readonly MedEntry[] = table.medications;
export const DRUG_CLASS_LABELS: Readonly<Record<string, string>> = table.classes;

/**
 * Lowercases and strips Latin diacritics and Arabic short vowels so "Losartán",
 * "losartan", and "مِتفورمين" match their table entries. Devanagari and CJK are
 * left untouched (their combining marks are meaningful).
 */
export function normalizeText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[ً-ْ]/g, "")
    .normalize("NFC")
    .toLowerCase()
    .trim();
}

const LATIN = /^[a-z0-9 .-]+$/;

/** True if `needle` occurs in `hay` (both normalized). Latin needles need word boundaries. */
export function containsTerm(hay: string, needle: string): boolean {
  if (!needle) return false;
  if (LATIN.test(needle)) {
    const esc = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`).test(hay);
  }
  return hay.includes(needle);
}

const ALIASES: { entry: MedEntry; alias: string }[] = MED_TABLE.flatMap((entry) =>
  entry.names.map((n) => ({ entry, alias: normalizeText(n) })),
).sort((a, b) => b.alias.length - a.alias.length);

export type MedMatch = { entry: MedEntry; matched: string };

/** Finds every table medication mentioned in free text, in any of the 6 scripts. */
export function findMeds(text: string): MedMatch[] {
  const hay = normalizeText(text);
  const seen = new Set<string>();
  const out: MedMatch[] = [];
  for (const { entry, alias } of ALIASES) {
    if (seen.has(entry.generic)) continue;
    if (containsTerm(hay, alias)) {
      seen.add(entry.generic);
      out.push({ entry, matched: alias });
    }
  }
  return out;
}

export function lookupMed(name: string): MedEntry | undefined {
  const n = normalizeText(name);
  return ALIASES.find((a) => a.alias === n)?.entry;
}

export function drugClassLabel(drugClass: string): string {
  return DRUG_CLASS_LABELS[drugClass] ?? drugClass.replace(/_/g, " ");
}

/**
 * Resolves the class for a medication. The local table always wins; the model's
 * class is only used when the drug is not in the table.
 */
export function normalizeMedication(raw: string, modelGeneric?: string | null, modelClass?: string | null): Medication {
  const entry = lookupMed(raw) ?? (modelGeneric ? lookupMed(modelGeneric) : undefined) ?? findMeds(raw)[0]?.entry;
  if (entry) return { raw, generic: entry.generic, drugClass: entry.drugClass, classSource: "table" };
  return {
    raw,
    generic: modelGeneric ?? null,
    drugClass: modelClass && modelClass.trim() ? modelClass : "unknown",
    classSource: modelClass ? "model" : undefined,
  };
}
