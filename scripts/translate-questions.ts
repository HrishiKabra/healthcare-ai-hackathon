// Fills missing translations in src/data/questions.json using the Claude API.
// Skips cleanly when no key is configured. New translations are always marked
// translationsVerified: false until a fluent speaker checks them.
//
//   ANTHROPIC_API_KEY=... npm run translate:questions
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { anthropicProvider } from "../src/lib/ai/anthropic";
import { readAiConfig } from "../src/lib/ai/config";
import { PATIENT_LANGS, type PatientLang } from "../src/lib/schemas";

type Translatable = { english: string; translations: Partial<Record<PatientLang, string>>; translationsVerified: Partial<Record<PatientLang, boolean>> };

function loadEnvFile() {
  try {
    for (const line of readFileSync(".env", "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
    }
  } catch {
    // no .env
  }
}

async function main() {
  loadEnvFile();
  const cfg = readAiConfig();
  if (!cfg.anthropicKey) {
    console.log("No ANTHROPIC_API_KEY set. Skipping: the checked-in translations stay as they are.");
    return;
  }
  const file = path.resolve("src/data/questions.json");
  const bank = JSON.parse(readFileSync(file, "utf8")) as { questions: (Translatable & { id: string; choices: (Translatable & { id: string })[] })[] };
  const provider = anthropicProvider(cfg.anthropicKey, cfg.anthropicModel);
  let filled = 0;

  const fill = async (item: Translatable, label: string, context: "question" | "answer") => {
    for (const lang of PATIENT_LANGS) {
      if (item.translations[lang]?.trim()) continue;
      const r = await provider.translate({ text: item.english, from: "en", to: lang, context });
      item.translations[lang] = r.translation;
      item.translationsVerified[lang] = false;
      filled++;
      console.log(`${label} [${lang}] ${r.confidence}: ${r.translation}`);
    }
  };

  for (const q of bank.questions) {
    await fill(q, q.id, "question");
    for (const c of q.choices) await fill(c, `${q.id}.${c.id}`, "answer");
  }
  writeFileSync(file, JSON.stringify(bank, null, 2) + "\n");
  console.log(filled ? `Filled ${filled} missing translations (all unverified).` : "Nothing missing.");
}

main().catch((e) => {
  console.error("translate:questions failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
