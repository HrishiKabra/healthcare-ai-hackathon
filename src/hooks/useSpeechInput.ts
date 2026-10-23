"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Minimal typing for the Web Speech API recognition object (not in lib.dom for every TS version).
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Speech-to-text in the patient's language. Needs Chrome and https or localhost.
 * When unavailable, `available` is false and the caller shows the typed input only.
 */
export function useSpeechInput(speechTag: string, onFinal: (text: string) => void) {
  const [available, setAvailable] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  const finalCb = useRef(onFinal);

  useEffect(() => {
    finalCb.current = onFinal;
  }, [onFinal]);

  useEffect(() => {
    // Feature detection must run after mount (window is not available during SSR).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAvailable(getCtor() !== null && (window.isSecureContext ?? false));
    return () => rec.current?.abort();
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return;
    try {
      rec.current?.abort();
      const r = new Ctor();
      r.lang = speechTag;
      r.interimResults = true;
      r.continuous = false;
      r.maxAlternatives = 1;
      r.onresult = (e) => {
        let text = "";
        let final = false;
        for (let i = 0; i < e.results.length; i++) {
          text += e.results[i][0].transcript;
          if (e.results[i].isFinal) final = true;
        }
        setInterim(text);
        if (final) finalCb.current(text.trim());
      };
      r.onerror = (e) => {
        setError(e.error);
        setListening(false);
      };
      r.onend = () => setListening(false);
      rec.current = r;
      setError(null);
      setInterim("");
      setListening(true);
      r.start();
    } catch {
      setListening(false);
      setError("start-failed");
    }
  }, [speechTag]);

  const stop = useCallback(() => {
    rec.current?.stop();
    setListening(false);
  }, []);

  return { available, listening, interim, error, start, stop };
}
