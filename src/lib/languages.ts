import languagesJson from "@/data/languages.json";
import { Language, type LangCode } from "./schemas";

export const LANGUAGES: readonly Language[] = Language.array().parse(languagesJson);

const byCode = new Map(LANGUAGES.map((l) => [l.code, l]));

export function getLanguage(code: LangCode): Language {
  return byCode.get(code) ?? LANGUAGES[0];
}

export function isRtl(code: LangCode): boolean {
  return getLanguage(code).dir === "rtl";
}
