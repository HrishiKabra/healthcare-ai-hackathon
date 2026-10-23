"use client";

import { Hourglass } from "lucide-react";
import { useEffect, useState } from "react";
import { useSessionFollower } from "@/hooks/usePatientSession";
import type { Handoff } from "@/lib/handoff";
import { HandoffView } from "./HandoffView";

/** Waits on the session channel for a handoff and shows it as it arrives. */
export function ErLive({ sessionId }: { sessionId: string }) {
  const { state, ended, subscribe } = useSessionFollower(sessionId, "er");
  const [received, setReceived] = useState<{ handoff: Handoff; at: number } | null>(null);

  useEffect(
    () =>
      subscribe((m) => {
        if (m.type === "handoff") setReceived({ handoff: m.handoff, at: Date.now() });
        if (m.type === "end") setReceived(null);
      }),
    [subscribe],
  );

  if (ended && !received) {
    return <p className="m-auto p-8 text-lg text-ink-soft">The call has ended. Nothing from it is kept on this screen.</p>;
  }
  if (!received) {
    return (
      <div className="m-auto flex flex-col items-center gap-4 p-8 text-center">
        <Hourglass size={56} className="text-brand" aria-hidden />
        <h1 className="text-2xl font-semibold">Waiting for the handoff</h1>
        <p className="max-w-md text-ink-soft">
          {state ? "The crew is assessing the patient. The handoff appears here as soon as they send it." : "Connecting to the crew's console on this device."}
        </p>
      </div>
    );
  }
  return (
    <div className="flex-1 bg-canvas p-6">
      <HandoffView handoff={received.handoff} receivedAt={received.at} />
    </div>
  );
}
