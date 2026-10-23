"use client";

import { Hand, Image as ImageIcon, Languages } from "lucide-react";
import { useState } from "react";
import { LanguageGrid } from "@/components/shared/LanguageGrid";
import type { LangCode, PatientMode } from "@/lib/schemas";

const MODES: { mode: PatientMode; title: string; body: string; Icon: typeof Languages }[] = [
  { mode: "spoken", title: "Spoken language", body: "Questions in the patient's language, read aloud. They answer by tapping or speaking.", Icon: Languages },
  { mode: "asl", title: "ASL", body: "Signed question videos with English text. Answers by tapping.", Icon: Hand },
  { mode: "picture", title: "Picture board", body: "Icons first, minimal text. For patients who cannot speak or read.", Icon: ImageIcon },
];

/** First step: how will this patient communicate? */
export function ModePicker({ onPick, current }: { onPick: (mode: PatientMode, lang: LangCode) => void; current?: { mode: PatientMode | null; language: LangCode } }) {
  const [mode, setMode] = useState<PatientMode | null>(current?.mode ?? null);
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-3 gap-3">
        {MODES.map(({ mode: m, title, body, Icon }) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => {
              setMode(m);
              if (m === "asl") onPick("asl", "en");
            }}
            className={`flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-start ${mode === m ? "border-brand bg-brand-soft" : "border-line bg-surface hover:border-brand"}`}
          >
            <Icon size={32} className="text-brand" aria-hidden />
            <span className="text-lg font-semibold">{title}</span>
            <span className="text-sm text-ink-soft">{body}</span>
          </button>
        ))}
      </div>
      {mode === "spoken" ? (
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="mb-3 text-sm text-ink-soft">Show this to the patient and let them point.</p>
          <LanguageGrid onPick={(l) => onPick("spoken", l)} selected={current?.mode === "spoken" ? current.language : null} />
        </div>
      ) : null}
      {mode === "picture" ? (
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="mb-3 text-sm text-ink-soft">Picture board text language. Use English if unsure.</p>
          <LanguageGrid includeEnglish onPick={(l) => onPick("picture", l)} selected={current?.mode === "picture" ? current.language : null} />
        </div>
      ) : null}
    </div>
  );
}
