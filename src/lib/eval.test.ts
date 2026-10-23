import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { directCalls } from "./ai/direct";
import { EVAL_CASES, baselineCalls, runEval } from "./eval";
import { mockProvider } from "./mock";

describe("eval", () => {
  beforeEach(() => vi.stubGlobal("fetch", () => Promise.reject(new Error("no network in tests"))));
  afterEach(() => vi.unstubAllGlobals());

  it("has 10 cases covering all five languages plus ASL", () => {
    expect(EVAL_CASES).toHaveLength(10);
  });

  it("the mock pipeline matches every gold flag", async () => {
    const run = await runEval(directCalls(mockProvider));
    for (const s of run.scores) expect(s.flags, s.id).toMatchObject({ fp: 0, fn: 0 });
    expect(run.summary.fieldAccuracy).toBe(1);
  });

  it("the keyword baseline misses colloquial answers", async () => {
    const run = await runEval(baselineCalls);
    expect(run.summary.flagRecall).toBeLessThan(0.75);
    const hindi = run.scores.find((s) => s.id === "hi-blood-thinner-fall")!;
    expect(hindi.meds.fn).toBe(1);
    expect(hindi.flags.got).not.toContain("anticoag_head");
  });
});
