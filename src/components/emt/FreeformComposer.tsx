"use client";

import { Mic, Send, Square } from "lucide-react";
import { useCallback, useState } from "react";
import { useSpeechInput } from "@/hooks/useSpeechInput";
import { translateQuestion } from "@/lib/ai/client";
import { getLanguage } from "@/lib/languages";
import type { LangCode } from "@/lib/schemas";
import type { FreeformQuestion, Utterance } from "@/lib/session";

/** The EMT asks something that is not in the bank. It is translated and marked "free-form". */
export function FreeformComposer({ lang, onAsk, onDraft }: { lang: LangCode; onAsk: (q: FreeformQuestion) => void; onDraft: (u: Utterance) => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<{ native: string; back: string; confidence: string; notes: string } | null>(null);
  const onFinal = useCallback((heard: string) => setText(heard), []);
  const speech = useSpeechInput("en-US", onFinal);

  const send = async () => {
    const english = text.trim();
    if (!english) return;
    const id = `ff-${Date.now().toString(36)}`;
    setText("");
    if (lang === "en") {
      onAsk({ id, english, native: english, language: "en", confidence: "high" });
      setLast(null);
      return;
    }
    // Show the question in the conversation now; the translation fills in when it arrives.
    const draft: Utterance = { id, at: Date.now(), from: "emt", original: english, language: "en", translation: null, status: "translating", questionId: id };
    onDraft(draft);
    setBusy(true);
    try {
      const t = await translateQuestion(english, lang);
      onAsk({ id, english, native: t.translation, language: lang, confidence: t.confidence });
      setLast({ native: t.translation, back: t.backTranslation, confidence: t.confidence, notes: t.notes });
    } catch {
      onDraft({ ...draft, status: "failed" });
      setText((cur) => cur || english);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="Free-form question" className="rounded-xl border border-line bg-surface p-3">
      <h2 className="mb-2 text-sm font-semibold">Ask your own question</h2>
      <div className="flex gap-2">
        {speech.available ? (
          <button
            type="button"
            onClick={speech.listening ? speech.stop : speech.start}
            className={`rounded-lg border px-2 ${speech.listening ? "border-critical bg-critical text-white" : "border-line hover:border-brand"}`}
            aria-label={speech.listening ? "Stop listening" : "Speak your question"}
          >
            {speech.listening ? <Square size={16} aria-hidden /> : <Mic size={16} aria-hidden />}
          </button>
        ) : null}
        <input
          value={speech.listening && speech.interim ? speech.interim : text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void send()}
          placeholder="Type or speak in English"
          className="h-9 min-w-0 flex-1 rounded-lg border border-line px-2 text-sm focus:border-brand"
        />
        <button type="button" onClick={() => void send()} disabled={busy || !text.trim()} className="flex items-center gap-1 rounded-lg bg-brand px-3 text-sm font-semibold text-white disabled:opacity-40">
          <Send size={14} aria-hidden /> {busy ? "Translating" : "Send"}
        </button>
      </div>
      {last ? (
        <div className={`mt-2 rounded-lg px-2 py-1 text-xs ${last.confidence === "low" ? "bg-warning-soft text-warning" : "bg-canvas text-ink-soft"}`}>
          <p lang={getLanguage(lang).speechTag} dir={getLanguage(lang).dir}>
            Sent: {last.native}
          </p>
          <p>Back-translation: {last.back}</p>
          {last.notes ? <p>{last.notes}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
