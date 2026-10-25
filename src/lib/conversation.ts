import type { Answer } from "./schemas";
import type { SessionState, Utterance } from "./session";

export type ConversationLine = { kind: "said"; u: Utterance; answer?: Answer } | { kind: "tapped"; answer: Answer };

/**
 * Everything said both ways, oldest first: EMT questions, the patient's own
 * words (linked to the answer they became), and the patient's taps.
 */
export function conversationLines(state: Pick<SessionState, "utterances" | "answers">): ConversationLine[] {
  const answers = new Map(state.answers.map((a) => [a.id, a]));
  const said: ConversationLine[] = state.utterances.map((u) => ({ kind: "said", u, answer: answers.get(u.id) }));
  const tapped: ConversationLine[] = state.answers.filter((a) => a.by === "patient" && a.value.kind !== "free").map((answer) => ({ kind: "tapped", answer }));
  const at = (l: ConversationLine) => (l.kind === "said" ? l.u.at : l.answer.at);
  return [...said, ...tapped].sort((a, b) => at(a) - at(b));
}

/** What the console says aloud for a line, or null when there is nothing to say yet (EMT lines, translations still running). */
export function readAloudText(l: ConversationLine): string | null {
  if (l.kind === "tapped") return `Patient answered: ${l.answer.confirmText.english}.`;
  if (l.u.from !== "patient") return null;
  if (l.u.status === "failed") return "Patient's answer could not be translated.";
  if (l.u.status !== "done" || !l.u.translation) return null;
  if (l.u.language !== "en" && l.u.translation === l.u.original) return "Patient's answer was not translated.";
  return `Patient says: ${l.u.translation}`;
}
