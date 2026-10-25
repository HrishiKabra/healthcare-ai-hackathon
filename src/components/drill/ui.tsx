import Link from "next/link";
import { getLanguage } from "@/lib/languages";
import type { Scenario } from "@/lib/scenarios";

/** 45 s, or 2:14 for anything over a minute. */
export function fmtSecs(s: number | null | undefined): string {
  if (s == null) return "Not obtained";
  if (s < 60) return `${Math.round(s)} s`;
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.round(s % 60)).padStart(2, "0")}`;
}

export function scenarioLanguage(s: Scenario): string {
  if (s.mode === "asl") return "ASL";
  if (s.mode === "picture") return "Picture board";
  return getLanguage(s.language).englishName;
}

export function DrillPage({ title, intro, children }: { title: string; intro?: React.ReactNode; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-8">
      <header className="flex flex-col gap-2">
        <nav className="flex gap-4 text-sm font-semibold text-brand">
          <Link href="/" className="hover:underline">
            FirstWords
          </Link>
          <Link href="/drill" className="hover:underline">
            Field test
          </Link>
          <Link href="/drill/results" className="hover:underline">
            Results
          </Link>
        </nav>
        <h1 className="text-3xl font-bold">{title}</h1>
        {intro ? <div className="max-w-[68ch] text-ink-soft">{intro}</div> : null}
      </header>
      {children}
    </main>
  );
}

export const card = "rounded-2xl border border-line bg-surface p-5";
export const fieldLabel = "flex flex-col gap-1 text-sm font-semibold text-ink-soft";
export const input = "h-11 rounded-lg border border-line bg-surface px-3 text-base text-ink focus:border-brand";
export const primaryButton = "rounded-xl bg-brand px-5 py-3 text-base font-semibold text-white hover:bg-brand-strong disabled:opacity-40";
export const secondaryButton = "rounded-xl border border-line bg-surface px-5 py-3 text-base font-semibold hover:border-brand";
