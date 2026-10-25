import { hasConflict } from "./chart";
import { displayValue } from "./interpret";
import { drugClassLabel } from "./meds";
import type { ChartField, ChartValue, ClinicalChart, Medication } from "./schemas";

/** EMT- and ER-facing labels, in chart order. */
export const FIELD_ORDER: { field: ChartField; label: string }[] = [
  { field: "chiefComplaint", label: "Chief complaint" },
  { field: "onset", label: "Onset" },
  { field: "activity", label: "Activity at onset" },
  { field: "provocation", label: "Better or worse with" },
  { field: "quality", label: "Quality" },
  { field: "region", label: "Location" },
  { field: "radiation", label: "Radiates to" },
  { field: "severity", label: "Severity" },
  { field: "allergies", label: "Allergies" },
  { field: "medications", label: "Medications" },
  { field: "conditions", label: "Conditions" },
  { field: "lastOralIntake", label: "Last oral intake" },
  { field: "headStrike", label: "Head strike" },
  { field: "pregnancy", label: "Pregnancy" },
  { field: "intoxication", label: "Alcohol or drugs today" },
  { field: "facialDroop", label: "Facial droop" },
  { field: "armDrift", label: "Arm drift" },
  { field: "speechAbnormal", label: "Speech abnormal" },
  { field: "lastKnownWell", label: "Last known well" },
  { field: "notes", label: "Notes" },
];

export const FIELD_LABEL: Record<ChartField, string> = Object.fromEntries(FIELD_ORDER.map((f) => [f.field, f.label])) as Record<ChartField, string>;

export function fieldValues(chart: ClinicalChart, field: ChartField): ChartValue<unknown>[] {
  switch (field) {
    case "facialDroop":
    case "armDrift":
    case "speechAbnormal": {
      const v = chart.strokeScreen[field];
      return v ? [v] : [];
    }
    case "provocation":
    case "region":
    case "radiation":
    case "conditions":
    case "notes":
    case "allergies":
    case "medications":
      return chart[field] as ChartValue<unknown>[];
    default: {
      const v = chart[field] as ChartValue<unknown> | undefined;
      return v ? [v] : [];
    }
  }
}

function clock(epochMs: number): string {
  const d = new Date(epochMs);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** English display for one chart value, with clinical extras (drug class, clock time). */
export function englishValue(field: ChartField, v: unknown): string {
  if (field === "medications") {
    const m = v as Medication;
    if (m.generic === "none") return "No medications";
    return `${displayValue(field, m, "en")}, ${drugClassLabel(m.drugClass)}`;
  }
  if ((field === "radiation" || field === "region") && v === "none") return "Does not spread";
  const base = displayValue(field, v, "en");
  if (field === "onset" || field === "lastOralIntake" || field === "lastKnownWell") {
    const at = (v as { absoluteTime?: number | null }).absoluteTime;
    return at != null ? `${base} (about ${clock(at)})` : base;
  }
  if (field === "headStrike" || field === "pregnancy" || field === "intoxication" || field === "facialDroop" || field === "armDrift" || field === "speechAbnormal") {
    return v ? "Yes" : "No";
  }
  return base;
}

export type ChartRow = { field: ChartField; label: string; values: ChartValue<unknown>[]; conflict: boolean };

export function chartRows(chart: ClinicalChart): ChartRow[] {
  return FIELD_ORDER.map(({ field, label }) => ({ field, label, values: fieldValues(chart, field), conflict: hasConflict(chart, field) }));
}
