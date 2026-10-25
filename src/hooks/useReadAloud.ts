"use client";

import { useEffect, useRef } from "react";
import { conversationLines, readAloudText } from "@/lib/conversation";
import type { RedFlag } from "@/lib/schemas";
import type { SessionState } from "@/lib/session";
import { speakQueued } from "@/lib/speech";

/**
 * Hands-free: speaks each new patient answer (once its English is ready) and
 * each new red flag or warning. Anything already on screen when it is turned on
 * is skipped, so switching it on does not read out the whole call.
 */
export function useReadAloud(state: SessionState, flags: RedFlag[], on: boolean) {
  const spoken = useRef<Set<string> | null>(null);

  useEffect(() => {
    const items = [
      ...conversationLines(state).flatMap((l) => {
        const text = readAloudText(l);
        return text ? [{ key: l.kind === "said" ? `said:${l.u.id}` : `tap:${l.answer.id}`, text }] : [];
      }),
      ...flags.map((f) => ({ key: `flag:${f.ruleId}`, text: `${f.severity === "critical" ? "Red flag" : "Warning"}. ${f.title}.` })),
    ];
    if (!on) {
      spoken.current = null;
      return;
    }
    if (!spoken.current) {
      spoken.current = new Set(items.map((i) => i.key));
      return;
    }
    for (const i of items) {
      if (spoken.current.has(i.key)) continue;
      spoken.current.add(i.key);
      speakQueued(i.text, "en-US");
    }
  }, [state, flags, on]);
}
