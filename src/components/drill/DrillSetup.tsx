"use client";

import { ExternalLink, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ARM_LABEL, DRILL_SCENARIOS, loadDrills, saveDrill, suggestNext, type DrillArm, type DrillRun } from "@/lib/drill";
import { makeSessionId, rememberCurrentSession } from "@/lib/sessionId";
import { card, DrillPage, fieldLabel, input, primaryButton, scenarioLanguage, secondaryButton } from "./ui";

const ARM_HELP: Record<DrillArm, string> = {
  firstwords: "The EMT runs the assessment on the FirstWords console. The role-player answers on the patient screen.",
  usual: "The EMT does what they would do today (gestures, a phone translator, pointing). A stopwatch records when each fact came out.",
};

/** Sets up one drill run: who, which arm, which role-played patient. */
export function DrillSetup() {
  const router = useRouter();
  const [runs, setRuns] = useState<DrillRun[]>([]);
  const [tester, setTester] = useState("");
  const [arm, setArm] = useState<DrillArm | null>(null);
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<{ run: DrillRun; sessionId: string } | null>(null);

  useEffect(() => {
    // localStorage is only readable after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRuns(loadDrills());
  }, []);

  const suggestion = tester.trim() ? suggestNext(runs, tester) : null;
  const chosenArm = arm ?? suggestion?.arm ?? null;
  const ready = !!tester.trim() && !!chosenArm && !!scenarioId;

  const prepare = () => {
    if (!tester.trim() || !chosenArm || !scenarioId) return;
    const sessionId = makeSessionId();
    const run: DrillRun = { id: `drill-${Date.now().toString(36)}`, tester: tester.trim(), arm: chosenArm, scenarioId, createdAt: Date.now(), sessionId };
    saveDrill(run);
    if (run.arm === "usual") {
      router.push(`/drill/usual?run=${run.id}`);
      return;
    }
    rememberCurrentSession(sessionId);
    setPrepared({ run, sessionId });
  };

  const openPatient = () => prepared && window.open(`/patient?s=${prepared.sessionId}`, `patient-${prepared.sessionId}`, "noopener");
  const start = () => prepared && router.push(`/emt?s=${prepared.sessionId}&scenario=${prepared.run.scenarioId}&drill=${prepared.run.id}`);

  if (prepared) {
    const sc = DRILL_SCENARIOS.find((s) => s.id === prepared.run.scenarioId);
    return (
      <DrillPage title="Ready to start" intro={`Tester ${prepared.run.tester}, FirstWords, ${sc?.title ?? prepared.run.scenarioId}.`}>
        <ol className={`${card} flex list-decimal flex-col gap-3 ps-10 text-lg`}>
          <li>
            Open the patient window and put it in front of the role-player. A second monitor works, or an iPad as a second display (Sidecar on a Mac). It has to be a window of this browser on this laptop.
            <div className="mt-2">
              <button type="button" onClick={openPatient} className={`${secondaryButton} flex items-center gap-2`}>
                <ExternalLink size={18} aria-hidden /> Open patient window
              </button>
            </div>
          </li>
          <li>
            Give the role-player their card: <code className="text-base">testing/patient-cards/{prepared.run.scenarioId}.md</code>
          </li>
          <li>The clock starts when the console opens. The EMT presses Finish drill when they would hand off.</li>
        </ol>
        <div className="flex gap-3">
          <button type="button" onClick={start} className={`${primaryButton} flex items-center gap-2`}>
            <Play size={18} aria-hidden /> Start drill
          </button>
          <button type="button" onClick={() => setPrepared(null)} className={secondaryButton}>
            Back
          </button>
        </div>
      </DrillPage>
    );
  }

  return (
    <DrillPage
      title="Field test with Tulane EMS"
      intro="Each EMT runs two role-played patients: one with FirstWords and one their usual way, in alternating order. We compare how fast and how accurately the key facts come out. Only timings and the EMT's survey answers are saved, on this laptop. No real patient information is used."
    >
      <section className={`${card} flex flex-col gap-4`}>
        <label className={fieldLabel}>
          Tester code (initials or a number, never a name)
          <input className={`${input} max-w-xs`} value={tester} onChange={(e) => setTester(e.target.value)} placeholder="E3" />
        </label>
        {suggestion ? (
          <p className="text-sm text-ink-soft">
            Suggested next for {tester.trim()}: <span className="font-semibold text-ink">{ARM_LABEL[suggestion.arm]}</span>
            {suggestion.avoidScenarios.length ? ", with a patient they have not seen yet." : "."}
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Method</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {(["firstwords", "usual"] as const).map((a) => (
            <button
              key={a}
              type="button"
              aria-pressed={chosenArm === a}
              onClick={() => setArm(a)}
              className={`flex flex-col items-start gap-1 rounded-2xl border-2 p-4 text-start ${chosenArm === a ? "border-brand bg-brand-soft" : "border-line bg-surface hover:border-brand"}`}
            >
              <span className="text-lg font-semibold">{ARM_LABEL[a]}</span>
              <span className="text-sm text-ink-soft">{ARM_HELP[a]}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Role-played patient</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {DRILL_SCENARIOS.map((s) => {
            const seen = suggestion?.avoidScenarios.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={scenarioId === s.id}
                onClick={() => setScenarioId(s.id)}
                className={`flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-start ${scenarioId === s.id ? "border-brand bg-brand-soft" : "border-line bg-surface hover:border-brand"}`}
              >
                <span className="rounded-full bg-canvas px-2 py-0.5 text-xs font-semibold text-ink-soft">{scenarioLanguage(s)}</span>
                <span className="font-semibold leading-tight">{s.title}</span>
                {seen ? <span className="text-xs font-semibold text-warning">This tester has run it already</span> : null}
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={prepare} disabled={!ready} className={primaryButton}>
          {chosenArm === "usual" ? "Start usual-method drill" : "Prepare FirstWords drill"}
        </button>
        <span className="text-sm text-ink-soft">{runs.filter((r) => r.metrics).length} finished runs on this laptop</span>
      </div>
    </DrillPage>
  );
}
