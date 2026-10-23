# FirstWords

Emergency assessment for patients who can't communicate with the crew.

An EMT runs the standard field assessment on a tablet. The patient answers however they can: in their own spoken language (Spanish, Vietnamese, Mandarin, Arabic, Hindi), in ASL (signed question videos plus taps), or on a picture board. Answers become a structured clinical chart, deterministic rules flag red flags live with their reasons, and the crew sends an English ER handoff (MIST) that includes the patient's communication needs.

Prototype for the Freeman AI Innovation Challenge (AI in Healthcare). **Prototype for demonstration. Not for clinical use.**

## Run it locally

You need Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:3000. It works with no API key and no network: by default every AI call is answered by canned demo responses and keyword matching.

| Screen | What it is |
|---|---|
| `/` | Start a call, load a demo scenario, AI settings |
| `/demo` | **Main demo surface.** EMT console and a tablet-framed patient screen side by side, with scenario autopilot and the ER handoff sliding in |
| `/emt?s=<id>` | EMT console (English) |
| `/patient?s=<id>` | Patient screen (patient's language). Open it from the console's "Patient window" button, or on a tablet on the same device |
| `/er?s=<id>` | ER handoff screen |
| `/eval` | Keyword matching vs. AI, run in the browser |
| `/about` | Data, privacy, and safety notes |
| `/patient?preview=1` | Click through every question and widget without a session |

The EMT, patient, and ER windows sync through the browser's `BroadcastChannel`, so they must be windows of the same browser on the same machine. `/demo` needs only one window.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` | ESLint |
| `npm run eval` | Scenario eval, writes `eval/results.md` |
| `npm run eval -- --provider anthropic` or `-- --provider ollama` | Eval against a real provider |
| `npm run eval:compare` | Every configured provider side by side |
| `npm run translate:questions` | Fills missing translations in `src/data/questions.json` with the API (skips without a key) |

## AI providers and switching off demo mode

Copy `.env.example` to `.env` and edit it. `.env` is git-ignored.

| Mode | `.env` | Notes |
|---|---|---|
| **Demo** (default) | `DEMO_MODE=true` | Canned responses for the 3 scenarios, keyword matching for anything else. No network, no cost. |
| **On-device** | `DEMO_MODE=false`, `AI_PROVIDER=ollama` | Free open models through [Ollama](https://ollama.com) on the same laptop. |
| **Cloud** | `DEMO_MODE=false`, `AI_PROVIDER=anthropic`, `ANTHROPIC_API_KEY=...` | Claude (`ANTHROPIC_MODEL`, default `claude-sonnet-5-5`). Paid. |

On-device setup (about 8 GB of free memory is enough for the default):

```bash
ollama pull qwen3:1.7b          # Light, about 1.5 GB (default)
# optional: ollama pull qwen3:4b   (Balanced, about 3 GB)
# optional: ollama pull gemma4:e2b (Better, about 5 GB or more)
```

Then set `DEMO_MODE=false` and `AI_PROVIDER=ollama`, restart `npm run dev`, open **AI settings** on the start page, pick a preset, and press **Test connection**. If Ollama is not running, the app falls back to keyword matching and the provider badge on the EMT console says so.

How the provider is chosen:
- `DEMO_MODE=true` (or unset) always means demo mode.
- Otherwise `AI_PROVIDER` is the default, and the settings panel can switch between demo and on-device at runtime.
- Cloud is used only when the team has set `AI_PROVIDER=anthropic` and a key in `.env`. A browser can never opt into a paid call.
- Keys are read only in server API routes and never reach the browser.

## Deploy to Vercel (free tier)

1. Push this repo to GitHub, then in Vercel choose **Add New, Project** and import it. The Next.js defaults are right.
2. No environment variables are needed: the hosted demo runs in demo mode.
3. Deploy. Share the `/demo` link.

The hosted site cannot reach Ollama on your laptop, so on-device mode only works when the app runs locally. The microphone needs Chrome and https or localhost. Vercel is https, and typing always works as the fallback.

## Adding ASL videos

ASL content must be recorded by a fluent Deaf signer. It is never generated. Until a clip exists, the patient screen shows the pictogram and English text with a small "ASL video coming soon" label.

Drop one MP4 per question into `public/asl/`, named by question id. No code change is needed. Use H.264, short (2 to 6 seconds), the signer centered, and no audio needed (clips play muted and loop).

```
public/asl/understand.mp4        Can you hear and understand me?
public/asl/chief_complaint.mp4   What is bothering you most right now?
public/asl/onset.mp4             When did it start?
public/asl/activity.mp4          What were you doing when it started?
public/asl/provocation.mp4       Does anything make it better or worse?
public/asl/quality.mp4           What does it feel like?
public/asl/region.mp4            Where on your body is it?
public/asl/radiation.mp4         Does it spread anywhere?
public/asl/severity.mp4          How bad is it, from 0 to 10?
public/asl/allergy_any.mp4       Are you allergic to any medicines?
public/asl/allergy_detail.mp4    Which medicine are you allergic to?
public/asl/medications.mp4       What medicines do you take?
public/asl/conditions.mp4        Do you have any medical conditions?
public/asl/last_oral_intake.mp4  When did you last eat or drink?
public/asl/head_strike.mp4       Did you hit your head?
public/asl/pregnancy.mp4         Are you pregnant, or could you be?
public/asl/stroke_smile.mp4      Please smile for me.
public/asl/stroke_arms.mp4       Please raise both arms and hold them up.
public/asl/stroke_speech.mp4     Please say: The sky is blue.
public/asl/last_known_well.mp4   When did you last feel normal?
public/asl/anything_else.mp4     Is there anything else we should know?
```

## Verifying translations

All translations in `src/data/questions.json` and `src/data/ui-strings.json` are unverified (written by the model overnight, with no API key available). The EMT console shows a small amber dot on questions whose translation is unverified. After a fluent speaker checks a question or choice, set its `translationsVerified.<lang>` to `true`.

## 2-minute demo click path

Record at 1440x900 or larger, in Chrome, at `/demo`. Demo mode needs no network. Use **2x** speed, and trim the waits in editing if needed.

| Time | Do | Say |
|---|---|---|
| 0:00 | `/demo`, scenario **Spanish speaker, chest pain** | "A Spanish-speaking patient with chest pain. The crew speaks English." |
| 0:08 | Press **Next step** twice | Point at the tablet: the question is in Spanish and read aloud. The patient says their answer in their own words; FirstWords confirms back what it understood, in Spanish. |
| 0:20 | Press **Play** (2x) | The chart fills in live, each field marked confirmed. |
| 0:35 | Red flag appears | "Rule 3: chest pain plus an aspirin allergy. The flag shows the rule and the facts. The AI never decides it." |
| 0:42 | Switch scenario to **Deaf ASL user, fall**, press **Play** | Signed-question slot, tap answers, "Eliquis" typed, normalized to apixaban, an anticoagulant. |
| 1:05 | Red flag: blood thinner with head strike | "Bleeding risk in the head." |
| 1:10 | Switch to **Picture board, stroke**, press **Play** | The patient cannot speak and answers with pictures; the EMT records facial droop and arm drift. |
| 1:35 | Stroke alert | "Last known well 1.5 hours ago, inside the treatment window." |
| 1:40 | Press **Generate handoff** | The ER panel slides in: MIST, red flags with reasons, unconfirmed items listed separately, and the communication box. |
| 1:55 | Point at the communication box and the footer | "Interpreter needed on arrival. Nothing is stored; End call wipes it." |

For a three-window version, open `/`, load a scenario, then use the console's **Patient window** and **ER window** buttons and the autopilot bar on the console.

## Evaluation

`npm run eval` runs 10 scripted cases (the 3 demo scenarios plus 7 more across all five languages, mostly colloquial free answers such as "tomo una pastilla para adelgazar la sangre, creo que se llama Xarelto" or "मैं खून पतला करने की दवा लेता हूँ") twice: through the AI provider and through keyword matching alone. Both use the same deterministic red-flag rules, so the difference is only how well free answers are read. Results go to `eval/results.md`. In demo mode the AI column is canned responses (the file says so in bold at the top). Rerun with a real provider to measure a model.

## How it is built

- Next.js (App Router) with TypeScript (strict) and Tailwind CSS. Zod for every shared schema. Vitest.
- `src/lib/`: pure logic with unit tests (`chart.ts` merge, `flow.ts` question flow, `rules.ts` red flags, `handoff.ts` MIST, `baseline.ts` keyword matching, `interpret.ts` confirm-back text), plus `ai/` (providers, prompts, routes' shared code) and `mock/`.
- `src/data/`: question bank, UI strings, med classes, languages, demo scenarios.
- `src/app/api/`: `translate`, `extract`, `explain-flag`, `handoff` (AI paragraph only), `provider-status`.
- Red flags are rules in code. The handoff is assembled in code from confirmed answers only. The AI only reads free answers, translates, and writes an optional, labeled summary.

See `NOTES.md` for decisions, progress, and what still needs a human.
