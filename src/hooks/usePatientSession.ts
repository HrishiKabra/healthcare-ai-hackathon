"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { openBus, type Bus, type BusMessage, type Role } from "@/lib/bus";
import type { SessionEvent, SessionState } from "@/lib/session";

/** Follows the EMT window's session. Holds nothing beyond the latest snapshot in memory. */
export function useSessionFollower(sessionId: string, role: Role) {
  const [state, setState] = useState<SessionState | null>(null);
  const [ended, setEnded] = useState(false);
  const busRef = useRef<Bus | null>(null);

  useEffect(() => {
    const bus = openBus(sessionId);
    busRef.current = bus;
    const off = bus.subscribe((m) => {
      if (m.type === "snapshot") {
        setState(m.state);
        setEnded(m.state.ended);
      } else if (m.type === "end") {
        setState(null);
        setEnded(true);
      }
    });
    bus.post({ type: "hello", from: role });
    return () => {
      off();
      bus.close();
      busRef.current = null;
    };
  }, [sessionId, role]);

  const subscribe = useCallback((fn: (m: BusMessage) => void) => {
    const bus = busRef.current;
    return bus ? bus.subscribe(fn) : () => {};
  }, []);

  const send = useCallback((event: SessionEvent) => busRef.current?.post({ type: "event", from: role, event }), [role]);

  return { state, ended, send, subscribe };
}
