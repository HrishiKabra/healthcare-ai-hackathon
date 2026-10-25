// Browser speech helpers. Every call is guarded: speech may be missing
// (Firefox, server render, kiosk mode) and the typed fallback must always work.

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speak(text: string, speechTag: string): void {
  if (!canSpeak()) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = speechTag;
    u.rate = 0.9;
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith(speechTag.slice(0, 2).toLowerCase()));
    if (voice) u.voice = voice;
    window.speechSynthesis.speak(u);
  } catch {
    // ignore
  }
}

/** Like speak(), but waits for anything already speaking instead of cutting it off. */
export function speakQueued(text: string, speechTag: string): void {
  if (!canSpeak()) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = speechTag;
    u.rate = 1;
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith(speechTag.slice(0, 2).toLowerCase()));
    if (voice) u.voice = voice;
    window.speechSynthesis.speak(u);
  } catch {
    // ignore
  }
}

export function stopSpeaking(): void {
  if (!canSpeak()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // ignore
  }
}
