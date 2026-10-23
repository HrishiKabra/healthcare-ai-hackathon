import bankJson from "@/data/questions.json";
import { QuestionBank, type Question } from "./schemas";

// Parsed once at import. A malformed questions.json fails loudly in tests and build.
const bank = QuestionBank.parse(bankJson);

export const QUESTIONS: readonly Question[] = bank.questions;

const byId = new Map(QUESTIONS.map((q) => [q.id, q]));

export function getQuestion(id: string): Question | undefined {
  return byId.get(id);
}

export function requireQuestion(id: string): Question {
  const q = byId.get(id);
  if (!q) throw new Error(`Unknown question: ${id}`);
  return q;
}

export function questionIndex(id: string): number {
  return QUESTIONS.findIndex((q) => q.id === id);
}
