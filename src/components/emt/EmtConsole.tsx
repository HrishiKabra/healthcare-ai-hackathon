"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AutopilotBar } from "@/components/demo/AutopilotBar";
import { ProviderBadge } from "@/components/shared/ProviderBadge";
import { useAutopilot } from "@/hooks/useAutopilot";
import { explainFlag } from "@/lib/ai/client";
import { questionStatus } from "@/lib/flow";
import { FreeformComposer } from "./FreeformComposer";
import { Modal } from "@/components/shared/Modal";
import type { useEmtSession } from "@/hooks/useEmtSession";
import { useNow } from "@/hooks/useNow";
import { emtObservation } from "@/lib/emt";
import { nextQuestion } from "@/lib/flow";
import { getLanguage } from "@/lib/languages";
import { evaluateRules } from "@/lib/rules";
import { sessionChart } from "@/lib/session";
import { EmtHeader } from "./EmtHeader";
import { LiveChart } from "./LiveChart";
import { ModePicker } from "./ModePicker";
import { PatientInputs } from "./PatientInputs";
import { QuestionQueue } from "./QuestionQueue";
import { RedFlagBanner } from "./RedFlagBanner";

export type EmtSession = ReturnType<typeof useEmtSession>;

export function EmtConsole({
  session,
  embedded = false,
  onEnded,
  belowChart,
  autopilotExtras,
}: {
  session: EmtSession;
  embedded?: boolean;
  onEnded?: () => void;
  belowChart?: React.ReactNode;
  /** Extra controls in the autopilot bar (the /demo scenario picker). */
  autopilotExtras?: React.ReactNode;
}) {
  const { state, dispatch, endCall, post } = session;
  const [autoAdvance, setAutoAdvance] = useState(false);
  const ap = useAutopilot({ state, dispatch, post });
  const now = useNow(15_000);
  const chart = useMemo(() => sessionChart(state), [state]);
  const flags = useMemo(() => evaluateRules(chart, now), [chart, now]);
  const [modeOpen, setModeOpen] = useState(false);
  const [interpreterOpen, setInterpreterOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const currentId = state.current?.kind === "bank" ? state.current.questionId : null;
  const ask = (questionId: string) => dispatch({ type: "ask", questionId, at: Date.now() });
  const next = () => {
    const q = nextQuestion(state, currentId);
    if (q) ask(q.id);
    else dispatch({ type: "clearCurrent" });
  };

  // Auto-advance: send the next question as soon as the current one is confirmed.
  const currentConfirmed = currentId ? questionStatus(currentId, state) === "confirmed" : false;
  const nextRef = useRef(next);
  useEffect(() => {
    nextRef.current = next;
  });
  useEffect(() => {
    if (!autoAdvance || !currentConfirmed || ap.playing) return;
    const t = setTimeout(() => nextRef.current(), 700);
    return () => clearTimeout(t);
  }, [autoAdvance, currentConfirmed, currentId, ap.playing]);

  // Optional AI wording for each new flag. The rule's own text stays the fallback.
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const requested = useRef(new Set<string>());
  useEffect(() => {
    for (const f of flags) {
      if (requested.current.has(f.ruleId)) continue;
      requested.current.add(f.ruleId);
      explainFlag(f)
        .then((r) => {
          if (r.meta.provider === "anthropic" || r.meta.provider === "ollama") setExplanations((e) => ({ ...e, [f.ruleId]: `${r.explanation} (AI wording)` }));
        })
        .catch(() => {});
    }
  }, [flags]);

  return (
    <div className="@container flex min-h-0 flex-1 flex-col bg-canvas">
      <EmtHeader
        state={state}
        embedded={embedded}
        badge={<ProviderBadge />}
        onChangeMode={() => setModeOpen(true)}
        onInterpreter={() => setInterpreterOpen(true)}
        onEnd={() => setEndOpen(true)}
      />
      {state.scenarioId || autopilotExtras ? (
        <AutopilotBar ap={ap} autoAdvance={autoAdvance} onAutoAdvance={setAutoAdvance}>
          {autopilotExtras}
        </AutopilotBar>
      ) : null}
      <RedFlagBanner flags={flags} acknowledged={state.acknowledgedFlags} onAck={(ruleId) => dispatch({ type: "ackFlag", ruleId })} explanations={explanations} />

      <div className="grid min-h-0 flex-1 gap-4 p-4 @3xl:grid-cols-[minmax(240px,280px)_1fr] @5xl:grid-cols-[260px_1fr_290px]">
        <div className="flex min-h-0 flex-col gap-3 @3xl:row-span-2 @5xl:row-span-1">
          <QuestionQueue
            state={state}
            onAsk={ask}
            onSkip={(id) => dispatch({ type: "skip", questionId: id })}
            onNext={next}
            onObserve={(qid, v) => dispatch({ type: "answerProposed", answer: emtObservation(qid, v) })}
          />
          {state.mode ? (
            <FreeformComposer
              lang={state.mode === "spoken" ? state.language : "en"}
              onAsk={(question) => dispatch({ type: "askFreeform", question, at: Date.now() })}
            />
          ) : null}
          {!state.scenarioId && !autopilotExtras ? (
            <label className="flex items-center gap-2 px-1 text-xs text-ink-soft">
              <input type="checkbox" className="size-4 accent-[var(--color-brand)]" checked={autoAdvance} onChange={(e) => setAutoAdvance(e.target.checked)} />
              Auto-advance after each confirmed answer
            </label>
          ) : null}
        </div>

        <div className="flex min-h-0 flex-col gap-3">
          {!state.mode ? (
            <section className="rounded-2xl border border-signal bg-surface p-4">
              <h2 className="mb-3 text-base font-semibold">How will this patient communicate?</h2>
              <ModePicker onPick={(mode, language) => dispatch({ type: "setMode", mode, language })} />
            </section>
          ) : null}
          <LiveChart chart={chart} answers={state.answers} freeform={state.freeform} />
          {belowChart}
        </div>

        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
          <PatientInputs
            emt={state.emt}
            onChange={(emt) => dispatch({ type: "setEmt", emt })}
            speechAbnormal={chart.strokeScreen.speechAbnormal?.value}
            onSpeechAbnormal={(v) => dispatch({ type: "answerProposed", answer: emtObservation("stroke_speech", v) })}
          />
        </div>
      </div>

      <Modal open={modeOpen} title="Patient mode" onClose={() => setModeOpen(false)}>
        <ModePicker
          current={{ mode: state.mode, language: state.language }}
          onPick={(mode, language) => {
            dispatch({ type: "setMode", mode, language });
            setModeOpen(false);
          }}
        />
      </Modal>
      <Modal open={interpreterOpen} title="Call live interpreter" onClose={() => setInterpreterOpen(false)}>
        <div className="flex flex-col gap-3 text-sm">
          <p>
            In a real deployment this connects to the agency&apos;s interpreter line by phone or video
            {state.mode === "asl" ? ", requesting an ASL interpreter" : state.mode === "spoken" ? `, requesting ${getLanguage(state.language).englishName}` : ""}.
          </p>
          <p>FirstWords is a bridge until a qualified interpreter is reached. It does not replace one.</p>
          <p className="text-ink-soft">This prototype does not place a call.</p>
        </div>
      </Modal>
      <Modal open={endOpen} title="End call?" onClose={() => setEndOpen(false)}>
        <div className="flex flex-col gap-4 text-sm">
          <p>This clears every answer from this device and from the patient and ER windows. Nothing is saved.</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEndOpen(false)} className="rounded-lg border border-line px-3 py-2">
              Keep going
            </button>
            <button
              type="button"
              onClick={() => {
                endCall();
                setEndOpen(false);
                onEnded?.();
              }}
              className="rounded-lg bg-critical px-3 py-2 font-semibold text-white"
            >
              End call and clear
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
