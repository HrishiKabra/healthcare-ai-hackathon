"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { t } from "@/lib/i18n";
import type { LangCode } from "@/lib/schemas";
import { FreeTextInput } from "./widgets/FreeAnswer";

/** "Or say it / type it": every question can be answered in the patient's own words. */
export function SayItInstead({ lang, onSubmit }: { lang: LangCode; onSubmit: (text: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t-2 border-dashed border-line pt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex min-h-16 items-center gap-2 rounded-xl px-2 text-[24px] font-semibold text-brand-strong hover:bg-brand-soft"
      >
        {open ? <ChevronUp size={28} aria-hidden /> : <ChevronDown size={28} aria-hidden />}
        {t("orSayIt", lang)}
      </button>
      {open ? (
        <div className="mt-2">
          <FreeTextInput lang={lang} onSubmit={onSubmit} autoFocus />
        </div>
      ) : null}
    </div>
  );
}
