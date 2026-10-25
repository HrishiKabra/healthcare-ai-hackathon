"use client";

import { useRouter } from "next/navigation";
import { getLanguage } from "@/lib/languages";
import { SCENARIOS, type Scenario } from "@/lib/scenarios";
import { makeSessionId, rememberCurrentSession } from "@/lib/sessionId";

const MODE = { spoken: "Spoken language", asl: "ASL", picture: "Picture board" } as const;

const GROUPS: { title: string; note: string; scenarios: Scenario[] }[] = [
  {
    title: "Tulane campus",
    note: "Calls Tulane EMS could run tomorrow: international students and a visiting parent, handed off to NOEMS.",
    scenarios: SCENARIOS.filter((s) => s.setting === "campus"),
  },
  {
    title: "Demo scenarios",
    note: "The three calls from the demo video: a spoken language, ASL, and the picture board.",
    scenarios: SCENARIOS.filter((s) => s.setting !== "campus"),
  },
];

export function ScenarioMenu() {
  const router = useRouter();
  const load = (scenarioId: string) => {
    const id = makeSessionId();
    rememberCurrentSession(id);
    router.push(`/emt?s=${id}&scenario=${scenarioId}`);
  };
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold">Load a scenario</h2>
      <p className="text-sm text-ink-soft">Opens the EMT console with the patient&apos;s mode, language, and vitals filled in. Open the patient window, then use the autopilot bar to play the patient&apos;s answers.</p>
      {GROUPS.map((g) => (
        <div key={g.title} className="flex flex-col gap-2">
          <h3 className="pt-2 font-semibold">{g.title}</h3>
          <p className="text-sm text-ink-soft">{g.note}</p>
          <div className="grid gap-3 md:grid-cols-3">
            {g.scenarios.map((s) => (
              <button key={s.id} type="button" onClick={() => load(s.id)} className="flex flex-col items-start gap-2 rounded-2xl border border-line bg-surface p-4 text-start hover:border-brand">
                <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-strong">
                  {s.mode === "spoken" ? getLanguage(s.language).englishName : MODE[s.mode]}
                </span>
                <span className="text-lg font-semibold leading-tight">{s.title}</span>
                <span className="text-sm text-ink-soft">{s.summary}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
