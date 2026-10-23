"use client";

import { useState } from "react";
import { Icon } from "@/components/shared/Icon";
import { t } from "@/lib/i18n";

/**
 * Plays public/asl/<questionId>.mp4. ASL clips are recorded by a fluent Deaf
 * signer later; until a clip exists, the pictogram is shown with a small dev label.
 */
export function AslSlot({ questionId, icon, src }: { questionId: string; icon: string; src?: string }) {
  const url = `/${src || `asl/${questionId}.mp4`}`;
  const [missing, setMissing] = useState<string | null>(null);
  const isMissing = missing === url;

  if (isMissing) {
    return (
      <div className="flex h-full min-h-56 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-line bg-canvas p-4">
        <Icon name={icon} size={120} strokeWidth={1.5} className="text-brand" />
        <span className="rounded-full bg-signal-soft px-3 py-1 text-sm font-medium text-warning">{t("aslComingSoon", "en")}</span>
      </div>
    );
  }
  return (
    <video
      key={url}
      src={url}
      className="h-full min-h-56 w-full rounded-2xl bg-ink object-contain"
      autoPlay
      muted
      loop
      playsInline
      controls
      onError={() => setMissing(url)}
    />
  );
}
