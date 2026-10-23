"use client";

import { useState } from "react";
import type { useEmtSession } from "./useEmtSession";
import { useAutopilot } from "./useAutopilot";

/** Autopilot plus the auto-advance switch, shared by the EMT console and the /demo bar. */
export function useConsoleControls(session: ReturnType<typeof useEmtSession>) {
  const [autoAdvance, setAutoAdvance] = useState(false);
  const ap = useAutopilot({ state: session.state, dispatch: session.dispatch, post: session.post });
  return { ap, autoAdvance, setAutoAdvance };
}
export type ConsoleControls = ReturnType<typeof useConsoleControls>;
