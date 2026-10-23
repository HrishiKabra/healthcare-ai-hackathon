"use client";

import { FileOutput } from "lucide-react";
import { useState } from "react";
import { handoffNarrative } from "@/lib/ai/client";
import { buildHandoff, handoffText, type Handoff } from "@/lib/handoff";
import type { SessionState } from "@/lib/session";

/**
 * Builds the handoff in code and sends it to the ER window right away. The AI
 * paragraph follows a moment later as an update, labeled "review before use".
 */
export function HandoffButton({ state, send }: { state: SessionState; send: (h: Handoff) => void }) {
  const [busy, setBusy] = useState(false);
  const generate = async () => {
    setBusy(true);
    const h = buildHandoff(state, Date.now());
    send(h);
    try {
      const r = await handoffNarrative(handoffText(h));
      send({ ...h, narrative: { text: r.narrative, provider: r.meta.provider } });
    } catch {
      // The structured handoff already went out; the paragraph is optional.
    } finally {
      setBusy(false);
    }
  };
  const sentAt = state.handoffSentAt ? new Date(state.handoffSentAt) : null;
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => void generate()}
        disabled={busy || !state.answers.length}
        className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-ink px-4 text-base font-semibold text-white hover:bg-ink-soft disabled:opacity-40"
      >
        <FileOutput size={20} aria-hidden /> {sentAt ? "Send updated handoff" : "Generate handoff"}
      </button>
      {sentAt ? (
        <p className="text-center text-xs text-ok">
          Sent to ER at {String(sentAt.getHours()).padStart(2, "0")}:{String(sentAt.getMinutes()).padStart(2, "0")}
        </p>
      ) : null}
    </div>
  );
}
