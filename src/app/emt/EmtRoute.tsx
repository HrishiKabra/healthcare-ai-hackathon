"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { EmtConsole } from "@/components/emt/EmtConsole";
import { useEmtSession } from "@/hooks/useEmtSession";
import { NoSession } from "@/components/shared/NoSession";

function Console({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const session = useEmtSession(sessionId);
  return <EmtConsole session={session} onEnded={() => router.push("/")} />;
}

export function EmtRoute() {
  const s = useSearchParams().get("s");
  if (!s) return <NoSession what="EMT console" />;
  return <Console key={s} sessionId={s} />;
}
