// Runs the scenario eval and writes eval/results.md.
//
//   npm run eval                          provider from .env (demo mode by default)
//   npm run eval -- --provider anthropic  needs ANTHROPIC_API_KEY
//   npm run eval -- --provider ollama     needs Ollama running with the model pulled
//   npm run eval:compare                  every configured provider, side by side
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { anthropicProvider } from "../src/lib/ai/anthropic";
import { readAiConfig } from "../src/lib/ai/config";
import { directCalls } from "../src/lib/ai/direct";
import { ollamaProvider, ollamaStatus } from "../src/lib/ai/ollama";
import type { AiProvider } from "../src/lib/ai/provider";
import { EVAL_CASES, baselineCalls, pct, runEval, type EvalRun } from "../src/lib/eval";
import { getLanguage } from "../src/lib/languages";
import { mockProvider } from "../src/lib/mock";
import { RULES } from "../src/lib/rules";
import type { LangCode } from "../src/lib/schemas";

function loadEnvFile() {
  try {
    for (const line of readFileSync(".env", "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
    }
  } catch {
    // no .env: demo mode
  }
}

function arg(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0) return process.argv[i + 1] ?? null;
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`));
  return eq ? eq.split("=")[1] : null;
}

type Labeled = { label: string; provider: string; model: string; run: EvalRun; fallbacks: number };

async function buildProvider(name: string): Promise<{ provider: AiProvider | null; skip?: string }> {
  const cfg = readAiConfig();
  if (name === "mock") return { provider: mockProvider };
  if (name === "anthropic") {
    if (!cfg.anthropicKey) return { provider: null, skip: "ANTHROPIC_API_KEY is not set" };
    return { provider: anthropicProvider(cfg.anthropicKey, cfg.anthropicModel) };
  }
  if (name === "ollama") {
    const st = await ollamaStatus(cfg.ollamaBaseUrl, cfg.ollamaModel);
    if (!st.reachable) return { provider: null, skip: `Ollama is not running at ${cfg.ollamaBaseUrl}` };
    if (!st.installed) return { provider: null, skip: `${cfg.ollamaModel} is not pulled (run: ollama pull ${cfg.ollamaModel})` };
    return { provider: ollamaProvider(cfg.ollamaBaseUrl, cfg.ollamaModel, cfg.ollamaTranslateModel) };
  }
  return { provider: null, skip: `Unknown provider "${name}"` };
}

async function runProvider(name: string): Promise<Labeled | { skipped: string; reason: string }> {
  const { provider, skip } = await buildProvider(name);
  if (!provider) return { skipped: name, reason: skip ?? "unavailable" };
  process.stdout.write(`Running ${name} (${provider.model})`);
  const run = await runEval(directCalls(provider), EVAL_CASES, () => process.stdout.write("."));
  process.stdout.write("\n");
  const fallbacks = run.metas.filter((m) => m.fallbackReason).length;
  const label = name === "mock" ? "Demo mocks (canned)" : name === "anthropic" ? `Cloud (${provider.model})` : `On-device (${provider.model})`;
  return { label, provider: name, model: provider.model, run, fallbacks };
}

const ruleTitle = (id: string) => RULES.find((r) => r.id === id)?.number ?? id;
const flagList = (ids: string[]) => (ids.length ? ids.map((id) => `R${ruleTitle(id)}`).join(", ") : "none");
const langName = (code: string) => (code === "ASL" ? "ASL" : getLanguage(code as LangCode).englishName);
const secs = (x: number) => (x < 0.01 ? "<0.01" : x.toFixed(2));

function summaryTable(cols: { label: string; run: EvalRun }[]): string {
  const rows: [string, (r: EvalRun) => string][] = [
    ["Field accuracy", (r) => pct(r.summary.fieldAccuracy)],
    ["Red flag recall", (r) => pct(r.summary.flagRecall)],
    ["Red flag precision", (r) => pct(r.summary.flagPrecision)],
    ["Medication class accuracy", (r) => pct(r.summary.medAccuracy)],
    ["Allergy category accuracy", (r) => pct(r.summary.allergyAccuracy)],
    ["Average seconds per AI call", (r) => secs(r.summary.secondsPerCall)],
  ];
  return [
    `| Metric | ${cols.map((c) => c.label).join(" | ")} |`,
    `|---|${cols.map(() => "---:").join("|")}|`,
    ...rows.map(([name, f]) => `| ${name} | ${cols.map((c) => f(c.run)).join(" | ")} |`),
  ].join("\n");
}

function caseTable(baseline: EvalRun, model: Labeled): string {
  const head = `| Case | Language | Fields, baseline | Fields, ${model.label} | Gold flags | Baseline flags | ${model.label} flags |\n|---|---|---:|---:|---|---|---|`;
  const rows = EVAL_CASES.map((c, i) => {
    const b = baseline.scores[i];
    const m = model.run.scores[i];
    const mark = (s: typeof b) => (s.flags.fn || s.flags.fp ? " (miss)" : "");
    return `| ${c.title} | ${langName(m.language)} | ${b.fields.correct}/${b.fields.total} | ${m.fields.correct}/${m.fields.total} | ${flagList(c.gold.flags)} | ${flagList(b.flags.got)}${mark(b)} | ${flagList(m.flags.got)}${mark(m)} |`;
  });
  return [head, ...rows].join("\n");
}

function paragraph(baseline: EvalRun, model: Labeled): string {
  const missed = EVAL_CASES.filter((_, i) => baseline.scores[i].flags.fn > 0).map((c) => c.title.split(",")[0] + ": " + c.title.split(",").slice(1).join(",").trim());
  const fp = baseline.scores.filter((s) => s.flags.fp > 0).length;
  const b = baseline.summary;
  const m = model.run.summary;
  return [
    `Across ${EVAL_CASES.length} cases in Spanish, Vietnamese, Mandarin, Arabic, Hindi, Portuguese, English, and ASL, keyword matching found ${pct(b.fieldAccuracy)} of the gold chart fields and ${pct(b.flagRecall)} of the red flags (precision ${pct(b.flagPrecision)}), while ${model.label} found ${pct(m.fieldAccuracy)} of the fields and ${pct(m.flagRecall)} of the red flags (precision ${pct(m.flagPrecision)}).`,
    missed.length
      ? `The baseline missed red flags in ${missed.length} cases (${missed.join("; ")}), almost always because the chief complaint or the medicine was said in everyday words rather than a listed label or drug name.`
      : "The baseline found every red flag.",
    fp ? `It also raised ${fp} false alarm${fp > 1 ? "s" : ""}: with the complaint unread, high pain looked like "severe pain, unknown cause".` : "",
    "Red flags always come from the same deterministic rules; the only difference between the columns is how well free answers are turned into chart fields. That is what the product would lose without AI.",
  ]
    .filter(Boolean)
    .join(" ");
}

async function main() {
  loadEnvFile();
  const cfg = readAiConfig();
  const compare = process.argv.includes("--compare");
  const requested = arg("provider") ?? (cfg.demoMode ? "mock" : cfg.defaultProvider);
  const names = compare ? ["mock", "ollama", "anthropic"] : [requested];

  process.stdout.write("Running keyword baseline");
  const baseline = await runEval(baselineCalls, EVAL_CASES, () => process.stdout.write("."));
  process.stdout.write("\n");

  const results: Labeled[] = [];
  const skipped: { skipped: string; reason: string }[] = [];
  for (const n of names) {
    const r = await runProvider(n);
    if ("skipped" in r) skipped.push(r);
    else results.push(r);
  }
  if (!results.length) {
    console.error(`No provider could run: ${skipped.map((s) => `${s.skipped} (${s.reason})`).join(", ")}`);
    process.exit(1);
  }

  const onlyMock = results.every((r) => r.provider === "mock");
  const when = new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";
  const primary = results.find((r) => r.provider !== "mock") ?? results[0];
  const md = [
    "# FirstWords eval results",
    "",
    onlyMock
      ? "> **Demo mode: these numbers are against canned mock responses, not a model.** The model column replays answers written for these cases (`src/lib/mock/answers.ts`), so it shows that the pipeline, rules, and scoring work end to end. It does not measure model quality. The keyword baseline column is real. Rerun with `npm run eval -- --provider anthropic` or `npm run eval -- --provider ollama`, or `npm run eval:compare`."
      : `> Providers: ${results.map((r) => `${r.label}`).join(", ")}. The keyword baseline column uses no AI.`,
    "",
    `Run ${when}. ${EVAL_CASES.length} cases. Scoring: chart fields against a gold chart, medications by drug class, allergies by category, red flags by rule id.`,
    ...results.filter((r) => r.fallbacks > 0).map((r) => `\n**Warning:** ${r.fallbacks} calls from ${r.label} failed and fell back to the keyword baseline.`),
    ...skipped.map((s) => `\nSkipped ${s.skipped}: ${s.reason}.`),
    "",
    "## Summary",
    "",
    summaryTable([{ label: "Keyword baseline", run: baseline }, ...results.map((r) => ({ label: r.label, run: r.run }))]),
    "",
    paragraph(baseline, primary),
    "",
    "## Cases",
    "",
    caseTable(baseline, primary),
    "",
    "R1 blood thinner with fall or head strike, R2 stroke alert, R3 chest pain with aspirin or NSAID allergy, R4 torn aorta, R5 allergic reaction, R6 check blood sugar, R7 pregnancy with belly pain or bleeding, R8 severe pain with unknown cause, R9 conflicting allergy or medication answers, R10 head strike while intoxicated.",
    "",
    "Cases live in `eval/scenarios/`. Each has scripted answers in the patient's language (mostly free answers, many colloquial) and a gold chart with gold red flags.",
    "",
  ].join("\n");

  const out = path.resolve("eval/results.md");
  writeFileSync(out, md);
  console.log(`\nKeyword baseline: fields ${pct(baseline.summary.fieldAccuracy)}, flag recall ${pct(baseline.summary.flagRecall)}`);
  for (const r of results) console.log(`${r.label}: fields ${pct(r.run.summary.fieldAccuracy)}, flag recall ${pct(r.run.summary.flagRecall)}, ${secs(r.run.summary.secondsPerCall)} s per call`);
  for (const s of skipped) console.log(`Skipped ${s.skipped}: ${s.reason}`);
  console.log(`Wrote ${path.relative(process.cwd(), out)}`);
}

main().catch((e) => {
  console.error("eval failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
