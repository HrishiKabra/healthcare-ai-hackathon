"use client";

import { CircleCheck, Hourglass, LoaderCircle } from "lucide-react";
import { t } from "@/lib/i18n";
import { getLanguage } from "@/lib/languages";
import type { AnswerValue, LangCode, PatientMode, Question } from "@/lib/schemas";
import type { PatientStep } from "@/hooks/usePatientAnswering";
import { ConfirmBack } from "./ConfirmBack";
import { QuestionCard } from "./QuestionCard";
import { SayItInstead } from "./SayItInstead";
import { AnswerWidget } from "./widgets/AnswerWidget";

export type PatientScreenProps = {
  q: Question | null;
  freeform?: boolean;
  lang: LangCode;
  mode: PatientMode;
  step: PatientStep;
  ended?: boolean;
  onAnswer: (v: AnswerValue) => void;
  onFreeText: (text: string) => void;
  onConfirm: (yes: boolean) => void;
  /** Extra controls under the widget, such as the gesture camera. */
  extras?: React.ReactNode;
};

function Centered({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      {icon}
      <p className="max-w-[24ch] text-[36px] font-semibold leading-tight text-ink">{text}</p>
    </div>
  );
}

export function PatientScreen({ q, freeform, lang, mode, step, ended, onAnswer, onFreeText, onConfirm, extras }: PatientScreenProps) {
  const language = getLanguage(lang);
  let body: React.ReactNode;

  if (ended) {
    body = <Centered icon={<CircleCheck size={96} className="text-ok" aria-hidden />} text={t("callEnded", lang)} />;
  } else if (!q) {
    body = <Centered icon={<Hourglass size={88} className="text-brand" aria-hidden />} text={t("waiting", lang)} />;
  } else if (step.kind === "thinking") {
    body = (
      <>
        <QuestionCard q={q} lang={lang} mode={mode} freeform={freeform} />
        <Centered icon={<LoaderCircle size={88} className="animate-spin text-brand" aria-hidden />} text={t("thinking", lang)} />
      </>
    );
  } else if (step.kind === "confirm") {
    body = <ConfirmBack lang={lang} text={step.answer.confirmText.native} onConfirm={onConfirm} />;
  } else if (step.kind === "thanks") {
    body = <Centered icon={<CircleCheck size={96} className="text-ok" aria-hidden />} text={`${t("thankYou", lang)} ${t("waiting", lang)}`} />;
  } else {
    const showSayIt = mode === "spoken" && q.answerType !== "free" && q.answerType !== "instruction";
    body = (
      <>
        <QuestionCard q={q} lang={lang} mode={mode} freeform={freeform} />
        {step.notice ? (
          <p role="alert" className="rounded-2xl bg-warning-soft px-5 py-3 text-[24px] font-medium text-warning">
            {t(step.notice, lang)}
          </p>
        ) : null}
        <div className="flex flex-col gap-4">
          <AnswerWidget q={q} lang={lang} mode={mode} onAnswer={onAnswer} onFreeText={onFreeText} />
          {extras}
          {showSayIt ? <SayItInstead lang={lang} onSubmit={onFreeText} /> : null}
        </div>
      </>
    );
  }

  return (
    <div dir={language.dir} lang={language.speechTag} className="flex min-h-0 flex-1 flex-col gap-5 bg-canvas p-5 text-[24px]">
      {body}
    </div>
  );
}
