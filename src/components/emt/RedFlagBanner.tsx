"use client";

import { Check, ShieldAlert, TriangleAlert } from "lucide-react";
import type { RedFlag } from "@/lib/schemas";

/**
 * Sticky red flags. Every flag shows the rule that fired and the facts behind
 * it. Acknowledging shrinks a flag but never removes it.
 */
export function RedFlagBanner({
  flags,
  acknowledged,
  onAck,
  explanations,
}: {
  flags: RedFlag[];
  acknowledged: string[];
  onAck: (ruleId: string) => void;
  explanations?: Record<string, string>;
}) {
  if (!flags.length) return null;
  return (
    <section aria-label="Red flags" aria-live="assertive" className="sticky top-0 z-20 flex flex-col gap-2 border-b border-line bg-canvas/95 px-4 py-3 backdrop-blur">
      {flags.map((f) => {
        const acked = acknowledged.includes(f.ruleId);
        const critical = f.severity === "critical";
        const tone = critical ? "border-critical bg-critical-soft" : "border-warning bg-warning-soft";
        const ink = critical ? "text-critical" : "text-warning";
        const Glyph = critical ? ShieldAlert : TriangleAlert;
        return (
          <article key={f.ruleId} className={`flag-in rounded-xl border-s-8 border ${tone} px-4 ${acked ? "py-2" : "py-3"}`}>
            <div className="flex items-start gap-3">
              <Glyph size={acked ? 20 : 26} className={`mt-0.5 shrink-0 ${ink}`} aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className={`font-bold ${ink} ${acked ? "text-base" : "text-lg"}`}>{f.title}</h3>
                  {f.basedOnUnconfirmed ? (
                    <span className="rounded-full border border-dashed border-unconfirmed bg-unconfirmed-soft px-2 text-xs font-semibold text-unconfirmed">Based on unconfirmed answer</span>
                  ) : null}
                  {acked ? <span className="text-xs font-medium text-ink-soft">Acknowledged</span> : null}
                </div>
                {!acked ? (
                  <>
                    <p className="mt-1 text-sm text-ink-soft">
                      <span className="font-semibold text-ink">Rule {f.number}:</span> {f.rule}
                    </p>
                    <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm">
                      {f.facts.map((fact, i) => (
                        <li key={i} className={fact.confirmed ? "" : "italic text-unconfirmed"}>
                          <span className="font-medium">{fact.label}:</span> {fact.value}
                          {fact.confirmed ? "" : " (unconfirmed)"}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1 text-sm text-ink">{explanations?.[f.ruleId] ?? f.explanation}</p>
                  </>
                ) : null}
              </div>
              {!acked ? (
                <button
                  type="button"
                  onClick={() => onAck(f.ruleId)}
                  className="flex shrink-0 items-center gap-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold hover:border-brand"
                >
                  <Check size={16} aria-hidden /> Acknowledge
                </button>
              ) : null}
            </div>
          </article>
        );
      })}
    </section>
  );
}
