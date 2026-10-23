// Browser storage wrappers. Storage can throw (private mode, blocked site data,
// server render), so every access is guarded and failures are silent.

type StoreKind = "local" | "session";

function store(kind: StoreKind): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function readJson<T>(kind: StoreKind, key: string): T | null {
  try {
    const raw = store(kind)?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeJson(kind: StoreKind, key: string, value: unknown): void {
  try {
    store(kind)?.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function removeKey(kind: StoreKind, key: string): void {
  try {
    store(kind)?.removeItem(key);
  } catch {
    // ignore
  }
}

/** Removes every FirstWords key from sessionStorage. Used by "End call". */
export function clearSessionKeys(prefix = "firstwords:"): void {
  try {
    const s = store("session");
    if (!s) return;
    const keys: string[] = [];
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (k && k.startsWith(prefix)) keys.push(k);
    }
    keys.forEach((k) => s.removeItem(k));
  } catch {
    // ignore
  }
}
