"use client";

import { useSearchParams } from "next/navigation";
import { ErLive } from "@/components/er/ErLive";
import { NoSession } from "@/components/shared/NoSession";

export function ErRoute() {
  const s = useSearchParams().get("s");
  if (!s) return <NoSession what="ER handoff screen" />;
  return <ErLive key={s} sessionId={s} />;
}
