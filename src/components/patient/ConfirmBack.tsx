"use client";

import { Volume2 } from "lucide-react";
import { t } from "@/lib/i18n";
import { getLanguage } from "@/lib/languages";
import type { LangCode } from "@/lib/schemas";
import { speak } from "@/lib/speech";
import { BigButton } from "./ui";

/** "You said: ... Is this right?" Only a Yes here makes the answer count as confirmed. */
export function ConfirmBack({ lang, text, onConfirm }: { lang: LangCode; text: string; onConfirm: (yes: boolean) => void }) {
  const spoken = `${t("youSaid", lang)} ${text.replace(/\n/g, ". ")}. ${t("isThisRight", lang)}`;
  return (
    <section className="flex flex-1 flex-col gap-6">
      <div className="rounded-3xl border-s-[14px] border-brand bg-surface p-6">
        <p className="text-[28px] font-medium text-ink-soft">{t("youSaid", lang)}</p>
        <p className="mt-2 whitespace-pre-line text-[40px] font-semibold leading-tight text-ink">{text}</p>
        <div className="mt-4 flex items-center justify-between gap-4">
          <p className="text-[32px] font-semibold">{t("isThisRight", lang)}</p>
          <button
            type="button"
            onClick={() => speak(spoken, getLanguage(lang).speechTag)}
            className="flex min-h-16 items-center gap-3 rounded-2xl border-2 border-line px-4 text-[24px] font-semibold text-brand-strong hover:border-brand"
          >
            <Volume2 size={30} aria-hidden />
            {t("readAloud", lang)}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <BigButton tone="yes" icon="yes" iconSize={64} className="min-h-48 flex-col text-[32px]" onClick={() => onConfirm(true)}>
          {t("confirmYes", lang)}
        </BigButton>
        <BigButton tone="no" icon="no" iconSize={64} className="min-h-48 flex-col text-[32px]" onClick={() => onConfirm(false)}>
          {t("confirmNo", lang)}
        </BigButton>
      </div>
    </section>
  );
}
