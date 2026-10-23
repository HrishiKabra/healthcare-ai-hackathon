// Helpers for unit tests and the scenario runner. Pure, no browser APIs.
import { interpretStructured } from "./interpret";
import { requireQuestion } from "./questions";
import type { Answer, AnswerValue, LangCode, PatchEntry } from "./schemas";

let counter = 0;

export function makeAnswer(
  questionId: string,
  value: AnswerValue,
  opts: { status?: Answer["status"]; lang?: LangCode; patch?: PatchEntry[]; id?: string; at?: number; by?: Answer["by"] } = {},
): Answer {
  const q = requireQuestion(questionId);
  const lang = opts.lang ?? "en";
  const interp = interpretStructured(q, value, lang);
  counter += 1;
  return {
    id: opts.id ?? `a${counter}`,
    questionId,
    value,
    language: lang,
    by: opts.by ?? "patient",
    status: opts.status ?? "confirmed",
    at: opts.at ?? counter,
    patch: opts.patch ?? interp.patch,
    confirmText: interp.confirmText,
    source: opts.patch ? "mock" : "structured",
  };
}

export const yes = { kind: "yesno", value: "yes" } as const;
export const no = { kind: "yesno", value: "no" } as const;
export const choice = (...choiceIds: string[]) => ({ kind: "choice", choiceIds }) as const;
export const observed = (value: boolean) => ({ kind: "observation", value }) as const;
