"use client";

import { Play } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ProviderBadge } from "@/components/shared/ProviderBadge";
import { apiCalls } from "@/lib/ai/client";
import { EVAL_CASES, baselineCalls, pct, runEval, type EvalRun } from "@/lib/eval";
import { getLanguage } from "@/lib/languages";
import { RULES } from "@/lib/rules";
import type { LangCode } from "@/lib/schemas";

const flagList = (ids: string[]) => (ids.length ? ids.map((id) => `R${RULES.find((r) => r.id === id)?.number ?? id}`).join(", ") : "none");

/** Runs the eval cases in the browser: the selected provider through the API, and the keyword baseline locally. */
export function EvalRunner() {
  const [baseline, setBaseline] = useState<EvalRun | null>(null);
  const [model, setModel] = useState<EvalRun | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setError(null);
    setModel(null);
    try {
      setProgress("Keyword baseline");
      setBaseline(await runEval(baselineCalls));
      const m = await runEval(apiCalls, undefined, (i) => setProgress(`Model: case ${i + 1} of ${EVAL_CASES.length}`));
      setModel(m);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eval failed");
    } finally {
      setProgress(null);
    }
  };

  const used = model?.metas[0];
  const fallbacks = model?.metas.filter((m) => m.fallbackReason).length ?? 0;
  const mockOnly = model ? model.metas.every((m) => m.provider === "mock") : false;
  const metrics: [string, (r: EvalRun) => string][] = [
    ["Field accuracy", (r) => pct(r.summary.fieldAccuracy)],
    ["Red flag recall", (r) => pct(r.summary.flagRecall)],
    ["Red flag precision", (r) => pct(r.summary.flagPrecision)],
    ["Medication class accuracy", (r) => pct(r.summary.medAccuracy)],
    ["Allergy category accuracy", (r) => pct(r.summary.allergyAccuracy)],
    ["Seconds per call", (r) => r.summary.secondsPerCall.toFixed(2)],
  ];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Keyword matching vs. AI</h1>
          <p className="mt-1 max-w-[70ch] text-ink-soft">
            {EVAL_CASES.length} scripted cases in five languages plus ASL, mostly free answers in everyday words. Both columns use the same deterministic red-flag rules; only the reading of free answers differs.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ProviderBadge />
          <button type="button" onClick={() => void run()} disabled={!!progress} className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2 font-semibold text-white disabled:opacity-50">
            <Play size={18} aria-hidden /> {progress ? progress : "Run eval"}
          </button>
        </div>
      </header>

      {mockOnly ? (
        <p className="rounded-xl border border-signal bg-signal-soft p-3 text-sm">
          <strong>Demo mode.</strong> The AI column replays canned responses written for these cases, so it checks the pipeline, not a model. Switch the provider in{" "}
          <Link href="/" className="font-semibold underline">
            AI settings
          </Link>{" "}
          to measure on-device or cloud.
        </p>
      ) : null}
      {fallbacks ? <p className="rounded-xl bg-warning-soft p-3 text-sm text-warning">{fallbacks} AI calls failed and fell back to keyword matching.</p> : null}
      {error ? <p className="rounded-xl bg-critical-soft p-3 text-sm text-critical">{error}</p> : null}

      {baseline && model ? (
        <>
          <table className="w-full overflow-hidden rounded-xl border border-line bg-surface text-sm">
            <thead className="bg-canvas text-start">
              <tr>
                <th className="p-2 text-start">Metric</th>
                <th className="p-2 text-end">Keyword baseline</th>
                <th className="p-2 text-end">
                  AI ({used?.provider}, {used?.model})
                </th>
              </tr>
            </thead>
            <tbody>
              {metrics.map(([name, f]) => (
                <tr key={name} className="border-t border-line">
                  <td className="p-2">{name}</td>
                  <td className="p-2 text-end tabular-nums">{f(baseline)}</td>
                  <td className="p-2 text-end font-semibold tabular-nums">{f(model)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <table className="w-full overflow-hidden rounded-xl border border-line bg-surface text-sm">
            <thead className="bg-canvas">
              <tr>
                <th className="p-2 text-start">Case</th>
                <th className="p-2 text-start">Language</th>
                <th className="p-2 text-end">Fields, baseline</th>
                <th className="p-2 text-end">Fields, AI</th>
                <th className="p-2 text-start">Gold flags</th>
                <th className="p-2 text-start">Baseline flags</th>
                <th className="p-2 text-start">AI flags</th>
              </tr>
            </thead>
            <tbody>
              {EVAL_CASES.map((c, i) => {
                const b = baseline.scores[i];
                const m = model.scores[i];
                const lang = m.language === "ASL" ? "ASL" : getLanguage(m.language as LangCode).englishName;
                return (
                  <tr key={c.id} className="border-t border-line">
                    <td className="p-2">{c.title}</td>
                    <td className="p-2">{lang}</td>
                    <td className="p-2 text-end tabular-nums">
                      {b.fields.correct}/{b.fields.total}
                    </td>
                    <td className="p-2 text-end tabular-nums">
                      {m.fields.correct}/{m.fields.total}
                    </td>
                    <td className="p-2">{flagList(c.gold.flags)}</td>
                    <td className={`p-2 ${b.flags.fn || b.flags.fp ? "font-semibold text-critical" : ""}`}>{flagList(b.flags.got)}</td>
                    <td className={`p-2 ${m.flags.fn || m.flags.fp ? "font-semibold text-critical" : ""}`}>{flagList(m.flags.got)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      ) : !progress ? (
        <p className="text-ink-soft">Press Run eval. The keyword baseline runs in this browser; the AI column calls this app&apos;s API with the provider from AI settings.</p>
      ) : null}
    </main>
  );
}
