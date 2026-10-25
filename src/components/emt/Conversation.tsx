"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useRef } from "react";
import { useNow } from "@/hooks/useNow";
import { conversationLines } from "@/lib/conversation";
import { getLanguage } from "@/lib/languages";
import type { Answer, LangCode } from "@/lib/schemas";
import type { SessionState, Utterance } from "@/lib/session";

const ANSWER_STATUS: Record<Answer["status"], { label: string; cls: string }> = {
  pending: { label: "Not confirmed yet", cls: "bg-unconfirmed-soft text-unconfirmed" },
  confirmed: { label: "Confirmed", cls: "bg-ok-soft text-ok" },
  rejected: { label: "Patient said this was wrong", cls: "bg-canvas text-muted line-through" },
};

function Elapsed({ since }: { since: number }) {
  const now = useNow(1000);
  return <span className="tabular-nums">{Math.max(0, Math.round((now - since) / 1000))}s</span>;
}

function Pending({ since, children }: { since: number; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-ink-soft">
      <LoaderCircle size={12} className="animate-spin motion-reduce:animate-none" aria-hidden />
      {children} <Elapsed since={since} />
    </p>
  );
}

function Native({ text, lang, className = "" }: { text: string; lang: LangCode; className?: string }) {
  const l = getLanguage(lang);
  return (
    <span lang={l.speechTag} dir={l.dir} className={className}>
      {text}
    </span>
  );
}

function StatusChip({ answer }: { answer?: Answer }) {
  if (!answer) return null;
  const s = ANSWER_STATUS[answer.status];
  return <span className={`rounded px-1.5 text-[11px] font-semibold ${s.cls}`}>{s.label}</span>;
}

function EmtLine({ u, patientLang }: { u: Utterance; patientLang: LangCode }) {
  const name = getLanguage(patientLang).englishName;
  return (
    <li className="flex flex-col gap-0.5">
      <p className="text-xs font-semibold text-ink-soft">EMT</p>
      <p className="text-sm font-medium">{u.original}</p>
      {u.status === "translating" ? <Pending since={u.at}>Translating to {name}</Pending> : null}
      {u.status === "failed" ? <p className="text-xs font-semibold text-critical">Translation failed, not sent. Try again or call an interpreter.</p> : null}
      {u.status === "done" && u.translation && u.translation === u.original ? (
        <p className="text-xs font-semibold text-warning">Not translated: the patient saw it in English. Rephrase or call an interpreter.</p>
      ) : null}
      {u.status === "done" && u.translation && u.translation !== u.original ? (
        <p className="text-xs text-ink-soft">
          Patient saw: <Native text={u.translation} lang={patientLang} />
          {u.confidence === "low" ? <span className="ms-1 font-semibold text-warning">(low confidence translation)</span> : null}
        </p>
      ) : null}
    </li>
  );
}

function PatientSaid({ u, answer }: { u: Utterance; answer?: Answer }) {
  const lang = getLanguage(u.language);
  const english = u.language === "en";
  return (
    <li className="flex flex-col gap-0.5 rounded-lg border-s-4 border-brand bg-canvas px-2 py-1">
      <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-soft">
        Patient{english ? "" : `, in ${lang.englishName}`}
        <StatusChip answer={answer} />
      </p>
      {english ? null : <Native text={u.original} lang={u.language} className="text-sm text-ink-soft" />}
      {u.status === "translating" ? <Pending since={u.at}>Translating to English</Pending> : null}
      {u.status === "failed" ? <p className="text-xs font-semibold text-critical">Could not translate. Ask again, use pictures, or call an interpreter.</p> : null}
      {u.status === "done" && !english && u.translation === u.original ? (
        <p className="text-xs font-semibold text-warning">Not translated. Ask again, use pictures, or call an interpreter.</p>
      ) : null}
      {u.status === "done" && u.translation && (english || u.translation !== u.original) ? (
        <p className="text-sm font-semibold">
          &ldquo;{u.translation}&rdquo;
          {u.confidence === "low" ? <span className="ms-1 text-xs font-semibold text-warning">(low confidence translation)</span> : null}
        </p>
      ) : null}
    </li>
  );
}

function PatientTapped({ answer }: { answer: Answer }) {
  return (
    <li className="flex flex-col gap-0.5 rounded-lg border-s-4 border-brand bg-canvas px-2 py-1">
      <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-soft">
        Patient tapped
        <StatusChip answer={answer} />
      </p>
      <p className="text-sm font-semibold">{answer.confirmText.english}</p>
    </li>
  );
}

/** The live conversation on the EMT console, newest at the bottom. */
export function Conversation({ state }: { state: SessionState }) {
  const lines = conversationLines(state);
  const patientLang: LangCode = state.mode === "asl" ? "en" : state.language;
  const listRef = useRef<HTMLOListElement>(null);
  const last = lines.at(-1);
  const lastKey = last ? `${last.kind === "said" ? `${last.u.id}:${last.u.status}` : last.answer.id}:${lines.length}` : "";
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lastKey]);

  return (
    <section aria-label="Conversation" className="flex shrink-0 flex-col rounded-xl border border-line bg-surface">
      <h2 className="px-3 pt-2 text-base font-semibold">Conversation</h2>
      {lines.length ? (
        <ol ref={listRef} aria-live="polite" className="flex max-h-56 flex-col gap-2 overflow-y-auto px-3 pt-1 pb-3">
          {lines.map((l) =>
            l.kind === "tapped" ? (
              <PatientTapped key={l.answer.id} answer={l.answer} />
            ) : l.u.from === "emt" ? (
              <EmtLine key={l.u.id} u={l.u} patientLang={patientLang} />
            ) : (
              <PatientSaid key={l.u.id} u={l.u} answer={l.answer} />
            ),
          )}
        </ol>
      ) : (
        <p className="px-3 pt-1 pb-3 text-sm text-ink-soft">Questions you send and everything the patient says show up here, translated into English.</p>
      )}
    </section>
  );
}
