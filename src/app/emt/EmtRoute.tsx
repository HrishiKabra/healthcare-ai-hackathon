"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { EmtConsole } from "@/components/emt/EmtConsole";
import { NoSession } from "@/components/shared/NoSession";
import { useEmtSession } from "@/hooks/useEmtSession";
import { getScenario, scenarioSetupEvents } from "@/lib/scenarios";

function Console({ sessionId, scenarioId }: { sessionId: string; scenarioId: string | null }) {
  const router = useRouter();
  const session = useEmtSession(sessionId);
  const { state, dispatch } = session;
  const fresh = !state.scenarioId && state.answers.length === 0 && !state.mode;

  // Load a demo scenario once, into a fresh session only.
  useEffect(() => {
    const sc = getScenario(scenarioId);
    if (sc && fresh) scenarioSetupEvents(sc, Date.now()).forEach(dispatch);
  }, [scenarioId, fresh, dispatch]);

  return <EmtConsole session={session} onEnded={() => router.push("/")} />;
}

export function EmtRoute() {
  const params = useSearchParams();
  const s = params.get("s");
  if (!s) return <NoSession what="EMT console" />;
  return <Console key={s} sessionId={s} scenarioId={params.get("scenario")} />;
}
