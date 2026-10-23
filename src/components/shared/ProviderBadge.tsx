"use client";

import { Cloud, Cpu, PlayCircle, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { AI_EVENT, settingsHeaders } from "@/lib/ai/client";
import type { AiMeta } from "@/lib/ai/schemas";

type Status = { active: "mock" | "anthropic" | "ollama"; note: string | null; ollama: { reachable: boolean; installed: boolean } | null };

const LABEL = { mock: "Demo", anthropic: "Cloud", ollama: "On-device" } as const;

/** Small badge with the active AI provider: Demo, Cloud, or On-device (with fallback state). */
export function ProviderBadge() {
  const [status, setStatus] = useState<Status | null>(null);
  const [fallback, setFallback] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/provider-status", { headers: settingsHeaders() })
      .then((r) => r.json())
      .then((s: Status) => {
        if (!alive) return;
        setStatus(s);
        if (s.active === "ollama" && s.ollama && !s.ollama.reachable) setFallback("Ollama is not running");
      })
      .catch(() => {});
    const onAi = (e: Event) => {
      const meta = (e as CustomEvent<AiMeta>).detail;
      setFallback(meta.fallbackReason ?? null);
    };
    window.addEventListener(AI_EVENT, onAi);
    return () => {
      alive = false;
      window.removeEventListener(AI_EVENT, onAi);
    };
  }, []);

  if (!status) return null;
  const Icon = status.active === "anthropic" ? Cloud : status.active === "ollama" ? Cpu : PlayCircle;
  return (
    <span
      className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${fallback ? "border-warning bg-warning-soft text-warning" : "border-line bg-canvas text-ink-soft"}`}
      title={fallback ?? status.note ?? undefined}
    >
      {fallback ? <TriangleAlert size={12} aria-hidden /> : <Icon size={12} aria-hidden />}
      {LABEL[status.active]}
      {fallback ? " (offline, keyword fallback)" : ""}
    </span>
  );
}
