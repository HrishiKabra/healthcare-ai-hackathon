// Six faces across 0 to 10, in the style of the faces pain scale. Drawn, not emoji,
// so they look the same on every device.

const COLORS = ["#2e8b57", "#6aa84f", "#b5a300", "#e69138", "#d9622b", "#b4232c"];
// Mouth curvature: positive smiles, negative frowns.
const MOUTH = [6, 3, 0, -3, -5, -7];

export function painFaceIndex(n: number): number {
  return Math.min(5, Math.round(n / 2));
}

export function PainFace({ level, size = 56 }: { level: number; size?: number }) {
  const i = painFaceIndex(level);
  const c = COLORS[i];
  const m = MOUTH[i];
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
      <circle cx="24" cy="24" r="21" fill="#fff" stroke={c} strokeWidth="3" />
      {i >= 4 ? (
        <>
          <path d="M13 17l6-3M35 17l-6-3" stroke={c} strokeWidth="3" strokeLinecap="round" />
          <circle cx="17" cy="21" r="2.5" fill={c} />
          <circle cx="31" cy="21" r="2.5" fill={c} />
        </>
      ) : (
        <>
          <circle cx="17" cy="19" r="2.5" fill={c} />
          <circle cx="31" cy="19" r="2.5" fill={c} />
        </>
      )}
      <path d={`M14 ${32 - m / 2} Q24 ${32 + m} 34 ${32 - m / 2}`} fill="none" stroke={c} strokeWidth="3" strokeLinecap="round" />
      {i === 5 ? <path d="M12 26c-1 2-1 4 0 5" stroke="#5aa0d8" strokeWidth="2.5" strokeLinecap="round" fill="none" /> : null}
    </svg>
  );
}
