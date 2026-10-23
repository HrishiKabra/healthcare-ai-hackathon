# FirstWords build notes

Work happens on the `firstwords-build` branch, one commit per phase. Merge into `main` with a fast-forward when you are happy with it.

## Decisions

- **Branch:** built on `firstwords-build` instead of committing straight to `main`.
- **Next.js 16.4 with `cacheComponents: false`.** `create-next-app` now turns on Cache Components and Partial Prefetching by default. Every FirstWords screen is a client component driven by BroadcastChannel state, so prerender rules (for example around `Date.now()`) would only add friction. Turbopack and Tailwind v4 are kept as scaffolded.
- **System fonts, no `next/font/google`.** The build and the demo never need the network. macOS and iPadOS system fonts cover Vietnamese, Chinese, Arabic, and Devanagari.
- **Light theme only**, with a calm, high-contrast palette defined as Tailwind tokens in `src/app/globals.css`.
- **Settings** (provider override, Ollama preset, gesture toggle) live in `localStorage` under `firstwords.settings`, behind try/catch. Never patient data.
- **Translations written by Claude, all unverified.** No API key was available overnight, so the es/vi/zh/ar/hi text in `questions.json` and `ui-strings.json` was written by hand by the model and every `translationsVerified` flag is `false`. Some languages default to masculine forms (for example Arabic imperatives, some Hindi verb forms); fluent reviewers should check these.
- **Extra question phase `followup`** for head strike and pregnancy (the spec lists them as follow-ups but its phase enum has no slot for them).
- **Extra answer type `instruction`** for the stroke checks ("Please smile", "Raise both arms", "Please say: The sky is blue"). The patient sees the instruction; the EMT records the finding on the console. A third stroke check (speech) was added so the whole Cincinnati screen is in the flow; the EMT can also toggle "speech abnormal" directly.
- **Allergies are two questions:** `allergy_any` (yes/no) then `allergy_detail` (free text with quick picks), shown only after "yes". This is the spec's "yesno, then free".
- **Pain questions are gated.** Quality, spread, and 0 to 10 are asked only for painful complaints (chest, belly, fall, bleeding, other, or unknown). Asking a stroke patient whether their weakness is "sharp or burning" wastes time. Region is always asked.
- **Extra chart field `activity`** for "What were you doing when it started?" (OPQRST onset context; the spec's field list had no slot).
- **The chart is derived, not stored.** `buildChart(answers)` folds every non-rejected answer through `mergeAnswer`. "No, ask again" just marks the answer rejected.
- **Conflict semantics.** Same value: merged. Newer answer to the same question: replaces the older one (a correction). Confirmed beats unconfirmed. Two confirmed answers from different questions that disagree: both kept and the field is flagged. For lists, a "none" answer next to a real item (for example "no medicines" plus "Eliquis") is a conflict, which drives rule 9.
- **"Possibly pregnant"** means sex is not male and age is unknown or 12 to 55, or pregnancy was picked as a condition.
- **Stroke window wording:** rule 2 says "inside the 4.5 hour window" at 4.5 hours or less since last known well, and "may still qualify for clot removal" up to 24 hours.
- **Rule 6** counts insulin and any diabetes medicine class (for example metformin), not only insulin.
- **Med table** has 68 entries with aliases in all 6 scripts. The table class always wins over a model's class.

## Progress

### Phase 0: Scaffold
- Next.js 16 (App Router, TypeScript strict, Tailwind v4, ESLint), Zod 4, Vitest 5, tsx.
- Scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `translate:questions`, `eval`, `eval:compare`.
- `.env.example` with the defaults from the spec. `.env` is git-ignored.
- Persistent footer on every screen through the root layout.
- Safe storage wrappers (`src/lib/storage.ts`) and settings schema (`src/lib/settings.ts`) with a sample test.

### Phase 1: Data and core logic
- `src/data/questions.json` (21 questions, all 5 languages), `ui-strings.json` (97 patient strings), `med-classes.json` (68 meds), `languages.json`.
- Zod schemas for everything shared (`src/lib/schemas.ts`).
- Pure logic with tests: chart merge (`chart.ts`), question flow with `showIf` (`flow.ts`), rules engine with all 9 rules (`rules.ts`), structured answer interpretation and confirm-back text (`interpret.ts`), session reducer (`session.ts`), med lookup (`meds.ts`).
- 103 unit tests: every rule fires and does not fire, merge conflicts, follow-ups, every language present, no em dashes in data.

## Needs a human

- **Translations:** a fluent speaker of each language should review `src/data/questions.json` and `src/data/ui-strings.json`, then flip `translationsVerified` to `true` per question and choice.
