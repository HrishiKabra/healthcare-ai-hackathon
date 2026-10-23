"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BusMessage } from "@/lib/bus";
import { emtObservation } from "@/lib/emt";
import { getScenario, nextScenarioStep } from "@/lib/scenarios";
import type { SessionEvent, SessionState } from "@/lib/session";

/**
 * Scenario autopilot for recording the demo. "Next step" makes the EMT ask the
 * scripted question and the patient screen answer and confirm it, so every
 * screen shows the real flow. "Play" repeats that with a short delay.
 */
export function useAutopilot(opts: { state: SessionState; dispatch: (e: SessionEvent) => void; post: (m: BusMessage) => void }) {
  const { state, dispatch, post } = opts;
  const scenario = getScenario(state.scenarioId);
  const progress = scenario ? nextScenarioStep(scenario, state) : null;
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<1 | 2>(1);
  const [inFlight, setInFlight] = useState<{ questionId: string; since: number } | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // A step is finished once its question is confirmed or skipped.
  const busy = !!inFlight && progress?.step.questionId === inFlight.questionId;

  const next = () => {
    if (!progress || busy) return;
    const { step } = progress;
    const delay = 900 / speed;
    if (step.skip) {
      dispatch({ type: "skip", questionId: step.questionId });
      return;
    }
    const current = state.current?.kind === "bank" ? state.current.questionId : null;
    if (current !== step.questionId) dispatch({ type: "ask", questionId: step.questionId, at: Date.now() });
    setInFlight({ questionId: step.questionId, since: Date.now() });
    if (step.observe != null) {
      later(() => dispatch({ type: "answerProposed", answer: emtObservation(step.questionId, step.observe!) }), delay * 1.5);
      return;
    }
    later(() => post({ type: "autopilot", questionId: step.questionId, step, confirmAfterMs: delay * 1.3 }), 350);
  };
  const nextRef = useRef(next);
  useEffect(() => {
    nextRef.current = next;
  });

  // Play: take the next step a beat after the previous one finishes.
  const stepIdx = progress?.index ?? -1;
  useEffect(() => {
    if (!playing) return;
    if (stepIdx < 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPlaying(false);
      return;
    }
    if (busy) {
      // Give up on a stuck step (for example an answer the patient screen could not read).
      const stuck = setTimeout(() => setPlaying(false), 20_000);
      return () => clearTimeout(stuck);
    }
    const t = setTimeout(() => nextRef.current(), 1100 / speed);
    return () => clearTimeout(t);
  }, [playing, stepIdx, busy, speed]);

  return {
    scenario,
    stepIndex: progress?.index ?? scenario?.steps.length ?? 0,
    total: scenario?.steps.length ?? 0,
    done: !!scenario && !progress,
    busy,
    playing,
    speed,
    next,
    play: () => setPlaying(true),
    pause: () => setPlaying(false),
    setSpeed,
  };
}
