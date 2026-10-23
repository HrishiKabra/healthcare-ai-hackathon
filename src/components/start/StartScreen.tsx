"use client";

import { ExternalLink, MonitorPlay, PhoneCall } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { currentSessionId, makeSessionId, rememberCurrentSession } from "@/lib/sessionId";

export function StartScreen({ scenarios }: { scenarios?: React.ReactNode }) {
  const router = useRouter();
  const [current, setCurrent] = useState<string | null>(null);
  useEffect(() => {
    // sessionStorage is only readable after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrent(currentSessionId());
  }, []);

  const start = () => {
    const id = makeSessionId();
    rememberCurrentSession(id);
    router.push(`/emt?s=${id}`);
  };
  const open = (path: string, name: string) => current && window.open(`${path}?s=${current}`, `${name}-${current}`, "noopener");

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-5xl font-bold tracking-tight text-brand">FirstWords</h1>
        <p className="max-w-[52ch] text-xl text-ink-soft">Emergency assessment for patients who can&apos;t communicate with the crew. The EMT runs the field assessment; the patient answers in their own language, in ASL, or on a picture board.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <button type="button" onClick={start} className="flex min-h-36 flex-col items-start justify-between gap-3 rounded-2xl bg-brand p-6 text-start text-white hover:bg-brand-strong">
          <PhoneCall size={36} aria-hidden />
          <span>
            <span className="block text-2xl font-semibold">Start new call</span>
            <span className="text-white/80">Opens the EMT console with a fresh, empty chart.</span>
          </span>
        </button>
        <Link href="/demo" className="flex min-h-36 flex-col items-start justify-between gap-3 rounded-2xl border-2 border-brand bg-surface p-6 hover:bg-brand-soft">
          <MonitorPlay size={36} className="text-brand" aria-hidden />
          <span>
            <span className="block text-2xl font-semibold">Split-screen demo</span>
            <span className="text-ink-soft">EMT console and patient tablet side by side, with scenario autopilot.</span>
          </span>
        </Link>
      </section>

      {current ? (
        <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-4">
          <span className="text-sm text-ink-soft">Current call in this tab:</span>
          <button type="button" onClick={() => router.push(`/emt?s=${current}`)} className="rounded-lg border border-line px-3 py-2 text-sm font-semibold hover:border-brand">
            EMT console
          </button>
          <button type="button" onClick={() => open("/patient", "patient")} className="flex items-center gap-1 rounded-lg border border-line px-3 py-2 text-sm font-semibold hover:border-brand">
            <ExternalLink size={14} aria-hidden /> Open patient window
          </button>
          <button type="button" onClick={() => open("/er", "er")} className="flex items-center gap-1 rounded-lg border border-line px-3 py-2 text-sm font-semibold hover:border-brand">
            <ExternalLink size={14} aria-hidden /> Open ER window
          </button>
        </section>
      ) : null}

      {scenarios}

      <nav className="flex flex-wrap gap-4 text-sm">
        <Link href="/about" className="font-semibold text-brand underline-offset-4 hover:underline">
          About this prototype
        </Link>
        <Link href="/eval" className="font-semibold text-brand underline-offset-4 hover:underline">
          Evaluation
        </Link>
        <Link href="/patient?preview=1" className="font-semibold text-brand underline-offset-4 hover:underline">
          Patient widget preview
        </Link>
      </nav>
    </main>
  );
}
