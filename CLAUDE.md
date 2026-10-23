# CLAUDE.md: FirstWords

You are building **FirstWords**, a hackathon prototype for the Freeman AI Innovation Challenge (AI in Healthcare). Read `SPEC.md` fully before writing any code. It is the source of truth.

## How to work tonight

- You are running unattended overnight. **Do not stop to ask questions.** When something is ambiguous, pick the simplest reasonable option, write it down in `NOTES.md` under "Decisions", and keep going.
- Work through the phases in `SPEC.md` **in order**. Finish each phase's acceptance criteria before starting the next.
- After each phase:
  1. Run `npm run typecheck`, `npm run test`, and `npm run build`. Fix every failure before moving on.
  2. Commit with a message like `phase 2: patient screen + answer widgets`.
  3. Add a short entry to `NOTES.md` under "Progress": what works, what's stubbed, anything the team must do by hand.
- If a phase is blocked (missing key, missing asset, a library that won't install), stub it cleanly, log it in `NOTES.md` under "Needs a human", and continue with the next phase. Never leave the app in a state where `npm run build` fails.
- Prefer working and simple over clever. This is a 2-minute demo, not production.

## Hard rules

- **The app must fully work with no API key and no local model.** `AI_PROVIDER=mock` (the default) uses canned responses from `src/lib/mock/`. The `anthropic` and `ollama` providers are only used when selected in `.env`. Do not try to download or run local models yourself; the team will install Ollama and test that path. The demo video must never depend on the network.
- **No patient data is stored.** Sessions live in memory and browser storage only, and are cleared on "End call". No database, no analytics, no logging of answers to the server console.
- **Zero cost by default.** Mock mode and the keyword baseline need nothing. On-device mode uses free local models. Never make a paid API call unless `AI_PROVIDER=anthropic` is explicitly set by the team.
- **No new accounts or paid services.** Do not add Supabase, Firebase, Vercel KV, Twilio, or anything that needs signup.
- Show a small persistent footer on every screen: "Prototype for demonstration. Not for clinical use."
- No em dashes in any user-facing text.
- Never invent ASL content. ASL videos are recorded by a human signer later (see `SPEC.md`, ASL section). Build the slots and the fallback only.
- Red-flag logic is **deterministic rules in code**, not LLM judgment. The LLM may only write the plain-English explanation shown next to a flag.

## Stack (do not change without logging why)

- Next.js (App Router) + TypeScript (strict) + Tailwind CSS
- Anthropic TypeScript SDK (`@anthropic-ai/sdk`), model `claude-sonnet-5-5`, structured outputs via tool use with JSON schemas
- Ollama's native `/api/chat` endpoint with a JSON-schema `format` for the on-device provider (plain `fetch`, no extra SDK needed). Default model `qwen3:1.7b`, sized for a laptop with about 8 GB of free memory.
- Zod for every schema shared between client and API routes
- Browser Web Speech API for speech-to-text and `speechSynthesis` for text-to-speech, with a typed text input fallback
- `@mediapipe/tasks-vision` Gesture Recognizer for the stretch gesture feature only
- Vitest for unit tests
- Cross-window sync with `BroadcastChannel` (EMT window, patient window, and ER window on the same device)

## Code conventions

- Keep files small and named by what they do. Put pure logic in `src/lib/`, UI in `src/components/`, pages in `src/app/`.
- All clinical logic (rules engine, chart merge, question flow) must be pure functions with unit tests.
- All user-facing strings for patients come from `src/data/questions.json` and `src/data/ui-strings.json`, never hardcoded in components.
- Touch targets on the patient screen are at least 64px tall. Body text on the patient screen is at least 24px.
- Must work in landscape on an iPad-sized screen (1024x768) and on a laptop.

## Commands to set up in package.json

- `dev`, `build`, `start`, `lint`, `typecheck` (`tsc --noEmit`), `test` (`vitest run`)
- `translate:questions`: script that fills missing translations in `questions.json` using the API (skips when no key)
- `eval`: runs the scenario eval and writes `eval/results.md`