import { hasConflict } from "./chart";
import { chartRows, englishValue, FIELD_LABEL } from "./chartView";
import { getLanguage } from "./languages";
import { drugClassLabel } from "./meds";
import { getQuestion } from "./questions";
import { evaluateRules } from "./rules";
import type { ChartField, ChartValue, ClinicalChart, EmtInputs, HandoffTo, Medication, Treatment } from "./schemas";
import { sessionChart, type SessionState } from "./session";

// The MIST handoff is assembled in code from the chart, so it can never
// contain anything the patient did not confirm. Unconfirmed, low-confidence,
// and conflicting items are listed separately. The AI may only add an
// optional narrative paragraph, clearly labeled.

export type HandoffLine = { label: string; value: string };
export type UnconfirmedItem = { label: string; value: string; reason: "Not confirmed by patient" | "Low confidence" | "Conflicting answers" };

export const RECIPIENT_LABEL: Record<HandoffTo, string> = { noems: "arriving NOEMS crew", ed: "the emergency department" };

export type Handoff = {
  sessionId: string;
  /** Who it is for. NOEMS gets the red flags first. */
  to: HandoffTo;
  generatedAt: number;
  callStartedAt: number;
  patient: string;
  communication: {
    mode: SessionState["mode"];
    language: string;
    interpreterNeeded: boolean;
    headline: string;
    preferredMode: string;
    notes: string[];
  };
  mist: { m: HandoffLine[]; i: HandoffLine[]; s: HandoffLine[]; t: HandoffLine[] };
  allergies: string[];
  medications: { name: string; drugClass: string }[];
  history: HandoffLine[];
  redFlags: { title: string; severity: "critical" | "warning"; rule: string; facts: string[]; explanation: string; acknowledged: boolean; basedOnUnconfirmed: boolean }[];
  unconfirmed: UnconfirmedItem[];
  narrative: { text: string; provider: string } | null;
};

const TREATMENT_LABEL: Record<Treatment, string> = {
  oxygen: "Oxygen",
  aspirin: "Aspirin given",
  iv_access: "IV access",
  glucose_checked: "Glucose checked",
  splint: "Splint",
  c_collar: "C-collar",
};

/** A value goes in the main handoff only if the patient confirmed it, it is not low confidence, and it does not conflict. */
function trusted(chart: ClinicalChart, field: ChartField, cv: ChartValue<unknown>): boolean {
  return cv.confirmed && cv.confidence !== "low" && !hasConflict(chart, field);
}

function values(chart: ClinicalChart, field: ChartField): string[] {
  const row = chartRows(chart).find((r) => r.field === field);
  if (!row) return [];
  return row.values.filter((cv) => trusted(chart, field, cv)).map((cv) => englishValue(field, cv.value));
}

function line(chart: ClinicalChart, field: ChartField, label: string = FIELD_LABEL[field]): HandoffLine[] {
  const v = values(chart, field);
  // Notes are sentences; everything else is a short list.
  return v.length ? [{ label, value: field === "notes" ? v.join(" ") : v.join(", ") }] : [];
}

function patientLine(emt: EmtInputs): string {
  const age = emt.age.trim() ? `about ${emt.age.trim()} years old` : "age unknown";
  const sex = emt.sex === "unknown" ? "sex not recorded" : emt.sex;
  return `Patient, ${age}, ${sex}`;
}

function vitalsLine(emt: EmtInputs): HandoffLine[] {
  const v = emt.vitals;
  const parts = [
    v.heartRate && `HR ${v.heartRate}`,
    v.bloodPressure && `BP ${v.bloodPressure}`,
    v.spo2 && `SpO2 ${v.spo2}%`,
    v.respRate && `RR ${v.respRate}`,
    v.glucose && `Glucose ${v.glucose} mg/dL`,
  ].filter(Boolean);
  return parts.length ? [{ label: "Vitals", value: parts.join(", ") }] : [];
}

function communication(state: SessionState, chart: ClinicalChart): Handoff["communication"] {
  const lang = getLanguage(state.language);
  const notes: string[] = [];
  const understand = chart.notes.find((n) => n.sourceQuestionId === "understand" && n.confirmed);
  if (understand && /cannot/.test(understand.value)) notes.push("Patient reported trouble hearing or understanding the questions.");
  if (chart.strokeScreen.speechAbnormal?.value) notes.push("Speech abnormal: slurred, wrong words, or unable to speak.");
  notes.push("Questions were asked with FirstWords. Translations are machine or unverified until checked by a fluent speaker.");

  if (state.mode === "asl") {
    return {
      mode: "asl",
      language: "American Sign Language",
      interpreterNeeded: true,
      headline: "ASL interpreter needed on arrival",
      preferredMode: "ASL. Until the interpreter arrives, use written English, pictures, and yes or no questions.",
      notes,
    };
  }
  if (state.mode === "picture") {
    const needsLang = state.language !== "en";
    return {
      mode: "picture",
      language: needsLang ? `${lang.englishName} (${lang.nativeName})` : "English (reads)",
      interpreterNeeded: needsLang,
      headline: needsLang ? `${lang.englishName} interpreter needed on arrival` : "No spoken-language interpreter needed",
      preferredMode: "Picture board: point at pictures, yes or no answers. Patient may not be able to speak.",
      notes,
    };
  }
  if (state.mode === "spoken" && state.language !== "en") {
    return {
      mode: "spoken",
      language: `${lang.englishName} (${lang.nativeName})`,
      interpreterNeeded: true,
      headline: `${lang.englishName} interpreter needed on arrival`,
      preferredMode: `Spoken ${lang.englishName}. Answers by tapping or speaking on the tablet.`,
      notes,
    };
  }
  return { mode: state.mode, language: "English", interpreterNeeded: false, headline: "No interpreter needed", preferredMode: "Spoken English", notes };
}

