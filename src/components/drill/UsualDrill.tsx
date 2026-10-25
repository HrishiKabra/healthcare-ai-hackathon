"use client";

import { Check, Play, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatElapsed } from "@/components/emt/SessionTimer";
import { useNow } from "@/hooks/useNow";
import { DRILL_FACTS, DRILL_SCENARIOS, FACT_LABEL, getDrill, saveDrill, usualMetrics, type DrillFact, type DrillRun, type UsualRecord, type UsualTimes } from "@/lib/drill";
import { t } from "@/lib/i18n";
import { requireQuestion } from "@/lib/questions";
import { RULES } from "@/lib/rules";
import { DurationBucket } from "@/lib/schemas";
import { card, DrillPage, fieldLabel, input, primaryButton, secondaryButton } from "./ui";

const EMPTY: UsualRecord = { chiefComplaint: null, onset: null, severity: null, headStrike: null, medications: "", noMedications: false, allergies: "", noAllergies: false, redFlag: null };
const KEYS: (DrillFact | "flag")[] = [...DRILL_FACTS, "flag"];
const PRESS_LABEL: Record<DrillFact | "flag", string> = {
  complaint: "Got the chief complaint",
  onset: "Got when it started",
  allergies: "Got allergies",
  medications: "Got medications",
  flag: "Spotted the red flag",
};

type Phase = "ready" | "running" | "record";

