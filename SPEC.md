# FirstWords: Build Spec

**One-liner:** Emergency assessment for patients who can't communicate with the crew.

**What it does:** An EMT runs the standard field assessment on a tablet. The patient answers in whatever way they can: their own spoken language, ASL (pre-recorded signed questions plus taps), or a picture board. The AI turns those answers into a structured clinical chart, deterministic rules flag red flags live, and the app generates an English ER handoff that includes the patient's communication needs.

**Demo goal:** In a 2-minute video, show three patients back to back (Spanish speaker with chest pain, Deaf patient after a fall, stroke patient who cannot speak), a live red flag, and the ER handoff appearing on a second screen.

---

## 1. Screens

Three routes, designed to run as three browser windows on one laptop (or the patient window on a tablet), synced with `BroadcastChannel`.

### `/` Start
- "Start new call" button creates a session and opens the EMT console.
- Buttons to open the patient window and ER window for the current session.
- "Load demo scenario" menu with the 3 scenarios from section 7.

### `/emt` EMT console (English)
- **Header:** session timer (starts on "Start call"), patient mode and language, "End call" button.
- **Mode picker (first step):** Spoken language / ASL / Picture board. Includes a "Point to your language" grid the EMT can show the patient, with each language name written in its own script.
- **Question queue (left):** protocol questions in order (section 3), each with a status: not asked, asked, answered, confirmed. Tap to send a question to the patient screen. "Next question" button. Follow-up questions appear automatically when triggered.
- **Free-form mic:** EMT can speak any question not in the bank. It is translated and sent to the patient screen, marked "free-form".
- **Live chart (center):** structured fields (section 4) filling in as answers arrive. Each field shows its source answer, a confidence level, and whether it was confirmed by the patient. Unconfirmed fields are visibly marked.
- **Red flag banner (top, sticky):** each flag shows its title, the rule that fired, the facts that triggered it, and a short explanation. The EMT can acknowledge it. Flags never auto-dismiss.
- **Escalation button:** "Call live interpreter" (in the prototype, opens a modal explaining this would connect to the agency's interpreter line).
- **Generate handoff** button: sends the handoff to the ER window.

### `/patient` Patient screen (patient's language)
- Large current question in the patient's language, with a speaker button that reads it aloud (`speechSynthesis`).
- **ASL mode:** video slot plays `public/asl/<questionId>.mp4`. If the file is missing, show the pictogram plus the English text with a small "ASL video coming soon" label (dev indicator only).
- **Answer widgets**, chosen by the question's `answerType`:
  - `yesno`: two huge buttons with icons and words
  - `scale`: 0 to 10 pain faces
  - `bodymap`: front and back body SVG with tappable regions (head, face, neck, chest, upper/lower abdomen, back, each arm, each leg, pelvis). Multi-select.
  - `choice`: icon cards
  - `duration`: "How long ago?" with icon steps (minutes, about 1 hour, a few hours, today, yesterday, days) plus an optional number
  - `free`: mic button (Web Speech API in the patient's language) with a text box fallback
- **Confirm-back screen** after every answer: "You said: [answer in patient's language]. Is this right?" with Yes / No. "No" re-asks the question. Only confirmed answers count as confirmed in the chart.
- **Picture board mode:** the same widgets, icon-first, with minimal text.
- **Stretch (Phase 6):** gesture yes/no using the device camera (thumbs up = yes, thumbs down = no) via MediaPipe Gesture Recognizer. Label it "gesture answer", not ASL.

### `/demo` Split view (for the video and the hosted link)
- One screen showing the EMT console and a tablet-framed patient screen side by side, with the ER handoff sliding in as a panel when it arrives. Below about 900px wide, switch between panes with a segmented control.
- This is the main demo surface: it needs no second window, and it works on a hosted site where pop-up windows may be blocked.
- **Scenario autopilot bar:** pick a scenario, then "Next step" (patient answers the current question, then confirms) or "Play" (runs every step with a short delay, speed 1x or 2x). With "Auto-advance" on, the EMT console sends the next question as soon as an answer is confirmed.

### EMT inputs that complete the handoff
- Quick fields on the console: approximate age, sex, and vitals (heart rate, blood pressure, SpO2, respiratory rate, glucose).
- Treatment checkboxes: oxygen, aspirin given, IV access, glucose checked, splint, c-collar. These fill the **T** in MIST.
- Demo scenarios pre-fill these.

### `/er` ER handoff screen (English)
- Waits for a handoff on the session channel. When it arrives, shows it with a subtle "Received [time]" stamp.
- Layout follows **MIST**:
  - **M**edical complaint / mechanism
  - **I**njuries / inspection findings
  - **S**igns and symptoms
  - **T**reatment so far
- Also shows:
  - Allergies and medications (with drug class)
  - Red flags with their reasons
  - Unconfirmed items, listed separately
  - **Communication needs box:** language or ASL, "interpreter needed on arrival", and the preferred mode
- "Copy" and "Print" buttons.

---

## 2. Patient modes and languages

- **Spoken languages for the demo:** Spanish (`es`), Vietnamese (`vi`), Mandarin Chinese (`zh`), Arabic (`ar`, right-to-left layout), Hindi (`hi`).
- **ASL:** questions shown as signed video clips. Answers come through the widgets (no sign recognition except the stretch gesture feature).
- **Picture board:** icons first, works for patients who can't speak or read.
- **Language config:** each language has a code, a native name, a text direction, a BCP-47 tag for speech, and a flag for whether translations are human-verified.

---

## 3. Question bank: `src/data/questions.json`

About 20 questions in field assessment order. Each question has:

```json
{
  "id": "chief_complaint",
  "phase": "opening | opqrst | sample | stroke | closing",
  "english": "What is bothering you most right now?",
  "answerType": "choice",
  "choices": [{ "id": "chest_pain", "english": "Chest pain", "icon": "chest" }],
  "chartField": "chiefComplaint",
  "showIf": null,
  "translations": { "es": "...", "vi": "...", "zh": "...", "ar": "...", "hi": "..." },
  "translationsVerified": { "es": false },
  "aslVideo": "asl/chief_complaint.mp4"
}
```

Choices carry their own translations in the same shape.

**Questions, in order:**
1. **Opening**
   - Can you hear and understand me? (yesno)
   - What is bothering you most? (choice: chest pain, trouble breathing, fall or injury, belly pain, weakness or numbness, dizziness, bleeding, other)
2. **OPQRST**
   - When did it start? (duration)
   - What were you doing when it started? (choice)
   - Does anything make it better or worse? (choice)
   - What does it feel like? (choice: pressure, sharp, burning, tearing, aching)
   - Where is it? (bodymap)
   - Does it spread anywhere? (bodymap, only if pain)
   - How bad is it, 0 to 10? (scale)
3. **SAMPLE**
   - Are you allergic to any medicines? (yesno, then free)
   - What medicines do you take? (free, plus quick picks: blood thinner, insulin, heart medicine, inhaler, none)
   - Do you have any medical conditions? (choice: heart problems, diabetes, high blood pressure, asthma, seizures, stroke before, pregnancy, none)
   - When did you last eat or drink? (duration)
4. **Follow-ups**
   - Did you hit your head? (yesno, only if fall)
   - Are you pregnant or could you be? (yesno, only if belly pain and patient is possibly pregnant)
5. **Stroke check** (only if weakness, numbness, or speech problem)
   - Please smile. (EMT records facial droop yes/no)
   - Raise both arms. (EMT records arm drift yes/no)
   - When did you last feel normal? (duration; maps to last known well)
6. **Closing**
   - Is there anything else we should know? (free)

**Translations:**
- Pre-generate with `npm run translate:questions` (uses the API, writes back into the JSON).
- Ship checked-in translations so the app works offline.
- Mark everything `translationsVerified: false` until a human fluent speaker checks it.
- The EMT console shows a small "unverified translation" dot on unverified questions.

---

## 4. Clinical chart: `src/lib/chart.ts`

Zod schema `ClinicalChart`. Every field is a `ChartValue<T>`:

```ts
{ value: T; sourceAnswerId: string; confidence: "high" | "medium" | "low"; confirmed: boolean }
```

**Fields:**
- `chiefComplaint`
- `onset` (a relative duration, plus an absolute time computed from call start)
- `provocation`
- `quality`
- `region[]`
- `radiation[]`
- `severity` (0 to 10)
- `allergies[]`
- `medications[]`: `{ raw, generic, drugClass }`
- `conditions[]`
- `lastOralIntake`
- `headStrike`
- `pregnancy`
- `strokeScreen`: `{ facialDroop, armDrift, speechAbnormal }`
- `lastKnownWell`
- `notes[]`

**Chart merge:** `mergeAnswer(chart, answer, extraction) => chart` is a pure function. Confirmed values override unconfirmed ones. Conflicting values are both kept and the field is flagged as conflicting.

---

## 5. AI layer: `src/app/api/*` (all routes respect `DEMO_MODE`)

**Provider switch:** all AI calls go through one interface in `src/lib/ai/provider.ts`, selected by `AI_PROVIDER`:
- `mock`: canned responses (the default; same as `DEMO_MODE=true`)
- `anthropic`: Claude API, model from `ANTHROPIC_MODEL` (default `claude-sonnet-5-5`)
- `ollama`: on-device open models through Ollama's **native** chat endpoint `POST {OLLAMA_BASE_URL}/api/chat` (default `OLLAMA_BASE_URL=http://localhost:11434`) with `stream: false`, `think: false`, and `format` set to the JSON schema of the expected output, so the model is forced into valid JSON. Always validate with Zod anyway. Use **one model for everything** (`OLLAMA_MODEL`, default `qwen3:1.7b`) to keep memory low; `OLLAMA_TRANSLATE_MODEL` is optional and falls back to `OLLAMA_MODEL`. Allow timeouts up to 60 seconds and show a "thinking" state in the UI.
  - **Memory target: about 8 GB free RAM.** Presets shown in the settings panel:
    - Light (default): `qwen3:1.7b`, about 1.5 GB
    - Balanced: `qwen3:4b`, about 3 GB
    - Better (needs more free memory): `gemma4:e2b`, about 5 GB or more
  - A "Test connection" button calls `GET {OLLAMA_BASE_URL}/api/tags` and shows whether the chosen model is installed. If Ollama is not running, the app falls back to the keyword baseline and says so in the provider badge.
  - Keep prompts short and give the model the question's allowed option ids, so a small model only has to pick from a list.

The EMT console header shows a small badge with the active provider: "Demo", "Cloud", or "On-device". Keys are only read in server-side API routes and must never reach the browser.

Every call uses tool use with a Zod-derived JSON schema, validates the output with Zod, and falls back to a safe "low confidence, needs review" result if validation fails.

1. **`POST /api/translate`**
   - Input: `{ text, from, to, context: "question" | "answer" }`
   - Output: `{ translation, backTranslation, confidence, notes }`
   - The prompt includes a short medical glossary and tells the model to keep medication names unchanged, preserve numbers and times exactly, and lower confidence for slang or ambiguity.
   - `backTranslation` is always into the source language so the confirm-back step can show it.
2. **`POST /api/extract`**
   - Input: `{ questionId, questionEnglish, answerRaw, answerLanguage, answerEnglish }`
   - Output: a partial `ClinicalChart` patch plus confidence per field.
   - Normalizes medications to generic name and drug class. Example: "Eliquis" becomes apixaban, anticoagulant.
   - Never invents fields that the answer does not support.
3. **`POST /api/handoff`**
   - The MIST handoff itself is **assembled deterministically in code** from the chart (`src/lib/handoff.ts`), so it never contains anything the patient did not confirm. Unconfirmed items are listed separately.
   - The AI only adds an optional one-paragraph narrative, clearly labeled "AI summary, review before use". In mock mode, use a template sentence instead.
4. **`POST /api/explain-flag`**
   - Input: a fired rule and its facts.
   - Output: a one or two sentence plain-English explanation for the EMT. Optional; the rule's built-in text is the fallback.

**Mock mode:** `src/lib/mock/` holds canned responses keyed by scenario and question, so the three demo scenarios run end to end with no key. Free-form answers that are not in a scenario go to the keyword baseline below.

**Keyword baseline (no AI):** `src/lib/baseline.ts` is a deliberately simple extractor that matches medication names (from `med-classes.json`, including names in the 5 languages' scripts), allergy words, negations ("no", "ninguno", "không", "没有", "لا", "नहीं") and the question's localized option labels. It exists for two reasons:
- a safe fallback when no model is available
- the comparison in the eval: "keyword matching vs. AI" is the evidence for the rubric question "what would the product lose without AI?" Colloquial answers like "una pastilla para la sangre rala" or "खून पतला करने की दवा" should beat the baseline and be caught by the model.

**Every question can be answered in the patient's own words,** not just by tapping. Add an "Or say it / type it" option under every widget in spoken mode. The AI maps the free answer onto the question's options and chart fields.

**Confirm-back shows what the AI understood,** not what the patient typed. For a free answer, build the confirm text in code from the extracted fields using localized labels (for example "Medicines: apixaban (Eliquis)"), and only use the model's own summary when nothing structured was extracted. The patient confirms the interpretation, which is the real safety check.

**Medication lookup:** `src/data/med-classes.json` maps about 60 common brand and generic names to classes (anticoagulant, antiplatelet, insulin, beta blocker, opioid, and so on). The rules engine uses this table, and the LLM's class is only a fallback.

---

## 6. Red flag rules engine: `src/lib/rules.ts`

Pure function `evaluateRules(chart) => RedFlag[]`. Each rule has an `id`, `title`, `severity` (critical / warning), a `when(chart)` predicate, a `facts(chart)` function that returns the triggering facts, and a default explanation. Rules fire on unconfirmed data too, but the flag is labeled "based on unconfirmed answer".

**Rules:**
1. **Anticoagulant + fall or head strike:** risk of bleeding in the head.
2. **Stroke screen positive** (any of face, arm, speech): stroke alert. Show last known well and hours elapsed.
3. **Chest pain + aspirin or NSAID allergy:** flag before aspirin is given.
4. **Chest pain with tearing quality, or radiating to the back:** consider a torn aorta.
5. **Possible allergic reaction:** a known allergy plus trouble breathing, or swelling of the face or throat.
6. **Diabetes or insulin + weakness, dizziness, or confusion:** check blood sugar.
7. **Pregnancy + belly pain or bleeding.**
8. **Severe pain (8 or higher) with an unknown cause:** prioritize transport.
9. **Conflicting answers on allergies or medications:** confirm before giving any drug.

**Every flag must show its reason.** This is a deliberate safety and regulatory choice: the EMT can see exactly why the flag fired and make their own decision.

---

## 7. Demo scenarios: `src/data/scenarios/*.json`

Each scenario sets the mode and language and gives the scripted patient answers per question, so "Load demo scenario" can auto-fill answers step by step. Include a "next answer" button for recording the video.

1. **Spanish speaker, chest pain**
   - Pressure in the chest that spreads to the left arm, 7 out of 10, started 40 minutes ago.
   - Allergic to aspirin. Takes metformin.
   - Should fire: rule 3 (aspirin allergy).
2. **Deaf ASL user, fall**
   - Fell on stairs, hit their head, pain 5 out of 10.
   - Takes Eliquis.
   - Should fire: rule 1 (anticoagulant + head strike).
   - Communication need: "ASL interpreter on arrival".
3. **Picture board, stroke**
   - Can't speak. Weakness in the right arm.
   - Facial droop yes. Last known well 1.5 hours ago.
   - Should fire: rule 2 (stroke alert, inside the treatment window).

---

## 8. Eval: `eval/`

- `eval/scenarios/*.json`: 10 scripted cases (the 3 demo scenarios plus 7 more across the 5 languages). Each has patient answers in the target language and a gold chart plus the gold red flags.
- `npm run eval` runs the extraction pipeline and rules on each case. It reports:
  - field-level accuracy
  - red flag recall and precision
  - medication normalization accuracy
- Writes `eval/results.md` with a table and a one-paragraph summary.
- In `DEMO_MODE` the eval runs against mocks and says so clearly at the top of the results. The team reruns with real providers on Sunday.
- Every eval run reports the **keyword baseline next to the model**, so the results table shows exactly what the AI adds.
- Eval items focus on free answers in all 5 languages, including colloquial phrasing (for example "tomo una pastilla para adelgazar la sangre, creo que se llama Xarelto", "我每天打胰岛素", "मैं खून पतला करने की दवा लेता हूँ"). Score medications by drug class, allergies by category, and red flags by rule id.
- Also add an in-app `/eval` page that runs the same cases in the browser against the selected provider, so the team can screen-record the comparison.
- `npm run eval -- --provider anthropic` and `npm run eval -- --provider ollama` must both work, and results include the provider and model name. Add `npm run eval:compare`, which runs every configured provider and writes a side-by-side table (accuracy, red flag recall, average seconds per call) to `eval/results.md`.

---

## 9. Privacy and safety (build these in, they're judged)

- No database. Session state lives in memory and `sessionStorage` (wrapped in try/catch), cleared on "End call".
- API routes don't log request bodies.
- A footer on every screen: "Prototype for demonstration. Not for clinical use."
- Confirm-back on every answer. Low-confidence items are visually distinct and listed separately in the handoff.
- Red flags are rules in code and always show their reasons. The AI never makes the decision.
- An "About this prototype" page at `/about` covering:
  - what data is used
  - what is sent to the AI provider
  - that nothing is stored
  - that real deployment would require a HIPAA business associate agreement with the AI vendor
  - that ASL content must be created with Deaf signers
  - that FirstWords is a bridge until a qualified interpreter is reached, not a replacement

---

## 10. Build phases (do these in order)

**Phase 0: Scaffold**
- Next.js + TypeScript + Tailwind, scripts from CLAUDE.md, Zod, Vitest, ESLint.
- `.env.example` with `AI_PROVIDER=mock`, `ANTHROPIC_API_KEY=`, `ANTHROPIC_MODEL=claude-sonnet-5-5`, `OLLAMA_BASE_URL=http://localhost:11434`, `OLLAMA_MODEL=qwen3:1.7b`, `OLLAMA_TRANSLATE_MODEL=`, and `DEMO_MODE=true`. Add `.env` to `.gitignore`.
- The provider can also be switched at runtime from a settings panel on the start screen (stored in `localStorage`, wrapped in try/catch; settings only, never patient data). `.env` sets the default.
- `NOTES.md` with "Decisions", "Progress", and "Needs a human" sections.
- *Done when:* the app builds and runs, and a sample test passes.

**Phase 1: Data and core logic**
- `questions.json` with all questions in English plus pre-filled translations. If no key is available, write the 5 translations yourself and mark them unverified.
- `ui-strings.json`, `med-classes.json`.
- Zod schemas, question flow (`nextQuestion(session)` with `showIf`), chart merge, rules engine.
- *Done when:* unit tests cover every rule (fires and doesn't fire), chart merge (including conflicts), and question flow (including follow-ups). Every question has every language.

**Phase 2: Patient screen**
- All answer widgets, the body map SVG, confirm-back, picture board mode, right-to-left support for Arabic, the ASL video slot with fallback.
- *Done when:* every `answerType` works with mouse and touch at 1024x768.

**Phase 3: EMT console and sync**
- Mode picker, language grid, question queue, live chart, red flag banner, timer.
- `BroadcastChannel` sync between `/emt` and `/patient` for the same session.
- *Done when:* an EMT window and a patient window complete a full assessment together, and the chart and flags update live.

**Phase 4: AI routes and mock mode**
- The four API routes with Zod validation and fallbacks.
- Mock responses for all 3 scenarios, the keyword baseline, and the "say it in your own words" path on every question.
- Web Speech API mic and `speechSynthesis` playback with a text fallback.
- *Done when:* all 3 scenarios run end to end in `DEMO_MODE` with no network.

**Phase 5: Handoff and ER screen**
- Handoff generation, the `/er` window receiving it live, the MIST layout, the communication needs box, copy and print.
- *Done when:* each scenario produces a correct handoff on the ER screen.

**Phase 6: Eval and polish**
- Eval harness and `eval/results.md`.
- `/about` page.
- `/demo` split view with the scenario autopilot bar (Next step, Play, speed, Auto-advance).
- Visual polish: calm high-contrast palette, big type on the patient screen.
- **Stretch:** gesture yes/no with MediaPipe.
- *Done when:* `npm run eval` writes results and all checks pass.

**Phase 7: Handover notes**
- Update `README.md` with: how to run locally, how to deploy to Vercel, how to switch off demo mode, how to add ASL videos, and a 2-minute demo click-path.
- Final `NOTES.md` summary of what's done, what's stubbed, and everything in "Needs a human".

---

## 11. Hosting notes (log in README)

- The hosted demo link (Vercel free tier) runs in **mock mode**. A hosted server cannot reach Ollama on the team's laptop.
- On-device mode works when the app runs locally (`npm run dev`) with Ollama running on the same machine.
- Microphone input needs Chrome and a page served over `https` or `localhost`. Typed input must always work as the fallback.

## 12. Things humans will do (do not attempt)

- Record ASL videos with a fluent Deaf signer and drop them in `public/asl/`.
- Have fluent speakers verify translations and flip `translationsVerified` to true.
- Add the real API key, rerun `npm run translate:questions` and `npm run eval`.
- Deploy to Vercel for the demo link.
- Interview an EMT and update the question bank from their feedback.