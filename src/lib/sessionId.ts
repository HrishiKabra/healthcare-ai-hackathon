import { readJson, writeJson } from "./storage";

const CURRENT = "firstwords:current";

/** Short, readable, random session id. Not a secret: it only names a local channel. */
export function makeSessionId(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 10);
}

export function rememberCurrentSession(id: string): void {
  writeJson("session", CURRENT, id);
}

export function currentSessionId(): string | null {
  return readJson<string>("session", CURRENT);
}
