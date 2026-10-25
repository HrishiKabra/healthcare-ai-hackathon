"use client";

import { Download, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ARM_LABEL, clearDrills, deleteDrill, DRILL_FACTS, DRILL_SCENARIOS, drillsCsv, FACT_LABEL, loadDrills, summarizeDrills, susScore, type ArmSummary, type DrillRun } from "@/lib/drill";
import { DrillChart } from "./DrillChart";
import { card, DrillPage, fmtSecs, secondaryButton } from "./ui";

const pct = (x: number | null) => (x == null ? "No runs" : `${Math.round(x * 100)}%`);

function download(name: string, type: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function SummaryTable({ summary }: { summary: ArmSummary[] }) {
  const rows: [string, (s: ArmSummary) => string][] = [
    ["Runs", (s) => String(s.n)],
    ["Median time on scene", (s) => (s.medianTotal == null ? "No runs" : fmtSecs(s.medianTotal))],
    ...DRILL_FACTS.map((f): [string, (s: ArmSummary) => string] => [
      `Time to ${FACT_LABEL[f].toLowerCase()}`,
      (s) => (s.n ? `${fmtSecs(s.medianFact[f])} (got it in ${pct(s.obtained[f])})` : "No runs"),
    ]),
    ["Key facts correct", (s) => pct(s.accuracy)],
    ["Red flag found", (s) => pct(s.flagRecognized)],
    ["Time to red flag", (s) => (s.n ? fmtSecs(s.medianFact.flag) : "No runs")],
    ["Misunderstandings caught at confirm-back", (s) => (s.arm === "firstwords" ? String(s.misunderstandingsCaught) : "Not measured")],
    ["Needed an interpreter or gave up", (s) => (s.arm === "usual" ? `${s.neededInterpreter} of ${s.n}` : "Not measured")],
    ["EMT confidence in the information (1 to 5)", (s) => (s.meanConfidence == null ? "No surveys" : s.meanConfidence.toFixed(1))],
    ["Usability (SUS, 0 to 100)", (s) => (s.meanSus == null ? "No surveys" : `${Math.round(s.meanSus)} (n=${s.susN})`)],
  ];
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-line">
          <th className="py-2 pe-4 font-semibold">Median or share across runs</th>
          {summary.map((s) => (
            <th key={s.arm} className="py-2 pe-4 font-semibold">
              {ARM_LABEL[s.arm]}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, f]) => (
          <tr key={label} className="border-b border-line last:border-0">
            <td className="py-2 pe-4 text-ink-soft">{label}</td>
            {summary.map((s) => (
              <td key={s.arm} className="py-2 pe-4 font-medium tabular-nums">
                {f(s)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Field-test results: the head-to-head numbers, what EMTs said, and every run, with export. */
export function DrillResults() {
  const [runs, setRuns] = useState<DrillRun[]>([]);
  useEffect(() => {
    // localStorage is only readable after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRuns(loadDrills());
  }, []);

  const done = runs.filter((r) => r.metrics);
  const summary = summarizeDrills(done);
  const quotes = done.flatMap((r) => [r.survey?.missing, r.survey?.worried].filter((q): q is string => !!q?.trim()).map((q) => ({ q, r })));
  const remove = (id: string) => {
    deleteDrill(id);
    setRuns(loadDrills());
  };
  const stamp = new Date().toISOString().slice(0, 10);

  return (
    <DrillPage title="Field test results" intro="Role-played patients with Tulane EMS EMTs. Each EMT ran one patient with FirstWords and one their usual way. Small numbers: read these as a pilot, not a study.">
      {!done.length ? (
        <p className={`${card} text-ink-soft`}>No finished runs yet. Start one from the field test page.</p>
      ) : (
        <>
          <section className={card}>
            <SummaryTable summary={summary} />
          </section>
          <section className={card}>
            <DrillChart summary={summary} />
          </section>
          {quotes.length ? (
            <section className={`${card} flex flex-col gap-3`}>
              <h2 className="text-lg font-semibold">What the EMTs said</h2>
              <ul className="flex flex-col gap-2">
                {quotes.map(({ q, r }, i) => (
                  <li key={`${r.id}-${i}`} className="border-s-4 border-line ps-3">
                    &ldquo;{q}&rdquo; <span className="text-sm text-ink-soft">EMT {r.tester}, after {ARM_LABEL[r.arm]}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}

      {runs.length ? (
        <section className={`${card} flex flex-col gap-3 overflow-x-auto`}>
          <h2 className="text-lg font-semibold">Runs</h2>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line">
                {["Tester", "Method", "Patient", "Time", "Facts correct", "Red flag", "SUS", ""].map((h) => (
                  <th key={h} className="py-2 pe-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className="py-2 pe-3">{r.tester}</td>
                  <td className="py-2 pe-3">{ARM_LABEL[r.arm]}</td>
                  <td className="py-2 pe-3">{DRILL_SCENARIOS.find((s) => s.id === r.scenarioId)?.title ?? r.scenarioId}</td>
                  <td className="py-2 pe-3 tabular-nums">{r.metrics ? fmtSecs(r.metrics.totalSeconds) : "Not finished"}</td>
                  <td className="py-2 pe-3 tabular-nums">{r.metrics ? `${r.metrics.accuracy.correct} of ${r.metrics.accuracy.total}` : ""}</td>
                  <td className="py-2 pe-3">{r.metrics ? (r.metrics.flagRecognized ? fmtSecs(r.metrics.flagSeconds) : "Missed") : ""}</td>
                  <td className="py-2 pe-3 tabular-nums">{r.survey?.sus ? susScore(r.survey.sus) : ""}</td>
                  <td className="py-2">
                    <button type="button" aria-label={`Delete run by ${r.tester}`} onClick={() => remove(r.id)} className="text-muted hover:text-critical">
                      <Trash2 size={16} aria-hidden />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => download(`firstwords-field-test-${stamp}.csv`, "text/csv", drillsCsv(runs))} className={`${secondaryButton} flex items-center gap-2 text-sm`}>
              <Download size={16} aria-hidden /> Export CSV
            </button>
            <button type="button" onClick={() => download(`firstwords-field-test-${stamp}.json`, "application/json", JSON.stringify(runs, null, 2))} className={`${secondaryButton} flex items-center gap-2 text-sm`}>
              <Download size={16} aria-hidden /> Export JSON
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Delete every field-test run on this laptop? Export first if you need them.")) {
                  clearDrills();
                  setRuns([]);
                }
              }}
              className="ms-auto rounded-xl border border-critical px-4 py-2 text-sm font-semibold text-critical hover:bg-critical-soft"
            >
              Delete all runs
            </button>
          </div>
        </section>
      ) : null}
    </DrillPage>
  );
}
