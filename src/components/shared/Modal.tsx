"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-[min(560px,calc(100vw-32px))] rounded-2xl border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-ink/40"
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-canvas" aria-label="Close">
          <X size={20} aria-hidden />
        </button>
      </div>
      <div className="px-5 py-4">{children}</div>
    </dialog>
  );
}
