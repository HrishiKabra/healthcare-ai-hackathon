"use client";

import { CircleCheck, CircleDashed, TriangleAlert } from "lucide-react";
import { chartRows, englishValue } from "@/lib/chartView";
import { getLanguage } from "@/lib/languages";
import { getQuestion } from "@/lib/questions";
import type { Answer, ChartValue, ClinicalChart } from "@/lib/schemas";
import type { FreeformQuestion } from "@/lib/session";

const SOURCE_LABEL: Record<Answer["source"], string> = {
  structured: "tapped",
  mock: "Demo AI",
  baseline: "keyword match",
  anthropic: "Cloud AI",
  ollama: "On-device AI",
  emt: "EMT observation",
};

const CONF: Record<ChartValue<unknown>["confidence"], string> = {
  high: "bg-ok-soft text-ok",
  medium: "bg-warning-soft text-warning",
  low: "bg-critical-soft text-critical",
};

function sourceText(cv: ChartValue<unknown>, answers: Map<string, Answer>, freeform: FreeformQuestion[]): string {
  const a = answers.get(cv.sourceAnswerId);
  const q = getQuestion(cv.sourceQuestionId)?.english ?? freeform.find((f) => f.id === cv.sourceQuestionId)?.english ?? "";
  if (!a) return q;
  if (a.value.kind === "free") {
    const lang = getLanguage(a.language).englishName;
    return `"${a.value.text}" (${lang}, ${SOURCE_LABEL[a.source]})${a.value.english && a.language !== "en" ? `, meaning "${a.value.english}"` : ""}`;
  }
  return `${SOURCE_LABEL[a.source]}, answering "${q}"`;
}

export function LiveChart({ chart, answers, freeform }: { chart: ClinicalChart; answers: Answer[]; freeform: FreeformQuestion[] }) {
  const byId = new Map(answers.map((a) => [a.id, a]));
  const rows = chartRows(chart);
  const filled = rows.filter((r) => r.values.length);
  const empty = rows.filter((r) => !r.values.length);

  return (
    <section aria-label="Live chart" className="flex min-h-0 flex-col">
      <div className="flex items-center justify-between pb-2">
        <h2 className="text-base font-semibold">Live chart</h2>
        <div className="flex items-center gap-3 text-xs text-ink-soft">
          <span className="flex items-center gap-1">
            <CircleCheck size={14} className="text-ok" aria-hidden /> Confirmed by patient
          </span>
          <span className="flex items-center gap-1">
            <CircleDashed size={14} className="text-unconfirmed" aria-hidden /> Unconfirmed
          </span>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pe-1">
        {!filled.length ? <p className="rounded-xl border border-dashed border-line bg-surface p-4 text-sm text-ink-soft">The chart fills in as the patient answers. Pick a mode, then send the first question.</p> : null}
        <dl className="flex flex-col gap-2">
          {filled.map((r) => (
            <div key={r.field} className={`rounded-xl border bg-surface px-3 py-2 ${r.conflict ? "border-warning" : "border-line"}`}>
              <dt className="flex items-center gap-2 text-xs font-semibold text-ink-soft">
                {r.label}
                {r.conflict ? (
                  <span className="flex items-center gap-1 rounded bg-warning-soft px-1.5 py-0.5 text-warning">
                    <TriangleAlert size={12} aria-hidden /> Conflicting answers
                  </span>
                ) : null}
              </dt>
              {r.values.map((cv) => (
                <dd
                  key={`${cv.sourceAnswerId}-${JSON.stringify(cv.value)}`}
                  className={`mt-1 rounded-lg px-2 py-1 ${cv.confirmed ? "" : "border border-dashed border-unconfirmed bg-unconfirmed-soft"}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {cv.confirmed ? <CircleCheck size={16} className="text-ok" aria-label="Confirmed" /> : <CircleDashed size={16} className="text-unconfirmed" aria-label="Unconfirmed" />}
                    <span className="font-semibold">{englishValue(r.field, cv.value)}</span>
                    <span className={`rounded px-1.5 text-[11px] font-semibold ${CONF[cv.confidence]}`}>{cv.confidence} confidence</span>
                    {!cv.confirmed ? <span className="text-[11px] font-semibold text-unconfirmed">Not confirmed</span> : null}
                  </div>
                  <p className="mt-0.5 text-xs text-muted">Source: {sourceText(cv, byId, freeform)}</p>
                </dd>
              ))}
            </div>
          ))}
        </dl>
        {empty.length && filled.length ? <p className="mt-3 text-xs text-muted">Not yet answered: {empty.map((r) => r.label).join(", ")}</p> : null}
      </div>
    </section>
  );
}
