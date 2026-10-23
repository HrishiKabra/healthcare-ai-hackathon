import type { AnswerValue, LangCode, PatientMode, Question } from "@/lib/schemas";

export type WidgetProps = {
  q: Question;
  lang: LangCode;
  mode: PatientMode;
  onAnswer: (v: AnswerValue) => void;
};
