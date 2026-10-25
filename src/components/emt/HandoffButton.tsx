"use client";

import { FileOutput } from "lucide-react";
import { useState } from "react";
import { handoffNarrative } from "@/lib/ai/client";
import { buildHandoff, handoffText, type Handoff } from "@/lib/handoff";
import type { HandoffTo } from "@/lib/schemas";
import type { SessionState } from "@/lib/session";

const RECIPIENTS: { to: HandoffTo; label: string; sent: string }[] = [
  { to: "noems", label: "NOEMS crew", sent: "NOEMS crew" },
  { to: "ed", label: "Emergency dept", sent: "ED" },
];

/**
 * Builds the handoff in code and sends it to the ER window right away. The AI
 * paragraph follows a moment later as an update, labeled "review before use".
 */
export function HandoffButton({ state, send, onRecipient }: { state: SessionState; send: (h: Handoff) => void; onRecipient: (to: HandoffTo) => void }) {
  const to = state.emt.handoffTo ?? "ed";
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
      <div role="radiogroup" aria-label="Hand off to" className="grid grid-cols-2 gap-1 rounded-xl bg-canvas p-1 text-sm">
        {RECIPIENTS.map((r) => (
          <button
            key={r.to}
            type="button"
            role="radio"
            aria-checked={to === r.to}
            onClick={() => onRecipient(r.to)}
            className={`rounded-lg px-2 py-1.5 font-semibold ${to === r.to ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink"}`}
          >
            {r.label}
          </button>
        ))}
      </div>
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
          Sent to {RECIPIENTS.find((r) => r.to === to)?.sent} at {String(sentAt.getHours()).padStart(2, "0")}:{String(sentAt.getMinutes()).padStart(2, "0")}
        </p>
      ) : null}
    </div>
  );
}
