"use client";

import { useSearchParams } from "next/navigation";
import { PatientLive } from "@/components/patient/PatientLive";
import { PatientPreview } from "@/components/patient/PatientPreview";
import { NoSession } from "@/components/shared/NoSession";

export function PatientRoute() {
  const params = useSearchParams();
  const s = params.get("s");
  if (params.get("preview")) return <PatientPreview initialLang={params.get("lang")} initialMode={params.get("mode")} initialQuestion={params.get("q")} />;
  if (!s) return <NoSession what="patient screen" />;
  return <PatientLive key={s} sessionId={s} />;
}
