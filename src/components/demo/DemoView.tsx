"use client";

import { RotateCcw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { EmtConsole } from "@/components/emt/EmtConsole";
import { ErLive } from "@/components/er/ErLive";
import { PatientLive } from "@/components/patient/PatientLive";
import { useConsoleControls } from "@/hooks/useConsoleControls";
import { useEmtSession } from "@/hooks/useEmtSession";
import { SCENARIOS, getScenario, scenarioSetupEvents } from "@/lib/scenarios";
import { makeSessionId } from "@/lib/sessionId";
import { clearSessionKeys } from "@/lib/storage";
import { AutopilotBar } from "./AutopilotBar";
import { TabletFrame } from "./TabletFrame";

type Pane = "emt" | "patient" | "er";

function DemoSession({ sessionId, scenarioId, onScenario, onRestart }: { sessionId: string; scenarioId: string; onScenario: (id: string) => void; onRestart: () => void }) {
  const session = useEmtSession(sessionId);
  const controls = useConsoleControls(session);
  const { state, dispatch } = session;
  const [pane, setPane] = useState<Pane>("emt");
  const [erOpen, setErOpen] = useState(false);
  const fresh = !state.scenarioId && state.answers.length === 0 && !state.mode;

  useEffect(() => {
    const sc = getScenario(scenarioId);
    if (sc && fresh) scenarioSetupEvents(sc, Date.now()).forEach(dispatch);
  }, [scenarioId, fresh, dispatch]);

  // The ER panel slides in whenever a handoff is sent.
  const sentAt = state.handoffSentAt;
  useEffect(() => {
    if (!sentAt) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setErOpen(true);
    setPane((p) => (p === "emt" ? "er" : p));
  }, [sentAt]);

  const tab = (p: Pane, label: string) => (
    <button key={p} type="button" aria-pressed={pane === p} onClick={() => setPane(p)} className={`flex-1 py-2 text-sm font-semibold ${pane === p ? "bg-ink text-white" : "bg-surface"}`}>
      {label}
    </button>
  );

  return (
    <div className="flex h-[calc(100dvh-37px)] min-h-[560px] flex-col">
      <AutopilotBar ap={controls.ap} autoAdvance={controls.autoAdvance} onAutoAdvance={controls.setAutoAdvance}>
        <select value={scenarioId} onChange={(e) => onScenario(e.target.value)} className="rounded-lg border border-ink/20 bg-surface px-2 py-1.5 font-semibold" aria-label="Scenario">
          {[
            { label: "Demo scenarios", list: SCENARIOS.filter((s) => s.setting !== "campus") },
            { label: "Tulane campus", list: SCENARIOS.filter((s) => s.setting === "campus") },
          ].map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.list.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <button type="button" onClick={onRestart} className="flex items-center gap-1 rounded-lg border border-ink/20 bg-surface px-2 py-1.5" title="Start this scenario over">
          <RotateCcw size={14} aria-hidden /> Restart
        </button>
      </AutopilotBar>
      <div className="flex border-b border-line min-[900px]:hidden" role="tablist">
        {tab("emt", "EMT")}
        {tab("patient", "Patient")}
        {tab("er", "ER")}
      </div>

      <div className="relative flex min-h-0 flex-1">
        <div className={`min-h-0 min-w-0 flex-1 flex-col overflow-y-auto min-[900px]:flex ${pane === "emt" ? "flex" : "hidden"}`}>
          <EmtConsole session={session} embedded controls={controls} onEnded={onRestart} />
        </div>
        <div className={`min-h-0 flex-col bg-[#dfe5ec] p-4 min-[900px]:flex min-[900px]:w-[44%] ${pane === "patient" ? "flex w-full" : "hidden"}`}>
          <p className="mb-2 text-center text-xs font-semibold text-ink-soft">Patient tablet</p>
          <div className="min-h-0 flex-1">
            <TabletFrame>
              <PatientLive sessionId={sessionId} />
            </TabletFrame>
          </div>
        </div>

        {/* ER: a sliding panel on wide screens, a tab on narrow ones. Always mounted so it never misses the handoff. */}
        <aside
          aria-label="ER handoff"
          className={`z-30 flex flex-col overflow-y-auto bg-canvas transition-transform duration-500 ease-out max-[899px]:absolute max-[899px]:inset-0 min-[900px]:absolute min-[900px]:inset-y-0 min-[900px]:right-0 min-[900px]:w-[min(640px,60%)] min-[900px]:border-s min-[900px]:border-line min-[900px]:shadow-2xl ${
            erOpen ? "min-[900px]:translate-x-0" : "min-[900px]:translate-x-full"
          } ${pane === "er" ? "max-[899px]:translate-x-0" : "max-[899px]:invisible"}`}
        >
          <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-2">
            <span className="font-semibold">ER screen</span>
            <button type="button" onClick={() => (setErOpen(false), setPane("emt"))} className="rounded-lg p-1.5 hover:bg-canvas" aria-label="Close ER panel">
              <X size={18} aria-hidden />
            </button>
          </div>
          <ErLive sessionId={sessionId} />
        </aside>
      </div>
    </div>
  );
}

/** One screen with the EMT console, a tablet-framed patient screen, and the ER handoff panel. */
export function DemoView() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);
  useEffect(() => {
    // Ids are random, so create them on the client only.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSessionId(makeSessionId());
  }, []);
  if (!sessionId) return null;
  return (
    <DemoSession
      key={sessionId}
      sessionId={sessionId}
      scenarioId={scenarioId}
      onScenario={(id) => {
        clearSessionKeys();
        setScenarioId(id);
        setSessionId(makeSessionId());
      }}
      onRestart={() => {
        clearSessionKeys();
        setSessionId(makeSessionId());
      }}
    />
  );
}