/** The usual-method arm: a stopwatch while the EMT works, then what they wrote down. */
export function UsualDrill({ runId }: { runId: string | null }) {
  const router = useRouter();
  const now = useNow(500);
  const [run, setRun] = useState<DrillRun | null>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [startedAt, setStartedAt] = useState(0);
  const [finishedAt, setFinishedAt] = useState(0);
  const [times, setTimes] = useState<UsualTimes>({});
  const [interpreter, setInterpreter] = useState(false);
  const [rec, setRec] = useState<UsualRecord>(EMPTY);

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
  const sc = DRILL_SCENARIOS.find((s) => s.id === run.scenarioId);
  const cc = requireQuestion("chief_complaint");
  const set = (patch: Partial<UsualRecord>) => setRec((r) => ({ ...r, ...patch }));

  const save = () => {
    const metrics = usualMetrics({ scenarioId: run.scenarioId, startedAt, finishedAt, times, record: rec, neededInterpreter: interpreter });
    saveDrill({ ...run, metrics });
    router.push(`/drill/survey?run=${run.id}`);
  };

  if (phase === "ready") {
    return (
      <DrillPage title="Usual method" intro={`Tester ${run.tester}, ${sc?.title ?? run.scenarioId}. The EMT works the way they would today: gestures, pointing, a phone translator, anything but FirstWords.`}>
        <div className={`${card} flex flex-col gap-3 text-lg`}>
          <p>The facilitator runs this screen and taps each button the moment the EMT has that fact. The EMT says &quot;done&quot; when they would hand off.</p>
          <p className="text-base text-ink-soft">
            Role-player card: <code>testing/patient-cards/{run.scenarioId}.md</code>
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setStartedAt(Date.now());
            setPhase("running");
          }}
          className={`${primaryButton} flex w-fit items-center gap-2`}
        >
          <Play size={18} aria-hidden /> Start the clock
        </button>
      </DrillPage>
    );
  }

  if (phase === "running") {
    return (
      <DrillPage title="Usual method: running">
        <p className="font-mono text-6xl font-bold tabular-nums">{formatElapsed(now - startedAt)}</p>
        <div className="grid gap-3 md:grid-cols-2">
          {KEYS.map((k) => {
            const at = times[k];
            return (
              <div key={k} className="flex gap-2">
                <button
                  type="button"
                  disabled={at != null}
                  onClick={() => setTimes((x) => ({ ...x, [k]: Date.now() }))}
                  className={`flex min-h-20 flex-1 items-center justify-between rounded-2xl border-2 px-5 text-start text-xl font-semibold ${at != null ? "border-ok bg-ok-soft text-ok" : "border-brand bg-surface hover:bg-brand-soft"}`}
                >
                  {PRESS_LABEL[k]}
                  {at != null ? (
                    <span className="flex items-center gap-1 font-mono text-lg tabular-nums">
                      <Check size={20} aria-hidden /> {formatElapsed(at - startedAt)}
                    </span>
                  ) : null}
                </button>
                {at != null ? (
                  <button type="button" aria-label={`Undo ${FACT_LABEL[k]}`} onClick={() => setTimes((x) => ({ ...x, [k]: undefined }))} className="rounded-2xl border border-line px-3 text-ink-soft hover:border-brand">
                    <Undo2 size={18} aria-hidden />
                  </button>
                ) : null}
              </div>
            );
          })}
          <button
            type="button"
            aria-pressed={interpreter}
            onClick={() => setInterpreter((v) => !v)}
            className={`min-h-20 rounded-2xl border-2 px-5 text-start text-xl font-semibold ${interpreter ? "border-warning bg-warning-soft text-warning" : "border-line bg-surface hover:border-warning"}`}
          >
            {interpreter ? "Needed an interpreter or gave up (marked)" : "Needed an interpreter or gave up"}
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            setFinishedAt(Date.now());
            setPhase("record");
          }}
          className={`${primaryButton} w-fit`}
        >
          EMT is done: stop the clock
        </button>
      </DrillPage>
    );
  }

  return (
    <DrillPage title="What did the EMT record?" intro={`Stopped at ${formatElapsed(finishedAt - startedAt)}. Ask the EMT for what they would hand off, and enter only what they actually found out.`}>
      <div className={`${card} grid gap-4 md:grid-cols-2`}>
        <label className={fieldLabel}>
          Chief complaint
          <select className={input} value={rec.chiefComplaint ?? ""} onChange={(e) => set({ chiefComplaint: e.target.value || null })}>
            <option value="">Could not find out</option>
            {cc.choices.map((c) => (
              <option key={c.id} value={c.id}>
                {c.english}
              </option>
            ))}
          </select>
        </label>
        <label className={fieldLabel}>
          When it started
          <select className={input} value={rec.onset ?? ""} onChange={(e) => set({ onset: (e.target.value || null) as UsualRecord["onset"] })}>
            <option value="">Could not find out</option>
            {DurationBucket.options
              .filter((b) => b !== "unknown")
              .map((b) => (
                <option key={b} value={b}>
                  {t(`duration.${b}`, "en")}
                </option>
              ))}
          </select>
        </label>
        <label className={fieldLabel}>
          Pain score
          <select className={input} value={rec.severity ?? ""} onChange={(e) => set({ severity: e.target.value === "" ? null : Number(e.target.value) })}>
            <option value="">Could not find out</option>
            {Array.from({ length: 11 }, (_, i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </label>
        <label className={fieldLabel}>
          Hit their head?
          <select className={input} value={rec.headStrike ?? ""} onChange={(e) => set({ headStrike: (e.target.value || null) as UsualRecord["headStrike"] })}>
            <option value="">Could not find out or not asked</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
        <div className={fieldLabel}>
          Medications (as the EMT understood them)
          <input className={input} value={rec.medications} disabled={rec.noMedications} onChange={(e) => set({ medications: e.target.value })} placeholder="Names or what they are for" />
          <label className="flex items-center gap-2 font-normal">
            <input type="checkbox" checked={rec.noMedications} onChange={(e) => set({ noMedications: e.target.checked })} /> Takes no medications
          </label>
        </div>
        <div className={fieldLabel}>
          Allergies
          <input className={input} value={rec.allergies} disabled={rec.noAllergies} onChange={(e) => set({ allergies: e.target.value })} placeholder="What they are allergic to" />
          <label className="flex items-center gap-2 font-normal">
            <input type="checkbox" checked={rec.noAllergies} onChange={(e) => set({ noAllergies: e.target.checked })} /> No allergies
          </label>
        </div>
        <label className={`${fieldLabel} md:col-span-2`}>
          Red flag the EMT would report
          <select className={input} value={rec.redFlag ?? ""} onChange={(e) => set({ redFlag: e.target.value || null })}>
            <option value="">None</option>
            {RULES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={save} className={primaryButton}>
          Save and go to the survey
        </button>
        <button type="button" onClick={() => setPhase("running")} className={secondaryButton}>
          Back to the clock
        </button>
      </div>
    </DrillPage>
  );
}
