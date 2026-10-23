import type { Choice } from "./schemas";

/** Toggles one id in a multi-select, honoring "exclusive" options like "None". */
export function toggleChoice(selected: string[], c: Choice, all: Choice[]): string[] {
  if (selected.includes(c.id)) return selected.filter((x) => x !== c.id);
  if (c.exclusive) return [c.id];
  const exclusive = new Set(all.filter((x) => x.exclusive).map((x) => x.id));
  return [...selected.filter((x) => !exclusive.has(x)), c.id];
}
