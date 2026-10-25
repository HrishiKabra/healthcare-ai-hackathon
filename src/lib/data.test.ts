import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import ui from "@/data/ui-strings.json";
import { QUESTIONS } from "./questions";
import { LANGUAGES } from "./languages";
import { MED_TABLE, DRUG_CLASS_LABELS } from "./meds";
import { PATIENT_LANGS } from "./schemas";

const DATA = path.resolve(__dirname, "../data");

function jsonFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? jsonFiles(path.join(dir, d.name)) : d.name.endsWith(".json") ? [path.join(dir, d.name)] : [],
  );
}

describe("question bank", () => {
  it("has about 20 questions with unique ids", () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(18);
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length);
  });

  it("every question and choice has every language", () => {
    for (const q of QUESTIONS) {
      for (const l of PATIENT_LANGS) {
        expect(q.translations[l], `${q.id}.${l}`).toBeTruthy();
        expect(q.translationsVerified[l], `${q.id}.${l} verified flag`).toBe(false);
        for (const c of q.choices) expect(c.translations[l], `${q.id}.${c.id}.${l}`).toBeTruthy();
      }
    }
  });

  it("choice questions have choices and ASL slots follow the naming rule", () => {
    for (const q of QUESTIONS) {
      if (q.answerType === "choice") expect(q.choices.length, q.id).toBeGreaterThan(1);
      expect(q.aslVideo).toBe(`asl/${q.id}.mp4`);
    }
  });
});

describe("ui strings", () => {
  it("every key has all six languages", () => {
    for (const [key, entry] of Object.entries(ui)) {
      for (const l of ["en", ...PATIENT_LANGS]) expect((entry as Record<string, string>)[l], `${key}.${l}`).toBeTruthy();
    }
  });
});

describe("languages", () => {
  it("has the six patient languages plus English, Arabic is right to left", () => {
    expect(LANGUAGES.map((l) => l.code).sort()).toEqual(["ar", "en", "es", "hi", "pt", "vi", "zh"]);
    expect(LANGUAGES.find((l) => l.code === "ar")?.dir).toBe("rtl");
  });
});

describe("medication table", () => {
  it("has about 60 entries, each with a known class", () => {
    expect(MED_TABLE.length).toBeGreaterThanOrEqual(55);
    for (const m of MED_TABLE) expect(DRUG_CLASS_LABELS[m.drugClass], m.generic).toBeTruthy();
  });
});

describe("user-facing text", () => {
  it("contains no em dashes in any data file", () => {
    for (const f of jsonFiles(DATA)) {
      expect(readFileSync(f, "utf8").includes("\u2014"), path.relative(DATA, f)).toBe(false);
    }
  });
});
