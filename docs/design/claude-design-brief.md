# FirstWords: design brief for Claude Design

How to use this: start a new Claude Design project, upload every image in `docs/design/current/` (they show the app as it is today), and paste the prompt below. Then work through the priorities one screen at a time.

---

## Prompt to paste

> Redesign the interface of **FirstWords**, a working hackathon prototype for the Freeman AI Innovation Challenge (AI in healthcare). The attached screenshots are the current app; keep every function and piece of content, and make it look and feel like a credible, calm, professional clinical product that a judge would believe could ship. Read the full brief below before designing. Start with a design system (color, type, spacing, components), then the patient screen, then the EMT console, then the handoff screen, then the demo split view. Deliver high-fidelity mockups at the exact sizes given, every state listed, and Tailwind v4 theme tokens plus React component markup I can port into a Next.js app.

---

## 1. What FirstWords is

An EMT (emergency medical technician) arrives at a patient who cannot communicate with the crew: they speak another language, are Deaf, or cannot speak (for example after a stroke). The EMT runs the standard field assessment on a laptop or tablet console. The patient answers on a tablet, in their own language (Spanish, Vietnamese, Mandarin, Arabic, Hindi, Portuguese), in ASL (signed question videos plus taps), or on a picture board.

- AI translates and reads the patient's free answers, turning them into a structured chart.
- **Red flags come from fixed rules in code, never from the AI.** For example: chest pain plus an aspirin allergy, a blood thinner plus a head strike, or a stroke screen positive.
- Every answer is shown back to the patient in their language ("You said: ... Is this right?") before it counts as confirmed.
- The crew sends an English handoff (MIST format) to the receiving team: arriving paramedics (NOEMS) or the emergency department. The handoff includes the patient's communication needs ("Spanish interpreter needed on arrival").

**First user:** Tulane EMS, a student-run ambulance service on Tulane's campus. It is often first on scene before New Orleans EMS paramedics. Tulane's international students come largely from India, Vietnam, China, Mexico, and Brazil.

**Where it is seen:**
- A 2-minute demo video.
- A 5-minute live pitch to judges, one of them a healthcare-tech founder.
- A live test with real EMTs and role-played patients.

## 2. The people and the setting (design for these, not for a desk)

- **The patient** is in pain, scared, possibly elderly, possibly drunk, possibly unable to read well, and may not speak English at all. They hold or face a tablet in an ambulance, on a sidewalk, or in a dorm hallway, in sunlight or at night. They may have shaky hands. They must understand the screen with no instructions, in their own script, in seconds.
- **The EMT** is standing, wearing gloves, glancing between the patient and the screen, under time pressure. They need to see at a glance what has been confirmed, what has not, and any red flag, and never miss a red flag.
- **The receiving crew** (paramedic or ED nurse) reads the handoff in 20 seconds. Red flags and the interpreter box must jump out.
- **The judges** see it in a video and on a projector. It must read as clinical-grade, trustworthy, and specific to emergency care, not as a generic SaaS dashboard.

## 3. Hard constraints (must keep)

**Patient screen**
- Designed for a 1024x768 landscape tablet.
- Touch targets at least 64px tall; body text at least 24px, questions about 40px.
- Works with mouse and touch.

**Languages**
- Must render Latin with Vietnamese diacritics, Simplified Chinese, Arabic, and Devanagari.
- **Arabic is right-to-left:** layouts must mirror. Use logical properties (start/end), not left/right.
- Long translations must not overflow; Vietnamese and Portuguese run long.

**Fonts and network**
- No runtime network dependency: the demo must run offline.
- Fonts must be system fonts or self-hosted files committed to the repo.
- If you propose a typeface, pick one with full coverage, or a family with matched scripts (for example a Noto pairing), and say how it ships.

**Color and meaning**
- Color is never the only signal: every status has an icon and a word.
- Must meet WCAG AA contrast and read in daylight on a tablet. Light theme first; dark is optional.

**Text and labels**
- A small footer on every screen: "Prototype for demonstration. Not for clinical use."
- No em dashes in any user-facing text.
- Keep the wording that shows the AI does not decide red flags. Each flag shows "Rule N" plus the triggering facts.
- Any AI-written text is labeled "AI summary, review before use".

**ASL**
- ASL content is never generated. The ASL slot shows a looping video when a human-recorded clip exists. Otherwise it shows the pictogram, the English text, and "ASL video coming soon".

**Patient data**
- Nothing is stored. Do not design accounts, patient lists, history, or sign-in.

