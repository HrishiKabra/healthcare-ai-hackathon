import { isRealAllergy } from "./chart";
import { displayValue } from "./interpret";
import { drugClassLabel } from "./meds";
import type { ChartField, ChartValue, ClinicalChart, Fact, Medication, RedFlag } from "./schemas";

// Red flags are deterministic rules in code. The AI never decides whether a
// flag fires; it may only rephrase the explanation shown next to it.

type Ctx = { chart: ClinicalChart; now: number };

export type Rule = {
  id: string;
  number: number;
  title: string;
  severity: "critical" | "warning";
  /** The rule in one plain line, shown so the EMT can see exactly why it fired. */
  rule: string;
  when: (c: Ctx) => boolean;
  facts: (c: Ctx) => Fact[];
  explanation: (c: Ctx) => string;
};

const ANTICOAGULANT = "anticoagulant";
const DIABETES_CLASSES = ["insulin", "antidiabetic"];

function fact(label: string, field: ChartField, cv: ChartValue<unknown> | undefined): Fact[] {
  if (!cv) return [];
  return [{ label, value: displayValue(field, cv.value, "en"), confirmed: cv.confirmed }];
}

function medFact(cv: ChartValue<Medication>): Fact {
  return {
    label: "Medication",
    value: `${displayValue("medications", cv.value, "en")}, ${drugClassLabel(cv.value.drugClass)}`,
    confirmed: cv.confirmed,
  };
}

const cc = (c: ClinicalChart) => c.chiefComplaint?.value;
const ccIs = (c: ClinicalChart, ...ids: string[]) => ids.includes(cc(c) ?? "");
const notesMatch = (c: ClinicalChart, re: RegExp) => c.notes.filter((n) => re.test(n.value));
const SWELLING = /swell|swollen|hinchad|sưng|肿|تورم|सूज/i;
const CONFUSION = /confus|disorient|not making sense/i;

export function hoursSince(epochMs: number | null | undefined, now: number): number | null {
  if (epochMs == null) return null;
  return Math.max(0, (now - epochMs) / 3_600_000);
}

