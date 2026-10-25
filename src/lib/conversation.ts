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
