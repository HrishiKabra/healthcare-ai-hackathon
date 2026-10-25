"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ARM_LABEL, DRILL_SCENARIOS, getDrill, saveDrill, SUS_ITEMS, type DrillRun, type DrillSurvey } from "@/lib/drill";
import { card, DrillPage, fieldLabel, fmtSecs, input, primaryButton } from "./ui";

const AGREE = ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"];

function Scale({ name, value, onChange, low, high }: { name: string; value: number | undefined; onChange: (v: number) => void; low: string; high: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-28 text-xs text-ink-soft">{low}</span>
      {[1, 2, 3, 4, 5].map((v) => (
        <label key={v} className={`flex size-11 cursor-pointer items-center justify-center rounded-lg border-2 font-semibold ${value === v ? "border-brand bg-brand text-white" : "border-line bg-surface hover:border-brand"}`}>
          <input type="radio" name={name} value={v} checked={value === v} onChange={() => onChange(v)} className="sr-only" />
          {v}
        </label>
      ))}
      <span className="w-28 text-xs text-ink-soft">{high}</span>
    </div>
  );
}

/** The EMT's survey after a run. Full SUS after FirstWords; a short version after the usual method. */
export function DrillSurveyForm({ runId }: { runId: string | null }) {
  const router = useRouter();
  const [run, setRun] = useState<DrillRun | null>(null);
  const [sus, setSus] = useState<(number | undefined)[]>(Array(10).fill(undefined));
  const [s, setS] = useState<DrillSurvey>({});
  useEffect(() => {
    // localStorage is only readable after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRun(getDrill(runId) ?? null);
  }, [runId]);

  if (!run) {
    return (
      <DrillPage title="No drill selected">
        <p>Set up a run on the field test page first.</p>
      </DrillPage>
    );
  }
  const fw = run.arm === "firstwords";
  const m = run.metrics;
  const susDone = sus.every((v) => v != null);

  const save = () => {
    const survey: DrillSurvey = { ...s, ...(fw && susDone ? { sus: sus as number[] } : {}) };
    saveDrill({ ...run, survey });
    router.push("/drill/results");
  };

  return (
    <DrillPage title={`Survey: ${ARM_LABEL[run.arm]}`} intro={`Tester ${run.tester}, ${DRILL_SCENARIOS.find((x) => x.id === run.scenarioId)?.title ?? run.scenarioId}. Hand the laptop to the EMT.`}>
      {m ? (
        <section className={`${card} flex flex-wrap gap-x-8 gap-y-2`}>
          <p>
            <span className="text-sm text-ink-soft">Time</span> <span className="block text-2xl font-semibold">{fmtSecs(m.totalSeconds)}</span>
          </p>
          <p>
            <span className="text-sm text-ink-soft">Key facts correct</span>{" "}
            <span className="block text-2xl font-semibold">
              {m.accuracy.correct} of {m.accuracy.total}
            </span>
          </p>
          <p>
            <span className="text-sm text-ink-soft">Red flag</span> <span className="block text-2xl font-semibold">{m.flagRecognized ? `Found at ${fmtSecs(m.flagSeconds)}` : "Missed"}</span>
          </p>
          {fw ? (
            <p>
              <span className="text-sm text-ink-soft">Misunderstandings caught</span> <span className="block text-2xl font-semibold">{m.rejected}</span>
            </p>
          ) : null}
        </section>
      ) : null}

      {fw ? (
        <section className={`${card} flex flex-col gap-4`}>
          <h2 className="text-lg font-semibold">How much do you agree?</h2>
          {SUS_ITEMS.map((item, i) => (
            <fieldset key={item} className="flex flex-col gap-2 border-b border-line pb-3 last:border-0">
              <legend className="mb-2 font-medium">
                {i + 1}. {item}
              </legend>
              <Scale name={`sus-${i}`} value={sus[i]} onChange={(v) => setSus((x) => x.map((y, j) => (j === i ? v : y)))} low={AGREE[0]} high={AGREE[4]} />
            </fieldset>
          ))}
        </section>
      ) : null}

      <section className={`${card} flex flex-col gap-4`}>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-medium">How confident are you that the information you got was correct?</legend>
          <Scale name="confidence" value={s.confidence} onChange={(v) => setS((x) => ({ ...x, confidence: v }))} low="Not at all" high="Completely" />
        </fieldset>
        {fw ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 font-medium">Would you use FirstWords on a real call?</legend>
            <div className="flex gap-2">
              {(["yes", "maybe", "no"] as const).map((v) => (
                <label key={v} className={`cursor-pointer rounded-lg border-2 px-4 py-2 font-semibold capitalize ${s.wouldUse === v ? "border-brand bg-brand text-white" : "border-line bg-surface hover:border-brand"}`}>
                  <input type="radio" name="wouldUse" className="sr-only" checked={s.wouldUse === v} onChange={() => setS((x) => ({ ...x, wouldUse: v }))} />
                  {v}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}
        <label className={fieldLabel}>
          {fw ? "What is missing, or what would you change?" : "What was hardest about this call?"}
          <textarea className={`${input} h-24 py-2`} value={s.missing ?? ""} onChange={(e) => setS((x) => ({ ...x, missing: e.target.value }))} />
        </label>
        {fw ? (
          <label className={fieldLabel}>
            Did anything worry you, for patient safety or otherwise?
            <textarea className={`${input} h-24 py-2`} value={s.worried ?? ""} onChange={(e) => setS((x) => ({ ...x, worried: e.target.value }))} />
          </label>
        ) : null}
      </section>

      <div className="flex items-center gap-3">
        <button type="button" onClick={save} className={primaryButton}>
          Save survey
        </button>
        {fw && !susDone ? <span className="text-sm text-ink-soft">The usability score is saved only when all 10 statements are answered.</span> : null}
      </div>
    </DrillPage>
  );
}
