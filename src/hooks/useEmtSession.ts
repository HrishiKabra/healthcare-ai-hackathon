"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { openBus, PATIENT_EVENTS, type Bus } from "@/lib/bus";
import type { Handoff } from "@/lib/handoff";
import { newSession, sessionReducer, type SessionEvent, type SessionState } from "@/lib/session";
import { clearSessionKeys, readJson, writeJson } from "@/lib/storage";

const key = (id: string) => `firstwords:session:${id}`;
const handoffKey = (id: string) => `firstwords:handoff:${id}`;

/**
 * The EMT window owns the session. State lives in memory and sessionStorage
 * (so a reload does not lose the call) and is cleared on "End call".
 */
export function useEmtSession(sessionId: string) {
  const [state, dispatchLocal] = useReducer(
    sessionReducer,
    sessionId,
    (id) => readJson<SessionState>("session", key(id)) ?? newSession(id, Date.now()),
  );
  const stateRef = useRef(state);
  const busRef = useRef<Bus | null>(null);
  const lastHandoff = useRef<{ handoff: Handoff; at: number } | null>(readJson("session", handoffKey(sessionId)));

  useEffect(() => {
    const bus = openBus(sessionId);
    busRef.current = bus;
    const off = bus.subscribe((m) => {
      if (m.type === "hello") {
        bus.post({ type: "snapshot", state: stateRef.current });
        if (lastHandoff.current && m.from === "er") bus.post({ type: "handoff", ...lastHandoff.current });
      } else if (m.type === "event" && m.from !== "emt" && PATIENT_EVENTS.has(m.event.type)) {
        dispatchLocal(m.event);
      }
    });
    bus.post({ type: "snapshot", state: stateRef.current });
    return () => {
      off();
      bus.close();
      busRef.current = null;
    };
  }, [sessionId]);

  useEffect(() => {
    stateRef.current = state;
    if (!state.ended) writeJson("session", key(sessionId), state);
    busRef.current?.post({ type: "snapshot", state });
  }, [state, sessionId]);

  const dispatch = useCallback((e: SessionEvent) => dispatchLocal(e), []);

  const sendHandoff = useCallback(
    (handoff: Handoff) => {
      const at = Date.now();
      lastHandoff.current = { handoff, at };
      writeJson("session", handoffKey(sessionId), lastHandoff.current);
      busRef.current?.post({ type: "handoff", handoff, at });
      dispatchLocal({ type: "handoffSent", at });
    },
    [sessionId],
  );

  /** Ends the call everywhere and wipes every trace from this browser tab. */
  const endCall = useCallback(() => {
    dispatchLocal({ type: "end" });
    busRef.current?.post({ type: "end" });
    lastHandoff.current = null;
    clearSessionKeys();
  }, []);

  return { state, dispatch, sendHandoff, endCall };
}
