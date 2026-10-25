"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { DrillSurveyForm } from "@/components/drill/DrillSurveyForm";

function DrillSurveyFormRoute() {
  return <DrillSurveyForm runId={useSearchParams().get("run")} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <DrillSurveyFormRoute />
    </Suspense>
  );
}
