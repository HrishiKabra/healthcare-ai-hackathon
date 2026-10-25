"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { DrillBar } from "@/components/drill/DrillBar";
import { EmtConsole } from "@/components/emt/EmtConsole";
import { NoSession } from "@/components/shared/NoSession";
import { useEmtSession } from "@/hooks/useEmtSession";
import { getScenario, scenarioSetupEvents } from "@/lib/scenarios";

function Console({ sessionId, scenarioId, drillId }: { sessionId: string; scenarioId: string | null; drillId: string | null }) {
  const router = useRouter();
  const session = useEmtSession(sessionId);
  const { state, dispatch } = session;
  const fresh = !state.scenarioId && state.answers.length === 0 && !state.mode;

  // Load a demo scenario once, into a fresh session only. A field-test drill
  // takes the patient's mode, language, and vitals but no autopilot.
  useEffect(() => {
    const sc = getScenario(scenarioId);
    if (!sc || !fresh) return;
    scenarioSetupEvents(sc, Date.now())
      .filter((e) => !(drillId && e.type === "setScenario"))
      .forEach(dispatch);
  }, [scenarioId, drillId, fresh, dispatch]);

  if (!drillId) return <EmtConsole session={session} onEnded={() => router.push("/")} />;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DrillBar runId={drillId} session={session} />
      <EmtConsole session={session} onEnded={() => router.push("/drill")} />
    </div>
  );
}

export function EmtRoute() {
  const params = useSearchParams();
  const s = params.get("s");
  if (!s) return <NoSession what="EMT console" />;
  return <Console key={s} sessionId={s} scenarioId={params.get("scenario")} drillId={params.get("drill")} />;
}
