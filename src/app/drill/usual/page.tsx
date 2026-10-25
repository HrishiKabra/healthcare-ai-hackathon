"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { UsualDrill } from "@/components/drill/UsualDrill";

function UsualDrillRoute() {
  return <UsualDrill runId={useSearchParams().get("run")} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <UsualDrillRoute />
    </Suspense>
  );
}
