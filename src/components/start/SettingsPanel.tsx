"use client";

import { CircleCheck, CircleX, Plug } from "lucide-react";
import { useEffect, useState } from "react";
import { settingsHeaders } from "@/lib/ai/client";
import { defaultSettings, loadSettings, OLLAMA_PRESETS, saveSettings, type OllamaPreset, type ProviderChoice, type Settings } from "@/lib/settings";

type Status = {
  demoMode: boolean;
  defaultProvider: string;
  active: string;
  note: string | null;
  cloudAvailable: boolean;
  anthropicModel: string;
  ollamaModel: string;
  ollamaBaseUrl: string;
  ollama: { reachable: boolean; installed: boolean; models: string[]; error?: string } | null;
};

const PROVIDERS: { value: ProviderChoice; label: string }[] = [
  { value: "default", label: "Server default (.env)" },
  { value: "mock", label: "Demo (canned, no AI)" },
  { value: "ollama", label: "On-device (Ollama)" },
  { value: "anthropic", label: "Cloud (Claude)" },
];

/** Settings only, stored in localStorage. Never patient data. */
export function SettingsPanel() {
  const [s, setS] = useState<Settings>(defaultSettings());
  const [status, setStatus] = useState<Status | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    // localStorage is only readable after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setS(loadSettings());
  }, []);

  const update = (patch: Partial<Settings>) => {
    const next = { ...s, ...patch };
    setS(next);
    saveSettings(next);
    setStatus(null);
  };

  const test = async () => {
    setTesting(true);
    try {
      const r = await fetch("/api/provider-status?check=1", { headers: settingsHeaders() });
      setStatus((await r.json()) as Status);
    } catch {
      setStatus(null);
    } finally {
      setTesting(false);
    }
  };

  return (
    <details className="rounded-2xl border border-line bg-surface p-4">
      <summary className="cursor-pointer text-lg font-semibold">AI settings</summary>
      <div className="mt-4 flex flex-col gap-4 text-sm">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-semibold">Provider</legend>
          {PROVIDERS.map((p) => (
            <label key={p.value} className="flex items-center gap-2">
              <input type="radio" name="provider" className="accent-[var(--color-brand)]" checked={s.provider === p.value} onChange={() => update({ provider: p.value })} />
              {p.label}
            </label>
          ))}
          <p className="text-xs text-ink-soft">
            Cloud is only used when the team sets <code>AI_PROVIDER=anthropic</code> and a key in <code>.env</code>. With <code>DEMO_MODE=true</code>, every provider runs in demo mode.
          </p>
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-semibold">On-device model (about 8 GB free memory)</legend>
          {(Object.keys(OLLAMA_PRESETS) as OllamaPreset[]).map((k) => (
            <label key={k} className="flex items-center gap-2">
              <input type="radio" name="preset" className="accent-[var(--color-brand)]" checked={s.ollamaPreset === k} onChange={() => update({ ollamaPreset: k })} />
              {OLLAMA_PRESETS[k].label}: <code>{OLLAMA_PRESETS[k].model}</code>, {OLLAMA_PRESETS[k].memory}
            </label>
          ))}
        </fieldset>
        <label className="flex items-center gap-2">
          <input type="checkbox" className="size-4 accent-[var(--color-brand)]" checked={s.gestureAnswers} onChange={(e) => update({ gestureAnswers: e.target.checked })} />
          Gesture answers on the patient screen (thumbs up or down, uses the camera)
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => void test()} className="flex items-center gap-1 rounded-lg border border-brand px-3 py-2 font-semibold text-brand-strong hover:bg-brand-soft">
            <Plug size={16} aria-hidden /> {testing ? "Testing" : "Test connection"}
          </button>
          {status ? (
            <span className="text-ink-soft">
              Active: <strong>{status.active === "mock" ? "Demo" : status.active === "anthropic" ? `Cloud (${status.anthropicModel})` : `On-device (${status.ollamaModel})`}</strong>
              {status.demoMode ? " (DEMO_MODE is on)" : ""}
              {status.note ? `. ${status.note}.` : ""}
            </span>
          ) : null}
        </div>
        {status?.ollama ? (
          <div className="rounded-lg bg-canvas p-3">
            <p className="flex items-center gap-2">
              {status.ollama.reachable ? <CircleCheck size={16} className="text-ok" aria-hidden /> : <CircleX size={16} className="text-critical" aria-hidden />}
              Ollama at <code>{status.ollamaBaseUrl}</code>: {status.ollama.reachable ? "running" : (status.ollama.error ?? "not reachable")}
            </p>
            {status.ollama.reachable ? (
              <p className="mt-1 flex items-center gap-2">
                {status.ollama.installed ? <CircleCheck size={16} className="text-ok" aria-hidden /> : <CircleX size={16} className="text-critical" aria-hidden />}
                <code>{status.ollamaModel}</code> {status.ollama.installed ? "is installed" : `is not installed. Run: ollama pull ${status.ollamaModel}`}
              </p>
            ) : (
              <p className="mt-1 text-ink-soft">Without Ollama the app falls back to keyword matching and says so in the provider badge.</p>
            )}
          </div>
        ) : null}
      </div>
    </details>
  );
}
