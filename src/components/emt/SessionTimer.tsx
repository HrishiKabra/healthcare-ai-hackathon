"use client";

import { Timer } from "lucide-react";
import { useNow } from "@/hooks/useNow";

export function formatElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function SessionTimer({ startedAt, stopped }: { startedAt: number; stopped?: boolean }) {
  const now = useNow(1000);
  return (
    <span className="flex items-center gap-1.5 font-mono text-lg font-semibold tabular-nums" aria-label="Time on scene">
      <Timer size={18} className="text-brand" aria-hidden />
      {stopped ? "--:--" : formatElapsed(now - startedAt)}
    </span>
  );
}
