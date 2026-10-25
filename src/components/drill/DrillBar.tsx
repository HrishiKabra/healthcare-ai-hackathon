"use client";

import { Flag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatElapsed } from "@/components/emt/SessionTimer";
import type { EmtSession } from "@/components/emt/EmtConsole";
import { useNow } from "@/hooks/useNow";
import { DRILL_SCENARIOS, firstWordsMetrics, getDrill, saveDrill, type DrillRun } from "@/lib/drill";

/** Slim bar above the console during a field-test drill. Finish computes the metrics, ends the call, and opens the survey. */
export function DrillBar({ runId, session }: { runId: string; session: EmtSession }) {
  const router = useRouter();
  const now = useNow(1000);
  const [run, setRun] = useState<DrillRun | null>(null);
  useEffect(() => {
    // localStorage is only readable after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRun(getDrill(runId) ?? null);
  }, [runId]);

  const finish = () => {
    if (!run) return;
    saveDrill({ ...run, sessionId: undefined, metrics: firstWordsMetrics(session.state, run.scenarioId, Date.now()) });
    session.endCall();
    router.push(`/drill/survey?run=${run.id}`);
  };

  const title = DRILL_SCENARIOS.find((s) => s.id === run?.scenarioId)?.title ?? "";
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-signal bg-signal-soft px-4 py-2 text-sm">
      <span className="font-semibold">Field test</span>
      <span className="text-ink-soft">
        Tester {run?.tester ?? "?"}, {title}
      </span>
      <span className="font-mono font-semibold tabular-nums">{formatElapsed(now - session.state.startedAt)}</span>
      <button type="button" onClick={finish} disabled={!run} className="ms-auto flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 font-semibold text-white disabled:opacity-40">
        <Flag size={14} aria-hidden /> Finish drill
      </button>
    </div>
  );
}
