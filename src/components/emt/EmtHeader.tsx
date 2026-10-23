"use client";

import { ExternalLink, Headset, PhoneOff } from "lucide-react";
import { getLanguage } from "@/lib/languages";
import type { SessionState } from "@/lib/session";
import { SessionTimer } from "./SessionTimer";

const MODE_LABEL = { spoken: "Spoken language", asl: "ASL", picture: "Picture board" } as const;

export function EmtHeader({
  state,
  embedded,
  badge,
  onChangeMode,
  onInterpreter,
  onEnd,
}: {
  state: SessionState;
  embedded?: boolean;
  badge?: React.ReactNode;
  onChangeMode: () => void;
  onInterpreter: () => void;
  onEnd: () => void;
}) {
  const lang = getLanguage(state.language);
  const openWindow = (path: string, name: string) => window.open(`${path}?s=${encodeURIComponent(state.id)}`, `${name}-${state.id}`, "noopener");
  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-surface px-4 py-2">
      <span className="text-lg font-bold text-brand">FirstWords</span>
      <SessionTimer startedAt={state.startedAt} stopped={state.ended} />
      <button type="button" onClick={onChangeMode} className="rounded-lg border border-line px-2 py-1 text-sm hover:border-brand" title="Change patient mode">
        {state.mode ? (
          <>
            <span className="font-semibold">{MODE_LABEL[state.mode]}</span>
            {state.mode !== "asl" ? (
              <span className="text-ink-soft">
                {" "}
                {lang.englishName} <span lang={lang.speechTag}>({lang.nativeName})</span>
              </span>
            ) : null}
          </>
        ) : (
          <span className="font-semibold text-warning">Pick patient mode</span>
        )}
      </button>
      {badge}
      <div className="ms-auto flex flex-wrap items-center gap-2">
        {!embedded ? (
          <>
            <button type="button" onClick={() => openWindow("/patient", "patient")} className="flex items-center gap-1 rounded-lg border border-line px-2 py-1.5 text-sm hover:border-brand">
              <ExternalLink size={14} aria-hidden /> Patient window
            </button>
            <button type="button" onClick={() => openWindow("/er", "er")} className="flex items-center gap-1 rounded-lg border border-line px-2 py-1.5 text-sm hover:border-brand">
              <ExternalLink size={14} aria-hidden /> ER window
            </button>
          </>
        ) : null}
        <button type="button" onClick={onInterpreter} className="flex items-center gap-1 rounded-lg border border-brand px-2 py-1.5 text-sm font-semibold text-brand-strong hover:bg-brand-soft">
          <Headset size={16} aria-hidden /> Call live interpreter
        </button>
        <button type="button" onClick={onEnd} className="flex items-center gap-1 rounded-lg bg-critical px-3 py-1.5 text-sm font-semibold text-white hover:brightness-110">
          <PhoneOff size={16} aria-hidden /> End call
        </button>
      </div>
    </header>
  );
}
