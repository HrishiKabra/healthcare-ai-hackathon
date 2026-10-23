# FirstWords build notes

Work happens on the `firstwords-build` branch, one commit per phase. Merge into `main` with a fast-forward when you are happy with it (`git checkout main && git merge --ff-only firstwords-build`).

## Summary (end of the overnight build)

**Everything in SPEC.md phases 0 to 7 is built, including the gesture stretch goal.** The app runs end to end with no API key, no model, and no network: all three demo scenarios play through `/demo` or through three separate windows, fire their expected red flags, and produce the right ER handoff.

Final checks on the last commit: `npm run typecheck`, `npm test` (157 tests), `npm run lint`, `npm run build`, and `npm run eval` all pass.

**Works**
- Patient screen: every answer type (yes/no, 0 to 10 faces, front and back body map, icon choices, "how long ago", free text with mic, stroke instructions), confirm-back in the patient's language, "Or say it / type it" on every question, picture board mode, ASL slot with fallback, Arabic right to left, read aloud.
- EMT console: mode picker with "Point to your language", question queue with follow-ups and unverified-translation dots, live chart with source, confidence and confirmation, sticky red flags with rule and facts, free-form questions, live interpreter modal, vitals and treatments, End call that wipes every window.
- Nine deterministic red-flag rules, chart merge with conflicts, question flow with `showIf`, all pure and unit-tested.
- AI layer: demo, on-device (Ollama), and cloud (Claude) behind one interface, Zod-validated, with safe fallbacks and a provider badge. Keyword baseline.
- MIST handoff built in code from confirmed answers only, with the communication box, unconfirmed list, copy and print, plus a labeled AI summary.
- Eval (CLI and `/eval`), `/about`, `/demo` split view with autopilot.

**Stubbed or not verified overnight**
- On-device and cloud providers are written and unit-tested against stubbed responses, but were never run against a real model (no key, and models were not downloaded on purpose). Ollama is running on this laptop but `qwen3:1.7b` is not pulled.
- Gesture answers were checked to render, but the camera path was not run (it downloads the MediaPipe model).
- ASL videos are empty slots by design.
- All translations are unverified.

**First things for the team on Sunday**
1. `npm install && npm run dev`, open `/demo`, and press Play.
2. `ollama pull qwen3:1.7b`, set `DEMO_MODE=false` and `AI_PROVIDER=ollama` in `.env`, then `npm run eval -- --provider ollama`.
3. With a key: `AI_PROVIDER=anthropic`, `ANTHROPIC_API_KEY=...`, `DEMO_MODE=false`, then `npm run eval:compare`.
4. Work through "Needs a human" below.

## Decisions

