"use client";

import { useEffect, useRef, useState } from "react";

const W = 1024;
const H = 768;
const BEZEL = 22;

/** Shows children at a true 1024x768 iPad layout, scaled to fit the pane. */
export function TabletFrame({ children }: { children: React.ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  useEffect(() => {
    const el = outer.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      setScale(Math.max(0.2, Math.min(width / (W + BEZEL * 2), height / (H + BEZEL * 2), 1)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={outer} className="flex h-full w-full items-center justify-center">
      <div style={{ width: (W + BEZEL * 2) * scale, height: (H + BEZEL * 2) * scale }} className="relative shrink-0">
        <div
          className="absolute left-0 top-0 origin-top-left rounded-[44px] bg-ink p-[22px] shadow-2xl"
          style={{ width: W + BEZEL * 2, height: H + BEZEL * 2, transform: `scale(${scale})` }}
        >
          <div className="flex h-full w-full flex-col overflow-hidden rounded-[22px] bg-canvas" aria-label="Patient tablet">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