function clock(epochMs: number): string {
  const d = new Date(epochMs);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export const RULES: Rule[] = [
  {
    id: "anticoag_head",
    number: 1,
    title: "Blood thinner with fall or head strike",
    severity: "critical",
    rule: "Anticoagulant medication AND (fall or injury OR hit head)",
    when: ({ chart }) =>
      chart.medications.some((m) => m.value.drugClass === ANTICOAGULANT) &&
      (ccIs(chart, "fall_injury") || chart.headStrike?.value === true),
    facts: ({ chart }) => [
      ...chart.medications.filter((m) => m.value.drugClass === ANTICOAGULANT).map(medFact),
      ...(ccIs(chart, "fall_injury") ? fact("Chief complaint", "chiefComplaint", chart.chiefComplaint) : []),
      ...(chart.headStrike?.value === true ? fact("Hit head", "headStrike", chart.headStrike) : []),
    ],
    explanation: () =>
      "Blood thinners raise the risk of bleeding inside the skull after a fall or head strike, even when the patient looks well. Consider a trauma center and early head CT.",
  },
  {
    id: "stroke_alert",
    number: 2,
    title: "Stroke alert",
    severity: "critical",
    rule: "Facial droop OR arm drift OR abnormal speech",
    when: ({ chart }) => {
      const s = chart.strokeScreen;
      return s.facialDroop?.value === true || s.armDrift?.value === true || s.speechAbnormal?.value === true;
    },
    facts: ({ chart, now }) => {
      const s = chart.strokeScreen;
      const out: Fact[] = [
        ...(s.facialDroop?.value ? fact("Facial droop", "facialDroop", s.facialDroop) : []),
        ...(s.armDrift?.value ? fact("Arm drift", "armDrift", s.armDrift) : []),
        ...(s.speechAbnormal?.value ? fact("Abnormal speech", "speechAbnormal", s.speechAbnormal) : []),
      ];
      const lkw = chart.lastKnownWell;
      if (lkw) {
        const at = lkw.value.absoluteTime;
        const h = hoursSince(at, now);
        out.push({
          label: "Last known well",
          value: at != null ? `${displayValue("lastKnownWell", lkw.value, "en")} (about ${clock(at)})` : "Unknown",
          confirmed: lkw.confirmed,
        });
        if (h != null) out.push({ label: "Hours since last known well", value: h.toFixed(1), confirmed: lkw.confirmed });
      } else {
        out.push({ label: "Last known well", value: "Not yet asked", confirmed: false });
      }
      return out;
    },
    explanation: ({ chart, now }) => {
      const h = hoursSince(chart.lastKnownWell?.value.absoluteTime, now);
      if (h == null) return "Positive stroke screen. Last known well is not known yet. Ask the patient, family, or bystanders, and pre-alert the stroke center.";
      if (h <= 4.5)
        return `Positive stroke screen, last known well about ${h.toFixed(1)} hours ago. This is inside the 4.5 hour window for clot-busting medicine. Pre-alert the stroke center now.`;
      if (h <= 24)
        return `Positive stroke screen, last known well about ${h.toFixed(1)} hours ago. Outside the 4.5 hour window, but the patient may still qualify for clot removal. Pre-alert the stroke center.`;
      return `Positive stroke screen, last known well more than 24 hours ago. Transport per stroke protocol.`;
    },
  },
  {
    id: "chest_pain_aspirin_allergy",
    number: 3,
    title: "Chest pain with aspirin or NSAID allergy",
    severity: "critical",
    rule: "Chest pain AND allergy to aspirin or NSAIDs",
    when: ({ chart }) => ccIs(chart, "chest_pain") && chart.allergies.some((a) => a.value.category === "aspirin" || a.value.category === "nsaid"),
    facts: ({ chart }) => [
      ...fact("Chief complaint", "chiefComplaint", chart.chiefComplaint),
      ...chart.allergies
        .filter((a) => a.value.category === "aspirin" || a.value.category === "nsaid")
        .flatMap((a) => fact("Allergy", "allergies", a)),
    ],
    explanation: () =>
      "Aspirin is standard care for chest pain, but this patient reports an aspirin or NSAID allergy. Do not give aspirin until the allergy and reaction are confirmed.",
  },
  {
    id: "aortic_dissection",
    number: 4,
    title: "Consider a torn aorta",
    severity: "critical",
    rule: "Chest pain AND (tearing quality OR spreads to the back)",
    when: ({ chart }) =>
      ccIs(chart, "chest_pain") && (chart.quality?.value === "tearing" || chart.radiation.some((r) => r.value === "back")),
    facts: ({ chart }) => [
      ...fact("Chief complaint", "chiefComplaint", chart.chiefComplaint),
      ...(chart.quality?.value === "tearing" ? fact("Feels like", "quality", chart.quality) : []),
      ...chart.radiation.filter((r) => r.value === "back").flatMap((r) => fact("Spreads to", "radiation", r)),
    ],
    explanation: () =>
      "Tearing chest pain, or chest pain that moves to the back, can mean a torn aorta. Compare blood pressure in both arms and hold blood thinners until it is ruled out.",
  },
  {
    id: "allergic_reaction",
    number: 5,
    title: "Possible allergic reaction",
    severity: "critical",
    rule: "Known allergy AND (trouble breathing OR swelling of the face or throat)",
    when: ({ chart }) =>
      chart.allergies.some((a) => isRealAllergy(a.value)) && (ccIs(chart, "trouble_breathing") || notesMatch(chart, SWELLING).length > 0),
    facts: ({ chart }) => [
      ...chart.allergies.filter((a) => isRealAllergy(a.value)).flatMap((a) => fact("Allergy", "allergies", a)),
      ...(ccIs(chart, "trouble_breathing") ? fact("Chief complaint", "chiefComplaint", chart.chiefComplaint) : []),
      ...notesMatch(chart, SWELLING).flatMap((n) => fact("Note", "notes", n)),
    ],
    explanation: () =>
      "A known allergy with trouble breathing or swelling may be anaphylaxis. Watch the airway closely and consider epinephrine per protocol.",
  },
  {
    id: "check_glucose",
    number: 6,
    title: "Check blood sugar",
    severity: "warning",
    rule: "(Diabetes OR insulin or diabetes medicine) AND (weakness, dizziness, or confusion)",
    when: ({ chart }) => {
      const diabetic =
        chart.conditions.some((c) => c.value === "diabetes") || chart.medications.some((m) => DIABETES_CLASSES.includes(m.value.drugClass));
      const symptom = ccIs(chart, "weakness_numbness", "dizziness") || notesMatch(chart, CONFUSION).length > 0;
      return diabetic && symptom;
    },
    facts: ({ chart }) => [
      ...chart.conditions.filter((c) => c.value === "diabetes").flatMap((c) => fact("Condition", "conditions", c)),
      ...chart.medications.filter((m) => DIABETES_CLASSES.includes(m.value.drugClass)).map(medFact),
      ...(ccIs(chart, "weakness_numbness", "dizziness") ? fact("Chief complaint", "chiefComplaint", chart.chiefComplaint) : []),
      ...notesMatch(chart, CONFUSION).flatMap((n) => fact("Note", "notes", n)),
    ],
    explanation: () =>
      "Low or high blood sugar can cause weakness, dizziness, or confusion and can look like a stroke. Check blood glucose now.",
  },
  {
    id: "pregnancy_belly",
    number: 7,
    title: "Pregnancy with belly pain or bleeding",
    severity: "critical",
    rule: "Pregnant or possibly pregnant AND (belly pain OR bleeding)",
    when: ({ chart }) =>
      (chart.pregnancy?.value === true || chart.conditions.some((c) => c.value === "pregnancy")) && ccIs(chart, "belly_pain", "bleeding"),
    facts: ({ chart }) => [
      ...(chart.pregnancy?.value === true ? fact("Pregnant", "pregnancy", chart.pregnancy) : []),
      ...chart.conditions.filter((c) => c.value === "pregnancy").flatMap((c) => fact("Condition", "conditions", c)),
      ...fact("Chief complaint", "chiefComplaint", chart.chiefComplaint),
    ],
    explanation: () =>
      "Belly pain or bleeding in pregnancy can mean an ectopic pregnancy or other emergency. Prioritize transport and notify the receiving hospital.",
  },
  {
    id: "severe_pain_unknown",
    number: 8,
    title: "Severe pain, unknown cause",
    severity: "warning",
    rule: "Pain 8 or higher AND no clear chief complaint",
    when: ({ chart }) => (chart.severity?.value ?? 0) >= 8 && (!chart.chiefComplaint || ccIs(chart, "other")),
    facts: ({ chart }) => [
      ...fact("Pain level", "severity", chart.severity),
      chart.chiefComplaint ? fact("Chief complaint", "chiefComplaint", chart.chiefComplaint)[0] : { label: "Chief complaint", value: "Unknown", confirmed: false },
    ],
    explanation: () => "Severe pain without a clear cause can hide a serious problem. Prioritize transport.",
  },
  {
    id: "conflicting_meds_allergies",
    number: 9,
    title: "Conflicting answers on allergies or medicines",
    severity: "warning",
    rule: "The patient gave answers that disagree about allergies or medications",
    when: ({ chart }) => chart.conflicts.some((c) => c.field === "allergies" || c.field === "medications"),
    facts: ({ chart }) =>
      chart.conflicts
        .filter((c) => c.field === "allergies" || c.field === "medications")
        .flatMap((c) =>
          c.values.map((v) => ({
            label: c.field === "allergies" ? "Allergy answer" : "Medication answer",
            value: displayValue(c.field, v.value, "en"),
            confirmed: v.confirmed,
          })),
        ),
    explanation: () => "Answers about allergies or medicines do not agree. Confirm with the patient before giving any drug.",
  },
];

/** Pure: evaluates every rule against the chart. Rules fire on unconfirmed data too, and say so. */
export function evaluateRules(chart: ClinicalChart, now: number = Date.now()): RedFlag[] {
  const ctx = { chart, now };
  return RULES.filter((r) => r.when(ctx)).map((r) => {
    const facts = r.facts(ctx);
    return {
      ruleId: r.id,
      number: r.number,
      title: r.title,
      severity: r.severity,
      rule: r.rule,
      facts,
      explanation: r.explanation(ctx),
      basedOnUnconfirmed: facts.some((f) => !f.confirmed),
    };
  });
}

export function getRule(id: string): Rule | undefined {
  return RULES.find((r) => r.id === id);
}
