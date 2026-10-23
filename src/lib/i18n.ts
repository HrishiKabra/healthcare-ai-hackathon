import uiStrings from "@/data/ui-strings.json";
import type { BodyRegion, ChartField, Duration, LangCode, Question } from "./schemas";

export type UiKey = keyof typeof uiStrings;
type Entry = Record<LangCode, string>;

const STRINGS = uiStrings as Record<string, Entry>;

/** Patient-facing UI string in the given language, falling back to English. */
export function t(key: UiKey, lang: LangCode): string {
  const e = STRINGS[key];
  return e?.[lang] ?? e?.en ?? key;
}

/** Same as t() but accepts dynamic keys like `region.${id}`. Returns the key itself when missing. */
export function tKey(key: string, lang: LangCode): string {
  const e = STRINGS[key];
  return e?.[lang] ?? e?.en ?? key;
}

export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
}

export function questionText(q: Question, lang: LangCode): string {
  if (lang === "en") return q.english;
  return q.translations[lang] ?? q.english;
}

export function isQuestionVerified(q: Question, lang: LangCode): boolean {
  if (lang === "en") return true;
  return q.translationsVerified[lang] ?? false;
}

export function choiceLabel(q: Question, choiceId: string, lang: LangCode): string {
  const c = q.choices.find((x) => x.id === choiceId);
  if (!c) return choiceId;
  if (lang === "en") return c.english;
  return c.translations[lang] ?? c.english;
}

export function regionLabel(region: BodyRegion | string, lang: LangCode): string {
  return tKey(`region.${region}`, lang);
}

export function fieldLabel(field: ChartField, lang: LangCode): string {
  return tKey(`field.${field}`, lang);
}

export function joinList(items: string[], lang: LangCode): string {
  return items.join(t("listSeparator", lang));
}

export function formatDuration(d: Pick<Duration, "bucket" | "amount" | "unit">, lang: LangCode): string {
  if (d.amount != null && d.unit) {
    return fmt(t("agoFormat", lang), { n: d.amount, unit: tKey(`unit.${d.unit}`, lang) });
  }
  return tKey(`duration.${d.bucket}`, lang);
}
