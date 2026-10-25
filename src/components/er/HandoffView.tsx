"use client";

import { Copy, Languages, Printer, ShieldAlert, Sparkles, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { handoffText, RECIPIENT_LABEL, type Handoff, type HandoffLine } from "@/lib/handoff";

function clock(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function Mist({ letter, title, lines }: { letter: string; title: string; lines: HandoffLine[] }) {
  return (
    <section className="grid grid-cols-[3rem_1fr] gap-3 border-b border-line py-3 last:border-0">
      <span className="flex size-12 items-center justify-center rounded-xl bg-brand text-2xl font-bold text-white" aria-hidden>
        {letter}
      </span>
      <div>
        <h3 className="text-sm font-semibold text-ink-soft">{title}</h3>
        {lines.length ? (
          <dl className="mt-1 grid grid-cols-[minmax(8rem,auto)_1fr] gap-x-4 gap-y-1">
            {lines.map((l) => (
              <div key={l.label} className="contents">
                <dt className="text-ink-soft">{l.label}</dt>
                <dd className="font-semibold">{l.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-1 text-muted">Nothing confirmed</p>
        )}
      </div>
    </section>
  );
}

/** The ER's view of the handoff, laid out by MIST. */
export function HandoffView({ handoff, receivedAt }: { handoff: Handoff; receivedAt: number }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(handoffText(handoff));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  const c = handoff.communication;
  // A paramedic crew taking over on scene sees the red flags first.
  const noems = handoff.to === "noems";
  const redFlags = handoff.redFlags.length ? (
    <section aria-label="Red flags" className="flex flex-col gap-2">
      {handoff.redFlags.map((f) => (
        <div key={f.title} className={`rounded-2xl border-s-8 border p-3 ${f.severity === "critical" ? "border-critical bg-critical-soft" : "border-warning bg-warning-soft"}`}>
          <h2 className={`flex items-center gap-2 text-lg font-bold ${f.severity === "critical" ? "text-critical" : "text-warning"}`}>
            <ShieldAlert size={20} aria-hidden /> {f.title}
            {f.basedOnUnconfirmed ? <span className="text-xs font-semibold text-unconfirmed">Based on unconfirmed answer</span> : null}
          </h2>
          <p className="text-sm">{f.rule}</p>
          <p className="text-sm text-ink-soft">{f.facts.join("; ")}</p>
          <p className="mt-1 text-sm">{f.explanation}</p>
        </div>
      ))}
    </section>
  ) : null;

  return (
    <article className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Handoff to {RECIPIENT_LABEL[handoff.to ?? "ed"]}</h1>
          <p className="text-ink-soft">{handoff.patient}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-ok-soft px-3 py-1 text-sm font-semibold text-ok">Received {clock(receivedAt)}</span>
          <button type="button" onClick={() => void copy()} className="no-print flex items-center gap-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold hover:border-brand">
            <Copy size={16} aria-hidden /> {copied ? "Copied" : "Copy"}
          </button>
          <button type="button" onClick={() => window.print()} className="no-print flex items-center gap-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold hover:border-brand">
            <Printer size={16} aria-hidden /> Print
          </button>
        </div>
      </header>

      {noems ? redFlags : null}
      <section aria-label="Communication needs" className="rounded-2xl border-2 border-signal bg-signal-soft p-4">
        <div className="flex items-start gap-3">
          <Languages size={28} className="mt-0.5 shrink-0 text-warning" aria-hidden />
          <div>
            <h2 className="text-xl font-bold text-ink">{c.headline}</h2>
            <p className="mt-1">
              <span className="text-ink-soft">Language:</span> <strong>{c.language}</strong>
            </p>
            <p>
              <span className="text-ink-soft">Preferred mode:</span> {c.preferredMode}
            </p>
            {c.notes.map((n) => (
              <p key={n} className="mt-1 text-sm text-ink-soft">
                {n}
              </p>
            ))}
          </div>
        </div>
      </section>

      {noems ? null : redFlags}
      <section aria-label="MIST" className="rounded-2xl border border-line bg-surface px-4">
        <Mist letter="M" title="Medical complaint or mechanism" lines={handoff.mist.m} />
        <Mist letter="I" title="Injuries and inspection findings" lines={handoff.mist.i} />
        <Mist letter="S" title="Signs and symptoms" lines={handoff.mist.s} />
        <Mist letter="T" title="Treatment so far" lines={handoff.mist.t} />
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="font-semibold">Allergies</h2>
          <p className="mt-1">{handoff.allergies.length ? handoff.allergies.join(", ") : <span className="text-muted">None confirmed</span>}</p>
          <h2 className="mt-3 font-semibold">Medications</h2>
          {handoff.medications.length ? (
            <ul className="mt-1">
              {handoff.medications.map((m) => (
                <li key={m.name}>
                  <strong>{m.name}</strong>
                  {m.drugClass ? <span className="text-ink-soft">, {m.drugClass}</span> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-muted">None confirmed</p>
          )}
        </section>
        <section className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="font-semibold">History</h2>
          {handoff.history.length ? (
            <dl className="mt-1 flex flex-col gap-1">
              {handoff.history.map((l) => (
                <div key={l.label}>
                  <dt className="inline text-ink-soft">{l.label}: </dt>
                  <dd className="inline font-semibold">{l.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-1 text-muted">None confirmed</p>
          )}
        </section>
      </div>

      <section aria-label="Unconfirmed items" className="rounded-2xl border border-dashed border-unconfirmed bg-unconfirmed-soft p-4">
        <h2 className="flex items-center gap-2 font-semibold text-unconfirmed">
          <TriangleAlert size={18} aria-hidden /> Unconfirmed, low confidence, or conflicting (verify before acting)
        </h2>
        {handoff.unconfirmed.length ? (
          <ul className="mt-2 flex flex-col gap-1">
            {handoff.unconfirmed.map((u, i) => (
              <li key={i}>
                <span className="text-ink-soft">{u.label}:</span> <strong>{u.value}</strong> <span className="text-sm text-unconfirmed">({u.reason})</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-ink-soft">None. Every item above was confirmed by the patient.</p>
        )}
      </section>

      {handoff.narrative ? (
        <section aria-label="AI summary" className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Sparkles size={18} className="text-brand" aria-hidden /> AI summary, review before use
          </h2>
          <p className="mt-1 text-ink-soft">{handoff.narrative.text}</p>
        </section>
      ) : null}
    </article>
  );
}
