"use client";

import { Pause, Play, StepForward } from "lucide-react";
import type { useAutopilot } from "@/hooks/useAutopilot";

export function AutopilotBar({
  ap,
  autoAdvance,
  onAutoAdvance,
  children,
}: {
  ap: ReturnType<typeof useAutopilot>;
  autoAdvance: boolean;
  onAutoAdvance: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="no-print flex flex-wrap items-center gap-3 border-b border-signal bg-signal-soft px-4 py-2 text-sm">
      <span className="font-semibold text-ink">Scenario autopilot</span>
      {children}
      {ap.scenario ? (
        <>
          <span className="text-ink-soft">
            {ap.scenario.title}, step {Math.min(ap.stepIndex + 1, ap.total)} of {ap.total}
            {ap.done ? " (done)" : ""}
          </span>
          <button
            type="button"
            onClick={ap.next}
            disabled={ap.done || ap.busy}
            className="flex items-center gap-1 rounded-lg border border-ink/20 bg-surface px-3 py-1.5 font-semibold disabled:opacity-40"
          >
            <StepForward size={16} aria-hidden /> Next step
          </button>
          {ap.playing ? (
            <button type="button" onClick={ap.pause} className="flex items-center gap-1 rounded-lg bg-ink px-3 py-1.5 font-semibold text-white">
              <Pause size={16} aria-hidden /> Pause
            </button>
          ) : (
            <button type="button" onClick={ap.play} disabled={ap.done} className="flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 font-semibold text-white disabled:opacity-40">
              <Play size={16} aria-hidden /> Play
            </button>
          )}
          <div className="flex overflow-hidden rounded-lg border border-ink/20" role="radiogroup" aria-label="Speed">
            {([1, 2] as const).map((s) => (
              <button key={s} type="button" aria-pressed={ap.speed === s} onClick={() => ap.setSpeed(s)} className={`px-2.5 py-1.5 font-semibold ${ap.speed === s ? "bg-ink text-white" : "bg-surface"}`}>
                {s}x
              </button>
            ))}
          </div>
        </>
      ) : null}
      <label className="ms-auto flex items-center gap-2">
        <input type="checkbox" className="size-4 accent-[var(--color-brand)]" checked={autoAdvance} onChange={(e) => onAutoAdvance(e.target.checked)} />
        Auto-advance
      </label>
    </div>
  );
}