function unconfirmedItems(chart: ClinicalChart): UnconfirmedItem[] {
  const out: UnconfirmedItem[] = [];
  for (const r of chartRows(chart)) {
    for (const cv of r.values) {
      if (trusted(chart, r.field, cv)) continue;
      const reason = r.conflict ? "Conflicting answers" : !cv.confirmed ? "Not confirmed by patient" : "Low confidence";
      out.push({ label: r.label, value: englishValue(r.field, cv.value), reason });
    }
  }
  for (const c of chart.conflicts) {
    for (const v of c.values) {
      const value = englishValue(c.field, v.value);
      if (!out.some((o) => o.label === FIELD_LABEL[c.field] && o.value === value)) out.push({ label: FIELD_LABEL[c.field], value, reason: "Conflicting answers" });
    }
  }
  return out;
}

/** Pure: builds the MIST handoff from the session. */
export function buildHandoff(state: SessionState, now: number): Handoff {
  const chart = sessionChart(state);
  const flags = evaluateRules(chart, now);
  const activity = values(chart, "activity");
  const isFall = values(chart, "chiefComplaint").includes(getQuestion("chief_complaint")?.choices.find((c) => c.id === "fall_injury")?.english ?? "");

  const m: HandoffLine[] = [
    ...line(chart, "chiefComplaint"),
    ...(activity.length ? [{ label: isFall ? "Mechanism" : "Activity at onset", value: isFall ? `Fall while: ${activity.join(", ").toLowerCase()}` : activity.join(", ") }] : []),
    ...line(chart, "onset"),
  ];
  const i: HandoffLine[] = [
    ...line(chart, "region", "Location"),
    ...line(chart, "headStrike", "Head strike"),
    ...line(chart, "facialDroop", "Facial droop (EMT)"),
    ...line(chart, "armDrift", "Arm drift (EMT)"),
    ...line(chart, "speechAbnormal", "Speech abnormal (EMT)"),
  ];
  const s: HandoffLine[] = [
    ...line(chart, "quality"),
    ...line(chart, "severity", "Pain"),
    ...line(chart, "radiation"),
    ...line(chart, "provocation"),
    ...line(chart, "lastKnownWell"),
    ...vitalsLine(state.emt),
  ];
  const t: HandoffLine[] = state.emt.treatments.length
    ? [{ label: "Given", value: state.emt.treatments.map((x) => TREATMENT_LABEL[x]).join(", ") }]
    : [{ label: "Given", value: "None recorded" }];

  const meds = chart.medications
    .filter((cv) => trusted(chart, "medications", cv))
    .map((cv) => cv.value as Medication)
    .map((med) =>
      med.generic === "none"
        ? { name: "No medications", drugClass: "" }
        : { name: englishValue("medications", med).split(", ")[0], drugClass: drugClassLabel(med.drugClass) },
    );

  return {
    sessionId: state.id,
    to: state.emt.handoffTo ?? "ed",
    generatedAt: now,
    callStartedAt: state.startedAt,
    patient: patientLine(state.emt),
    communication: communication(state, chart),
    mist: { m, i, s, t },
    allergies: values(chart, "allergies"),
    medications: meds,
    history: [...line(chart, "conditions"), ...line(chart, "pregnancy"), ...line(chart, "intoxication"), ...line(chart, "lastOralIntake"), ...line(chart, "notes")],
    redFlags: flags.map((f) => ({
      title: f.title,
      severity: f.severity,
      rule: `Rule ${f.number}: ${f.rule}`,
      facts: f.facts.map((x) => `${x.label}: ${x.value}${x.confirmed ? "" : " (unconfirmed)"}`),
      explanation: f.explanation,
      acknowledged: state.acknowledgedFlags.includes(f.ruleId),
      basedOnUnconfirmed: f.basedOnUnconfirmed,
    })),
    unconfirmed: unconfirmedItems(chart),
    narrative: null,
  };
}

const lines = (ls: HandoffLine[]) => (ls.length ? ls.map((l) => `${l.label}: ${l.value}`).join("; ") : "None");

/** Plain text for Copy and for the AI narrative prompt. */
export function handoffText(h: Handoff): string {
  const redFlags = `Red flags: ${h.redFlags.length ? h.redFlags.map((f) => `${f.title} [${f.rule}; ${f.facts.join("; ")}]`).join(" | ") : "None"}`;
  // A paramedic crew taking over on scene needs the red flags before anything else.
  const noems = h.to === "noems";
  const out = [
    `FirstWords handoff to ${RECIPIENT_LABEL[h.to]}`,
    h.patient,
    ...(noems ? [redFlags] : []),
    `Communication: ${h.communication.headline}. Language: ${h.communication.language}. Preferred mode: ${h.communication.preferredMode}`,
    `M: ${lines(h.mist.m)}`,
    `I: ${lines(h.mist.i)}`,
    `S: ${lines(h.mist.s)}`,
    `T: ${lines(h.mist.t)}`,
    `Allergies: ${h.allergies.length ? h.allergies.join(", ") : "None confirmed"}`,
    `Medications: ${h.medications.length ? h.medications.map((m) => (m.drugClass ? `${m.name}, ${m.drugClass}` : m.name)).join("; ") : "None confirmed"}`,
    `History: ${lines(h.history)}`,
    ...(noems ? [] : [redFlags]),
    `Unconfirmed: ${h.unconfirmed.length ? h.unconfirmed.map((u) => `${u.label}: ${u.value} (${u.reason})`).join("; ") : "None"}`,
  ];
  if (h.narrative) out.push(`AI summary, review before use: ${h.narrative.text}`);
  out.push("Prototype for demonstration. Not for clinical use.");
  return out.join("\n");
}