## 4. Information states (the most important thing to get right)

Every chart value has one of these states; they must be distinguishable at a glance, in color and in shape or icon:

| State | Meaning | Today |
|---|---|---|
| Confirmed | The patient said "Yes, that is right" | green check |
| Not confirmed yet | Proposed, waiting for the patient | purple dashed outline |
| Low or medium confidence | AI was unsure | small colored chip |
| Conflicting | Two answers disagree (for example "no allergies" then "aspirin") | amber outline plus "Conflicting" |
| Rejected | The patient said "No, ask again" | struck through |
| Translating | Waiting for the model (can take 3 to 20 seconds) | spinner plus a seconds counter |
| Not translated or failed | The translation cannot be trusted | amber or red text |

Red flags have two levels: **critical** (red) and **warning** (amber, for example "Check blood sugar"). Flags never auto-dismiss; the EMT presses Acknowledge.

Each question in the EMT's queue is one of: Not asked, Asked, Answered, Confirmed, or Skipped. An amber dot marks an unverified translation.

## 5. Screens, in priority order

Sizes: the patient screen is 1024x768. Everything else is 1440x900, and must still work at 1024 wide. Today's screenshot for each is in `docs/design/current/`.

### P1. Patient screen (`03` to `06`, `08` to `11`)

The emotional center of the product: make it warm, very clear, and dignified.

**Layout.** A question card at the top shows:
- The question in the patient's language, large.
- The English underneath, small.
- A "Read aloud" button.
- An optional green reassurance line. Example: "We ask only for your safety. Please tell us the truth so we can help you."

The answer area sits below the card.

**Answer types:**
- **Yes / No:** two huge buttons with icons.
- **Choice:** a grid of icon tiles. Single or multi select; multi select has a "Done" button.
- **0 to 10 pain scale** with six drawn faces (not emoji).
- **Body map:** front and back figures with 12 tappable regions, multi-select, plus "It does not spread".
- **Duration:** "A few minutes", "About 1 hour", ... "I do not know", plus an optional exact number.
- **Free answer:** a big mic button ("Tap and speak") plus a textarea plus "Send".
- **Instruction:** for example "Please smile for me"; the patient taps OK while the EMT watches.

**"Or say it / type it":** a collapsible free answer under every tapped widget in spoken mode.

**Flow states:**
- Waiting: "The crew will ask you a question soon".
- Thinking: "One moment, we are reading your answer".
- Confirm-back: "You said: ... Is this right?", with "Yes, that is right" and "No, ask again".
- Thank you.
- Call ended.
- Could not understand.

**Modes:**
- **Spoken:** text-first.
- **ASL:** a 360px video slot beside the question.
- **Picture board:** icon-first, bigger pictograms, minimal text.

**First screen:** "Point to your language", with six languages, each in its own script.

**Today's look:** a "laminated triage card" with a thick amber band on the leading edge. It is solid but generic. We want something that feels made for this moment.

### P2. EMT console (`02`, `12`)

**Header:**
- FirstWords, the time on scene, and the patient's mode and language (tap to change).
- A provider badge ("Demo", "On-device (qwen3:1.7b)", "On-device (offline, keyword fallback)").
- "Patient window", "ER window", "Call live interpreter", "End call" (red).

**Red flag banner:** sticky, full width, critical or warning. It shows the title, "Rule N: plain rule", the facts that triggered it, an explanation, and "Acknowledge". Today it is huge and pushes everything down. Find a way to keep it unmissable but compact, perhaps expanding on demand. Several flags can stack.

**Left column: question queue.**
- Questions grouped by phase: Opening, OPQRST, SAMPLE, Follow-up, Stroke check, Closing.
- Each question shows its status and an unverified-translation dot.
- "Next question" (primary).
- Stroke checks: Yes/No buttons the EMT taps for facial droop and arm drift.
- "Ask your own question" box (mic plus text, shows the translation sent).
- "Auto-advance" toggle.

**Middle column:**
- **Conversation panel:** a live transcript.
  - EMT lines: the English question plus "Patient saw: <translation>".
  - Patient lines: their own words plus the English translation.
  - Tap lines: "Patient tapped: Yes, I have an allergy".
  - Status chips, a translating spinner, and allergen-check notes.
  - "Read answers aloud" toggle.
