"use client";

import { Camera, CameraOff, Hand } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { t } from "@/lib/i18n";
import type { AnswerValue, LangCode } from "@/lib/schemas";

// Stretch feature: yes or no by thumbs up or thumbs down, with MediaPipe's
// Gesture Recognizer. This is a "gesture answer", not sign language
// recognition. It is opt-in (settings) because it downloads the recognizer
// model from Google's CDN the first time the camera is turned on.

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task";
const HOLD_FRAMES = 12;
const MIN_SCORE = 0.65;

type Status = "idle" | "loading" | "running" | "error";

export function GestureAnswer({ lang, onAnswer }: { lang: LangCode; onAnswer: (v: AnswerValue) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const stop = useRef<() => void>(() => {});
  const [status, setStatus] = useState<Status>("idle");
  const [seen, setSeen] = useState<"yes" | "no" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => stop.current(), []);

  const start = async () => {
    setStatus("loading");
    setError(null);
    try {
      const { FilesetResolver, GestureRecognizer } = await import("@mediapipe/tasks-vision");
      const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
      const recognizer = await GestureRecognizer.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL },
        runningMode: "VIDEO",
        numHands: 1,
      });
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 320, height: 240 } });
      const el = video.current!;
      el.srcObject = stream;
      await el.play();
      let raf = 0;
      let streak: { value: "yes" | "no"; n: number } | null = null;
      let done = false;
      stop.current = () => {
        done = true;
        cancelAnimationFrame(raf);
        stream.getTracks().forEach((tr) => tr.stop());
        recognizer.close();
      };
      setStatus("running");
      const loop = () => {
        if (done) return;
        const r = recognizer.recognizeForVideo(el, performance.now());
        const top = r.gestures[0]?.[0];
        const value = top && top.score >= MIN_SCORE ? (top.categoryName === "Thumb_Up" ? "yes" : top.categoryName === "Thumb_Down" ? "no" : null) : null;
        streak = value ? (streak?.value === value ? { value, n: streak.n + 1 } : { value, n: 1 }) : null;
        setSeen(streak?.value ?? null);
        if (streak && streak.n >= HOLD_FRAMES) {
          stop.current();
          setStatus("idle");
          onAnswer({ kind: "gesture", value: streak.value });
          return;
        }
        raf = requestAnimationFrame(loop);
      };
      loop();
    } catch (e) {
      stop.current();
      setStatus("error");
      setError(e instanceof Error ? e.message : "Camera unavailable");
    }
  };

  return (
    <div className="flex items-center gap-4 rounded-2xl border-2 border-dashed border-line bg-surface p-3">
      <Hand size={36} className="shrink-0 text-brand" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[24px] font-semibold leading-tight">{t("gestureHint", lang)}</p>
        {status === "running" && seen ? (
          <p className="text-[24px] text-ink-soft">
            {t("gestureSeen", lang)} {t(seen, lang)}
          </p>
        ) : null}
        {error ? <p className="text-sm text-critical">{error}</p> : null}
      </div>
      <video ref={video} muted playsInline className={`h-24 w-32 rounded-xl bg-ink object-cover ${status === "running" ? "" : "hidden"}`} style={{ transform: "scaleX(-1)" }} />
      {status === "running" ? (
        <button type="button" onClick={() => (stop.current(), setStatus("idle"))} className="flex min-h-16 items-center gap-2 rounded-2xl border-2 border-line px-4 text-[24px]" aria-label="Stop camera">
          <CameraOff size={28} aria-hidden />
        </button>
      ) : (
        <button type="button" onClick={() => void start()} disabled={status === "loading"} className="flex min-h-16 items-center gap-2 rounded-2xl border-2 border-brand bg-brand-soft px-4 text-[24px] font-semibold text-brand-strong disabled:opacity-50" aria-label="Use camera">
          <Camera size={28} aria-hidden /> {status === "loading" ? "..." : ""}
        </button>
      )}
    </div>
  );
}
