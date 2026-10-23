"use client";

import { TREATMENTS, type EmtInputs, type Sex, type Treatment, type Vitals } from "@/lib/schemas";

const TREATMENT_LABEL: Record<Treatment, string> = {
  oxygen: "Oxygen",
  aspirin: "Aspirin given",
  iv_access: "IV access",
  glucose_checked: "Glucose checked",
  splint: "Splint",
  c_collar: "C-collar",
};

const VITALS: { key: keyof Vitals; label: string; placeholder: string }[] = [
  { key: "heartRate", label: "HR", placeholder: "bpm" },
  { key: "bloodPressure", label: "BP", placeholder: "120/80" },
  { key: "spo2", label: "SpO2", placeholder: "%" },
  { key: "respRate", label: "RR", placeholder: "/min" },
  { key: "glucose", label: "Glucose", placeholder: "mg/dL" },
];

const input = "h-9 w-full rounded-lg border border-line bg-surface px-2 text-sm focus:border-brand";

/** Quick EMT fields that complete the handoff (age, sex, vitals, treatment). */
export function PatientInputs({
  emt,
  onChange,
  speechAbnormal,
  onSpeechAbnormal,
}: {
  emt: EmtInputs;
  onChange: (patch: Partial<EmtInputs>) => void;
  speechAbnormal: boolean | undefined;
  onSpeechAbnormal: (v: boolean) => void;
}) {
  const toggle = (t: Treatment) => onChange({ treatments: emt.treatments.includes(t) ? emt.treatments.filter((x) => x !== t) : [...emt.treatments, t] });
  return (
    <section aria-label="Patient details and treatment" className="flex flex-col gap-3">
      <h2 className="text-base font-semibold">Patient</h2>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
          Approx. age
          <input className={input} inputMode="numeric" value={emt.age} onChange={(e) => onChange({ age: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
          Sex
          <select className={input} value={emt.sex} onChange={(e) => onChange({ sex: e.target.value as Sex })}>
            <option value="unknown">Unknown</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
          </select>
        </label>
      </div>
      <fieldset className="grid grid-cols-3 gap-2">
        <legend className="mb-1 text-xs font-semibold text-ink-soft">Vitals</legend>
        {VITALS.map((v) => (
          <label key={v.key} className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
            {v.label}
            <input className={input} value={emt.vitals[v.key]} placeholder={v.placeholder} onChange={(e) => onChange({ vitals: { ...emt.vitals, [v.key]: e.target.value } })} />
          </label>
        ))}
      </fieldset>
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-xs font-semibold text-ink-soft">Treatment so far</legend>
        <div className="grid grid-cols-2 gap-1">
          {TREATMENTS.map((t) => (
            <label key={t} className="flex min-h-9 items-center gap-2 rounded-lg px-1 text-sm hover:bg-canvas">
              <input type="checkbox" className="size-4 accent-[var(--color-brand)]" checked={emt.treatments.includes(t)} onChange={() => toggle(t)} />
              {TREATMENT_LABEL[t]}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex min-h-9 items-center gap-2 rounded-lg border border-line bg-surface px-2 text-sm">
        <input type="checkbox" className="size-4 accent-[var(--color-critical)]" checked={speechAbnormal === true} onChange={(e) => onSpeechAbnormal(e.target.checked)} />
        Speech problem observed (slurred, wrong words, or cannot speak)
      </label>
    </section>
  );
}

export { TREATMENT_LABEL };