- **Live chart:** one row per field (Chief complaint, Onset, Activity, Better or worse, Quality, Location, Radiates to, Severity, Allergies, Medications with drug class, Conditions, Last oral intake, Head strike, Pregnancy, Alcohol or drugs today, Facial droop, Arm drift, Speech abnormal, Last known well, Notes).
  - Each value shows its state, its confidence, and a "Source" line (tapped, or the patient's words with the English meaning).
  - Today the source lines are very wordy. Find a lighter way, for example progressive disclosure.

**Right column:**
- Handoff receiver switch ("NOEMS crew" / "Emergency dept") and "Generate handoff". After sending: "Sent to NOEMS crew at 19:13".
- Patient details: approximate age, sex, vitals (HR, BP, SpO2, RR, glucose), and treatment checkboxes.
- "Speech problem observed".

**Before a mode is chosen:** "How will this patient communicate?" offers Spoken (with a language grid), ASL, or Picture board.

**Today's problems:**
- Three dense columns of identical bordered cards.
- Everything has the same weight.
- Hard to scan in two seconds.

The console must answer three questions in one glance: what is next, what is wrong, and what is confirmed.

### P3. Handoff for the receiving crew (`07`)

**Header:** "Handoff to arriving NOEMS crew" (or "the emergency department"), the patient line ("Patient, about 19 years old, female"), "Received 18:31", Copy, Print.

**Order:**
- **Communication box first** (interpreter needed, language, preferred mode). For NOEMS, red flags come first.
- **MIST:** M (medical complaint or mechanism), I (injuries and inspection findings), S (signs and symptoms, vitals), T (treatment so far).
- Allergies, and medications with drug class.
- History.
- "Unconfirmed, low confidence, or conflicting (verify before acting)" in its own clearly separate box.
- An optional "AI summary, review before use".

**Print:** it must print cleanly on one page.

### P4. Demo split view (`13`)

Used to record the video. It shows:
- An autopilot bar: scenario picker grouped "Demo scenarios" and "Tulane campus", Restart, Next step, Play, 1x/2x, Auto-advance.
- The EMT console.
- The patient screen in a tablet frame, scaled from a true 1024x768 layout.
- A receiving-screen panel that slides in when the handoff is sent.

**Today's problem:** once the handoff panel slides in, it covers the patient tablet, and the EMT pane is cramped and scrolls. Design a 1440x900 composition where all three are legible on camera at once, or a deliberate transition between them.

### P5. Start page (`01`)

**Today it has:**
- A "Start new call" primary action.
- A "Split-screen demo" link.
- The current call shortcuts.
- Scenario cards in two groups, Tulane campus and Demo scenarios.
- Links: Field test with Tulane EMS, About, Evaluation, Patient widget preview.
- AI settings (demo or on-device, model preset, Test connection, gesture answers).

**What we want:** it should introduce the product in one look, without a marketing hero cliche.

### P6. Field test pages (`14`, `15`)

These are internal, for a 30-minute test with EMTs. The results page will be screenshotted for the pitch.

**`/drill`:** tester code, method (FirstWords or usual method), role-played patient, Prepare, then "Open patient window" and "Start drill".

**During a drill:** a slim amber bar over the console with the elapsed time and "Finish drill".

**Usual method:** a big stopwatch and big "Got the chief complaint / onset / allergies / medications / Spotted the red flag" buttons, then a short "what did the EMT record" form.

**Survey:** 10 System Usability Scale statements with 1 to 5 radio scales, confidence, "Would you use it", and free text.

**Results:**
- A comparison table: FirstWords vs usual method, with median time to each fact, key facts correct, red flag found, misunderstandings caught, EMT confidence, and SUS.
- A horizontal grouped bar chart. Today's chart colors are blue `#2a78d6` and orange `#eb6834`, validated for color blindness; keep a validated pair.
- EMT quotes and a run list with export.

## 6. Current design system (replace freely, but keep the semantics)

Tailwind v4 `@theme` tokens in `src/app/globals.css`:

```
ink #0f1b2d   ink-soft #3d4b5f   muted #6b7789   line #d5dbe3
surface #ffffff   canvas #f2f5f8
brand #0b5d7a   brand-strong #07435a   brand-soft #e3f1f6
critical #b4232c / soft #fdecec     warning #9a5b00 / soft #fff4dc
ok #1d7a3e / soft #e6f5ea          signal (amber band) #f2b705 / soft #fff6d6
yes #17693a   no #a51e27           unconfirmed #7a4fb5 / soft #f2ecfb
font: system stack with Noto fallbacks for Devanagari, Arabic, Simplified Chinese
icons: lucide-react plus a few custom drawn icons (lungs, fall, belly, stairs, weak arm, dizzy, head hit, raise arms) and six drawn pain faces
```

## 7. Direction we want

- **Clinical, calm, trustworthy**, with one memorable signature element. It should not look like a fintech dashboard, an AI chatbot, or a cream-and-serif editorial page.
- **Borrow from the world of emergency care:** the visual language of triage tags, reflective ambulance markings, laminated field cards, and monitor displays. Be restrained: it is a medical tool, not a costume.
- **Hierarchy over boxes.** Fewer bordered cards, more typographic hierarchy and whitespace. Status should pop and everything else should recede.
- **Make the patient screen feel humane:** large type, generous spacing, friendly drawn icons, and no clutter. The patient is the hero of the demo.
- **Show "AI translated, patient confirmed, rule flagged"** as a visible, consistent pattern. That chain is the product's safety story.
- **A small logo or wordmark for FirstWords,** usable as a favicon. Today it is plain text.

## 8. Real content to design with (do not use lorem ipsum)

**Spanish chest pain:**
- Question: "¿Qué es lo que más le molesta ahora mismo?" (What is bothering you most right now?)
- Patient says: "Me duele mucho el pecho, como una presión." Translation: "My chest hurts a lot, like pressure."
- Red flag: "Chest pain with aspirin or NSAID allergy". Rule 3: Chest pain AND allergy to aspirin or NSAIDs. Facts: Chief complaint: Chest pain; Allergy: Aspirin.

**Vietnamese student fall:**
- "Em bị ngã cầu thang ở bữa tiệc, đầu đập vào bậc thang." Translation: "I fell down the stairs at a party and hit my head on a step."
- Red flag: "Head strike while intoxicated" (Rule 10).

**Portuguese peanut reaction:**
- "Sou alérgica a amendoim ... Não consigo respirar direito."
- Allergen check: the patient said "amendoim", which means peanut.
- Red flag: "Possible allergic reaction" (Rule 5).

**Arabic (right to left):** "كيف تشعر به؟" (What does it feel like?)

**Hindi:** "मुझे बहुत चक्कर आ रहे हैं, कमज़ोरी लग रही है।" Translation: "I am very dizzy and I feel weak." Red flag (warning): "Check blood sugar".

**Handoff communication box:** "Portuguese interpreter needed on arrival. Language: Portuguese (Português). Preferred mode: Spoken Portuguese. Answers by tapping or speaking on the tablet."

## 9. What to deliver

1. **A design system page:**
   - Color tokens with light values and contrast notes.
   - A type scale that covers all four scripts.
   - Spacing and radius.
   - Components: buttons (primary, secondary, danger, huge patient buttons), tiles, chips, status markers for every state in section 4, a red flag banner (critical and warning, collapsed and expanded), and chart rows.
   - The wordmark.
2. **Hi-fi mockups:**
   - **Patient:** a question with a choice grid in Spanish, the same in Arabic (mirrored), the body map, the pain scale, confirm-back, picture board mode, ASL mode with "coming soon", the language picker, and thinking.
   - **EMT console:** mid-call with a red flag and the conversation, plus the empty state before the mode is chosen.
   - **Handoff:** for NOEMS.
   - **Demo split view:** at 1440x900, with the handoff visible.
   - **Start page**, and **field test results** with sample data.
3. **Port-ready output:** Tailwind v4 `@theme` tokens, and React plus Tailwind markup for the patient question card, a choice tile, the yes/no buttons, the red flag banner, a chart row, the conversation lines, and the handoff MIST block, keeping the same props and content as today's components.

## 10. Code map (for the port)

Next.js App Router, TypeScript, Tailwind CSS v4; tokens live in `src/app/globals.css`.

| Area | Path |
|---|---|
| Patient | `src/components/patient/` (QuestionCard, ConfirmBack, AslSlot, PatientScreen, `widgets/` for each answer type) |
| EMT | `src/components/emt/` (EmtConsole, EmtHeader, QuestionQueue, Conversation, LiveChart, RedFlagBanner, HandoffButton, PatientInputs, ModePicker, FreeformComposer) |
| Handoff | `src/components/er/HandoffView.tsx` |
| Demo | `src/components/demo/` (DemoView, TabletFrame, AutopilotBar) |
| Start | `src/components/start/` |
| Field test | `src/components/drill/` |
| Shared | `src/components/shared/` (Footer, Icon, Modal, LanguageGrid, ProviderBadge) |

All patient-facing words come from `src/data/questions.json` and `src/data/ui-strings.json`. Do not hardcode copy in components.
