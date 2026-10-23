import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "FirstWords: About this prototype" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="flex flex-col gap-2 leading-relaxed text-ink-soft">{children}</div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <main className="mx-auto flex w-full max-w-[72ch] flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <Link href="/" className="text-sm font-semibold text-brand hover:underline">
          FirstWords
        </Link>
        <h1 className="text-3xl font-bold">About this prototype</h1>
        <p className="text-lg text-ink-soft">
          FirstWords helps an ambulance crew run the standard field assessment with a patient who cannot communicate with them: a patient who speaks another language, a Deaf patient who signs, or a patient who cannot speak. It is a hackathon prototype. It is not a medical device and is not for clinical use.
        </p>
      </header>

      <Section title="A bridge, not a replacement">
        <p>
          FirstWords covers the first minutes, until a qualified medical interpreter is reached. It does not replace one. The console has a &quot;Call live interpreter&quot; button for that reason, and the handoff tells the hospital which interpreter to have ready on arrival.
        </p>
      </Section>

      <Section title="What data is used">
        <p>
          The patient&apos;s answers to the assessment questions (taps, or words they speak or type), the EMT&apos;s quick fields (approximate age, sex, vitals, treatments), and the EMT&apos;s stroke-check observations. No name, date of birth, address, insurance, or other identifier is asked for or stored.
        </p>
      </Section>

      <Section title="Nothing is stored">
        <p>
          There is no database and no analytics. The session lives in the browser&apos;s memory and in <code>sessionStorage</code> for the EMT tab, so a reload does not lose the call. The EMT, patient, and ER windows talk to each other through the browser&apos;s <code>BroadcastChannel</code> on the same device; nothing goes through a server. &quot;End call&quot; wipes the session from every window. The API routes do not log request bodies. Browser <code>localStorage</code> holds only settings, never patient data.
        </p>
      </Section>

      <Section title="What is sent to the AI provider">
        <p>
          Only when the patient answers in their own words (instead of tapping), the text of that one answer is sent with the English text of the question, to translate it and to pull out chart fields. When the EMT types a question of their own, that question is sent to be translated. When a red flag fires, the rule and its facts can be sent to reword the explanation, and when the handoff is generated, its text can be sent for an optional summary paragraph.
        </p>
        <p>
          In demo mode (the default, and the hosted demo) nothing is sent anywhere: canned responses and keyword matching stand in for the model. In on-device mode, everything stays on the laptop with an open model run by Ollama. Only in cloud mode, which the team must turn on with a key, does text go to Anthropic&apos;s API.
        </p>
      </Section>

      <Section title="Safety design">
        <p>
          Red flags are deterministic rules written in code, and every flag shows the rule and the facts that triggered it. The AI never decides whether a flag fires; it only helps read free answers. Medication classes come from a local table, with the model&apos;s guess only as a fallback.
        </p>
        <p>
          Every answer is read back to the patient in their language (&quot;You said: ... Is this right?&quot;), built from what was understood, and only confirmed answers count as confirmed. Unconfirmed, low-confidence, and conflicting items are marked in the chart and listed separately in the handoff.
        </p>
      </Section>

      <Section title="Real deployment would need">
        <ul className="list-disc ps-5">
          <li>A HIPAA business associate agreement (BAA) with the AI vendor before any patient words are sent to a cloud model, or an on-device model only.</li>
          <li>Translations checked by fluent medical interpreters for every language (all translations here are marked unverified).</li>
          <li>ASL content created with Deaf signers. The ASL video slots in this prototype are empty on purpose: signed questions must be recorded by fluent Deaf signers, not generated.</li>
          <li>Clinical review of the question bank and the red-flag rules with EMS medical direction, and integration with the agency&apos;s interpreter line and patient care record.</li>
        </ul>
      </Section>

      <p className="text-sm text-muted">
        Prototype for the Freeman AI Innovation Challenge (AI in Healthcare). See also the{" "}
        <Link href="/eval" className="font-semibold text-brand hover:underline">
          evaluation
        </Link>
        .
      </p>
    </main>
  );
}