- **Branch:** built on `firstwords-build` instead of committing straight to `main`.
- **Next.js 16.4 with `cacheComponents: false`.** `create-next-app` now turns on Cache Components and Partial Prefetching by default. Every FirstWords screen is a client component driven by BroadcastChannel state, so prerender rules (for example around `Date.now()`) would only add friction. Turbopack and Tailwind v4 are kept as scaffolded.
- **System fonts, no `next/font/google`.** The build and the demo never need the network. macOS and iPadOS system fonts cover Vietnamese, Chinese, Arabic, and Devanagari.
- **Patient screen design:** a laminated triage card with a reflective-amber band on the leading edge of the question, 42px questions, 24px or larger everywhere, and color always paired with an icon and a word.
- **Timer starts when the call is created** ("Start new call"), not on a separate button.
- **A pending re-answer does not overwrite a confirmed value** until the patient confirms it.
- **Provider rules.** `DEMO_MODE` unset or `true` means mock, always. Otherwise `AI_PROVIDER` is the default, and the settings panel can switch between demo and on-device at runtime. Cloud is only used when the team sets `AI_PROVIDER=anthropic` and a key, so a browser can never opt into a paid call. To use on-device mode, set `DEMO_MODE=false`.
- **No forced tool choice on Claude.** `claude-sonnet-5-5` rejects forced `tool_choice`, so the cloud provider uses a `strict: true` tool with `tool_choice: auto`, names the tool in the prompt, and treats a missing tool call as invalid output (which falls back to the baseline). No `temperature` is sent (now rejected by the API). `fallbacks: "default"` re-runs a refused request on a fallback model server-side.
- **Extraction schema is flat and small**, with every key defaulted, so a 1.7B model only has to pick ids from lists. Medications, allergies, and notes are accepted from any answer; a question's own slot is only filled from that question.
- **Translate then extract** are two calls (the spec's two routes). In demo mode both are instant.
- **Eval scoring.** Field accuracy counts gold fields matched in the final chart (lists must contain every gold item). Medications are scored by drug class, allergies by category, both as set accuracy (correct over the union of gold and predicted). Red flags are scored by rule id (precision and recall). Rules are the same for both columns, so the gap is purely how free answers are read.
- **Gesture answers are opt-in**, because they load MediaPipe's WebAssembly from jsDelivr and the gesture model from Google's CDN on first use. They are not part of the demo video path.
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

### Phase 2: Patient screen
- Widgets for every `answerType`: yes/no, 0 to 10 pain faces, front and back body map (plus a large-button region list, since the neck and face are too small to tap reliably on the figure), icon-card choices (single and multi, with exclusive "None"), "How long ago?" steps plus an optional number and unit, free text with mic and quick picks, and stroke-check instructions.
- Confirm-back screen after every answer ("You said: ... Is this right?"), built in code from localized labels. "No, ask again" re-asks.
- Picture board mode (larger pictograms, icon-first cards), ASL mode (video slot with pictogram fallback and a small "ASL video coming soon" label), right-to-left layout for Arabic, read-aloud with `speechSynthesis`, mic with Web Speech API, and typed fallback.
- `/patient?preview=1&lang=es&mode=spoken&q=chief_complaint` is a dev walkthrough of every question and widget, with no session needed.
- Checked in headless Chrome at 1024x768: every question answered with both mouse and touch reaches the confirm-back screen, with no page scroll and no console errors.

### Phase 3: EMT console and sync
- `/emt?s=<id>`: header (time on scene, mode and language, open patient and ER windows, live interpreter modal, End call), sticky red flag banner (rule, facts, explanation, acknowledge; flags never disappear), question queue (protocol order, status chips, unverified-translation dots, skip, EMT records stroke findings), live chart (value, confidence, confirmed or not, source answer, conflicts), patient details (age, sex, vitals, treatments, "speech problem observed").
- Mode picker first, with a "Point to your language" grid in native scripts. The patient window shows the same grid while no mode is chosen, so the patient can pick their own language.
- Sync: the EMT window owns the session and broadcasts a snapshot on every change over `BroadcastChannel("firstwords:<id>")`; the patient window sends answer events. Late windows say hello and get a snapshot.
- Session state is mirrored to `sessionStorage` (survives a reload) and wiped on End call, which also clears the patient and ER windows.
- Checked in headless Chrome with two windows: a full Spanish chest-pain assessment through 11 questions, the chart updating live, rule 3 firing, "No, ask again" re-asking, a corrected answer replacing the old one, and End call clearing every window. No console errors.

### Phase 4: AI routes and mock mode
- Routes: `POST /api/translate`, `/api/extract`, `/api/explain-flag`, `/api/handoff` (the AI paragraph only), and `GET /api/provider-status` (with `?check=1` it asks Ollama's `/api/tags` whether the model is installed). Every body is validated with Zod and never logged.
- Providers behind one interface (`src/lib/ai/provider.ts`): **mock** (canned answers for the 3 scenarios in `src/lib/mock/`, keyword baseline for anything else), **anthropic** (strict tool with a Zod-derived schema, Zod-validated again, `effort: low`, `fallbacks: "default"` for refusals), **ollama** (native `/api/chat`, `stream:false`, `think:false`, `format` = JSON schema, 60 s timeout).
- Any failure (unreachable, timeout, invalid JSON, schema mismatch, refusal) falls back to a safe result: the keyword baseline for extraction (marked "needs review"), the original text for translation, the rule's own text for explanations, and a template for the narrative. The provider badge then says "(offline, keyword fallback)".
- Keyword baseline (`src/lib/baseline.ts`): med names in 6 scripts, allergy words, negations, numbers, and localized option labels. It deliberately misses colloquial phrasing like "pastilla para la sangre rala".
- "Or say it / type it" under every widget in spoken mode. Free answers are translated, extracted, and confirmed back in the patient's language from localized labels (for example "Medicamentos: metformin (metformina)").
- Free-form EMT questions (typed or spoken in English) are translated and shown on the patient screen marked "Question from the crew", with the back-translation shown to the EMT.
- Scenario loading from the start page plus an autopilot bar on the EMT console (Next step, Play, 1x or 2x, Auto-advance). The autopilot makes the patient window answer and confirm, so every screen shows the real flow.
- Settings panel on the start page: provider, Ollama preset (Light `qwen3:1.7b`, Balanced `qwen3:4b`, Better `gemma4:e2b`), gesture toggle, and Test connection.
- `npm run translate:questions` fills only missing translations via the API and skips cleanly with no key.
- Checked: a unit test runs all 3 scenarios through the real pipeline with `fetch` stubbed to throw, and each fires exactly its expected rule. In headless Chrome, all 3 scenarios autoplay across two windows with every non-localhost request blocked: correct flags, zero external requests, and no console errors.

### Phase 5: Handoff and ER screen
- `src/lib/handoff.ts` builds the MIST handoff in code from the chart. Only values the patient confirmed, at medium or high confidence, and without conflicts go into MIST, allergies, medications (with drug class), and history. Everything else goes in a separate "Unconfirmed, low confidence, or conflicting" list with the reason.
- The communication needs box gives the language (or ASL, or picture board), "interpreter needed on arrival", the preferred mode, and notes (for example "speech abnormal").
- "Generate handoff" on the EMT console sends the structured handoff to the ER window immediately, then an update with the optional "AI summary, review before use" paragraph (a template sentence in demo mode).
- `/er?s=<id>` waits for the handoff and shows it with a "Received HH:MM" stamp, plus Copy (plain text) and Print (print stylesheet). An ER window opened late still gets the last handoff. End call clears it.
- Checked: snapshot tests of the handoff text for all 3 scenarios, plus tests for the unconfirmed and conflict lists. In headless Chrome, all 3 scenarios autoplay, generate a handoff, show the right flag and communication box on a late-opened ER window, and clear on End call.

### Phase 6: Eval and polish
- **Eval:** 10 cases in `eval/scenarios/` (the 3 demo scenarios plus 7 more across Spanish, Mandarin, Hindi, Vietnamese, and Arabic, mostly colloquial free answers). `npm run eval` runs every case through the real pipeline twice, AI provider vs. keyword baseline, and writes `eval/results.md`: field accuracy, red-flag recall and precision by rule id, medication class accuracy, allergy category accuracy, and seconds per call, plus a per-case table and a summary paragraph. `--provider anthropic|ollama` and `npm run eval:compare` work and skip providers that are not configured, saying why.
- In demo mode the results file says at the top, in bold, that the model column is canned responses and not a measure of model quality. Current demo-mode numbers: keyword baseline 59% of fields and 45% of red flags (71% precision); the mock pipeline 100%.
- `/eval` runs the same cases in the browser against the provider chosen in AI settings, next to the keyword baseline.
- `/about` covers what data is used, what is sent to the AI provider, that nothing is stored, the HIPAA BAA requirement, ASL content made with Deaf signers, and that FirstWords is a bridge until a qualified interpreter is reached.
- `/demo` split view: EMT console plus a tablet-framed patient screen (a true 1024x768 layout, scaled), an ER panel that slides in when the handoff arrives, the scenario autopilot bar (scenario picker, Restart, Next step, Play, 1x or 2x, Auto-advance), and a segmented EMT/Patient/ER control below 900px. Below 1024px the EMT console scrolls as one page so the live chart keeps its height.
- **Stretch done:** gesture yes/no (thumbs up or down) with MediaPipe Gesture Recognizer, labeled "gesture answer", opt-in from AI settings.
- Checked in headless Chrome with all external requests blocked: `/demo` plays the chest pain and stroke scenarios, generates the handoff, and slides in the ER panel; `/eval` runs; `/about` and the start page render; no console errors. 157 unit tests pass.
- **Fix-up commit after phase 6.** The phase 6 commit went in before its checks finished. Installing `@mediapipe/tasks-vision` had hit npm's optional-dependency bug, which stripped the platform-specific native bindings from `package-lock.json`, so `vitest` could not start. The follow-up commit regenerates the lockfile from a clean install and adds these notes. All checks pass on the fixed tree.

### Phase 7: Handover
- `README.md`: running locally, the screens, scripts, switching off demo mode (on-device and cloud), deploying to Vercel, adding ASL videos (the full list of file names), verifying translations, a 2-minute demo click path, and the eval.
- This summary.

## Needs a human

- **Run a real model.** Pull `qwen3:1.7b` (or another preset) and run `npm run eval -- --provider ollama`; add a key and run `npm run eval:compare`. Read `eval/results.md`: the demo-mode numbers are against canned answers, not a model. Expect small models to miss some colloquial phrasing; tune `src/lib/ai/prompts.ts` if so.
- **Record ASL videos** with a fluent Deaf signer: one clip per question in `public/asl/` (file names in the README).
- **Interview an EMT** and update the question bank (`src/data/questions.json`) and rules (`src/lib/rules.ts`) from their feedback. The rule thresholds (for example the 4.5 hour stroke window wording) need clinical review.
- **Deploy to Vercel** for the demo link (no environment variables needed). Check the microphone on the hosted https link in Chrome.
- **Record the demo video** using the click path in the README.
- **Gesture answers:** test on a real tablet (start page, AI settings, "Gesture answers"). Not run overnight, because it downloads the MediaPipe model at runtime.
- **If `npm test` says "Cannot find native binding":** that is npm's optional-dependency bug (npm/cli#4828). Run `rm -rf node_modules package-lock.json && npm install`. Avoid adding packages with a bare `npm install <pkg>` on top of an existing lockfile without checking that `git diff package-lock.json` does not delete the `@rolldown/binding-*` entries.
- **Translations:** a fluent speaker of each language should review `src/data/questions.json` and `src/data/ui-strings.json`, then flip `translationsVerified` to `true` per question and choice.
