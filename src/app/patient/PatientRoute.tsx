"use client";

import { useSearchParams } from "next/navigation";
import { PatientPreview } from "@/components/patient/PatientPreview";

export function PatientRoute() {
  const params = useSearchParams();
  return <PatientPreview initialLang={params.get("lang")} initialMode={params.get("mode")} initialQuestion={params.get("q")} />;
}
