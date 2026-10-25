import { ARM_LABEL, DRILL_FACTS, FACT_LABEL, type ArmSummary, type DrillArm, type DrillFact } from "@/lib/drill";
import { fmtSecs } from "./ui";

// Two series, validated with the dataviz palette checker (light surface): FirstWords blue, usual method orange.
export const ARM_COLOR: Record<DrillArm, string> = { firstwords: "#2a78d6", usual: "#eb6834" };

const KEYS: (DrillFact | "flag")[] = [...DRILL_FACTS, "flag"];
const W = 680;
const LABEL_W = 130;
const VALUE_W = 90;
const BAR_H = 12;
const PAIR_GAP = 2;
const GROUP_GAP = 20;

function niceStep(max: number): number {
  for (const s of [15, 30, 60, 120, 300, 600]) if (max / s <= 6) return s;
  return 1200;
}

/** Bar anchored at the baseline with a 4px rounded data end. */
function barPath(x: number, y: number, w: number, h: number): string {
  if (w < 4) return `M${x},${y}h${w}v${h}h${-w}z`;
  return `M${x},${y}h${w - 4}a4,4 0 0 1 4,4v${h - 8}a4,4 0 0 1 -4,4h${-(w - 4)}z`;
}

/** Median seconds to each key fact, FirstWords next to the usual method. */
export function DrillChart({ summary }: { summary: ArmSummary[] }) {
  const values = summary.flatMap((s) => KEYS.map((k) => s.medianFact[k] ?? 0));
  const max = Math.max(30, ...values);
  const step = niceStep(max);
  const top = Math.ceil(max / step) * step;
  const plotW = W - LABEL_W - VALUE_W;
  const x = (v: number) => LABEL_W + (v / top) * plotW;
  const groupH = summary.length * BAR_H + (summary.length - 1) * PAIR_GAP;
  const H = 24 + KEYS.length * (groupH + GROUP_GAP);
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="flex flex-wrap items-center gap-4 text-sm text-ink-soft">
        <span className="font-semibold text-ink">Median time to each key fact</span>
        {summary.map((s) => (
          <span key={s.arm} className="flex items-center gap-1.5">
            <span className="inline-block size-3 rounded-sm" style={{ background: ARM_COLOR[s.arm] }} aria-hidden />
            {ARM_LABEL[s.arm]} (n={s.n})
          </span>
        ))}
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Median seconds to each key fact, by method. The same numbers are in the table above.">
        {ticks.map((tk) => (
          <g key={tk}>
            <line x1={x(tk)} x2={x(tk)} y1={14} y2={H} stroke="var(--color-line)" strokeWidth={1} />
            <text x={x(tk)} y={10} fontSize={11} textAnchor="middle" fill="var(--color-muted)">
              {fmtSecs(tk)}
            </text>
          </g>
        ))}
        {KEYS.map((k, gi) => {
          const gy = 24 + gi * (groupH + GROUP_GAP);
          return (
            <g key={k}>
              <text x={LABEL_W - 10} y={gy + groupH / 2 + 4} fontSize={13} textAnchor="end" fill="var(--color-ink)">
                {FACT_LABEL[k]}
              </text>
              {summary.map((s, i) => {
                const v = s.medianFact[k];
                const y = gy + i * (BAR_H + PAIR_GAP);
                const label = `${ARM_LABEL[s.arm]}, ${FACT_LABEL[k]}: ${v == null ? "not obtained in any run" : `median ${fmtSecs(v)}`}`;
                return (
                  <g key={s.arm}>
                    <title>{label}</title>
                    {/* Hit target taller than the bar. */}
                    <rect x={LABEL_W} y={y - 1} width={plotW + VALUE_W} height={BAR_H + 2} fill="transparent" />
                    {v != null ? <path d={barPath(LABEL_W, y, Math.max(1, x(v) - LABEL_W), BAR_H)} fill={ARM_COLOR[s.arm]} /> : null}
                    <text x={v != null ? x(v) + 6 : LABEL_W + 4} y={y + BAR_H - 2} fontSize={11} fill={v != null ? "var(--color-ink-soft)" : "var(--color-muted)"}>
                      {fmtSecs(v)}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
