import type { SessionEvent, SessionState } from "./session";

// Cross-window sync for one session on one device. BroadcastChannel delivers to
// every other channel instance with the same name, including other instances
// in the same page, which is how the /demo split view works without a server.

export type Handoff = import("./handoff").Handoff;

export type BusMessage =
  | { type: "hello"; from: Role }
  | { type: "snapshot"; state: SessionState }
  | { type: "event"; from: Role; event: SessionEvent }
  | { type: "handoff"; handoff: Handoff; at: number }
  | { type: "end" };

export type Role = "emt" | "patient" | "er" | "demo";

export type Bus = {
  post: (m: BusMessage) => void;
  subscribe: (fn: (m: BusMessage) => void) => () => void;
  close: () => void;
};

const MESSAGE_TYPES = new Set(["hello", "snapshot", "event", "handoff", "end"]);

function isBusMessage(x: unknown): x is BusMessage {
  return typeof x === "object" && x !== null && MESSAGE_TYPES.has((x as { type?: string }).type ?? "");
}

export function channelName(sessionId: string): string {
  return `firstwords:${sessionId}`;
}

/** Opens a channel for the session. Falls back to a no-op bus where BroadcastChannel is missing. */
export function openBus(sessionId: string): Bus {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return { post: () => {}, subscribe: () => () => {}, close: () => {} };
  }
  const ch = new BroadcastChannel(channelName(sessionId));
  const listeners = new Set<(m: BusMessage) => void>();
  ch.onmessage = (e: MessageEvent) => {
    if (!isBusMessage(e.data)) return;
    listeners.forEach((fn) => fn(e.data));
  };
  return {
    post: (m) => {
      try {
        ch.postMessage(m);
      } catch {
        // ignore: channel closed
      }
    },
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    close: () => {
      listeners.clear();
      ch.close();
    },
  };
}

/** Events a non-EMT window is allowed to send. The EMT window ignores everything else. */
export const PATIENT_EVENTS: ReadonlySet<SessionEvent["type"]> = new Set(["answerProposed", "answerConfirmed", "answerRejected", "setMode"]);
