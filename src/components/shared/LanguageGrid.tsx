"use client";

import { tKey } from "@/lib/i18n";
import { LANGUAGES } from "@/lib/languages";
import type { LangCode } from "@/lib/schemas";

/** "Point to your language": each name in its own script, large enough to point at. */
export function LanguageGrid({ onPick, selected, includeEnglish = false }: { onPick: (l: LangCode) => void; selected?: LangCode | null; includeEnglish?: boolean }) {
  const langs = LANGUAGES.filter((l) => includeEnglish || l.code !== "en");
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-lg text-ink-soft">
        {langs.map((l) => (
          <span key={l.code} dir={l.dir} lang={l.speechTag}>
            {tKey("pointToLanguage", l.code)}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {langs.map((l) => (
          <button
            key={l.code}
            type="button"
            onClick={() => onPick(l.code)}
            aria-pressed={selected === l.code}
            className={`flex min-h-24 flex-col items-center justify-center rounded-2xl border-2 px-3 py-2 ${
              selected === l.code ? "border-brand bg-brand-soft" : "border-line bg-surface hover:border-brand"
            }`}
          >
            <span dir={l.dir} lang={l.speechTag} className="text-[32px] font-semibold leading-tight">
              {l.nativeName}
            </span>
            <span className="text-sm text-muted">{l.englishName}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
