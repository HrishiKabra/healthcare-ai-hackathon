# FirstWords field test with Tulane EMS

A 30-minute role-play test per EMT. It produces the evidence for the submission's "Assumptions tested" and "Build evidence" answers: timed head-to-head runs, accuracy against a known script, a standard usability score, and quotes.

This is a simulated test of a student hackathon prototype. There are no real patients and no real patient information. It is not a Tulane EMS activity, and it does not evaluate the EMTs: it evaluates the tool.

## What we are testing

| # | Assumption | How this test checks it |
|---|---|---|
| A1 | Today, with a patient who does not speak English (or is Deaf), key facts come out slowly, incompletely, or wrong. | Usual-method runs: time to each fact, facts correct, red flag found, interpreter needed. |
| A2 | Patients can answer through the app, in their language or in ASL. | FirstWords runs: facts obtained and correct. Role-player debrief. |
| A3 | Confirm-back catches misunderstandings before they reach the chart. | Count of answers the patient rejected on the confirm screen. |
| A4 | EMTs find it usable, trust it, and would use it on a real call. | System Usability Scale (SUS), confidence rating, "would you use it". |
| A5 | The handoff is what a receiving crew (NOEMS) or ED needs. | Debrief question 4, with the handoff on screen. |

## Design

- **Within-subjects crossover.** Each EMT runs two different role-played patients: one with FirstWords and one their usual way.
- **Alternate who starts.** Half the EMTs start with FirstWords, half with the usual method. The `/drill` page suggests the next method for each tester code.
- **Different patient each time,** so the EMT cannot remember answers. `/drill` warns when a tester picks a patient they have already seen.
- **Cap each run at 8 minutes.** If the EMT has not finished, stop the run there.
- **Aim for 4 to 6 EMTs.** About 30 minutes each, including the survey and debrief.

## Roles

- **Facilitator:** sets up each run on `/drill`, runs the stopwatch in the usual-method arm, keeps time, asks the debrief questions. Does not coach.
- **Role-player:** plays the patient from their card (`testing/patient-cards/`). Native speakers answer naturally in their language. Others read the card lines. Never speaks English. Can point, gesture, and show pain.
- **Note-taker** (optional): writes down quotes, word for word, and where the EMT hesitated.

## Setup (15 minutes before the first EMT)

1. One laptop runs the app.
   - **Best:** on-device mode, so role-players can answer freely. In `.env`: `DEMO_MODE=false`, `AI_PROVIDER=ollama`, `OLLAMA_MODEL=qwen3:1.7b`. 1.7b is faster than 4b for live use.
   - Restart `npm run dev`. Send one test answer to load the model before the first EMT; the first call is slow.
2. The patient screen must be a window of the same browser on the same laptop. Options:
   - An iPad as a second display through Sidecar (Mac: Control Center, Screen Mirroring, pick the iPad). Touch works on the iPad.
   - An external monitor.
3. Open `http://localhost:3000/drill`. Check that `/drill/results` is empty, or export and clear old runs.
4. Print the patient cards, or have them on a phone for each role-player.
5. Volume up on the laptop: questions are read aloud to the patient.

**Plan B: no model, or it is too slow.** Use demo mode (`DEMO_MODE=true`). Taps work as usual. Typed answers are understood only when the role-player types a card line exactly (punctuation does not matter). Note in the results that free answers were scripted.

## Running one EMT (about 30 minutes)

1. **Consent (1 minute).** Read this:
   > "Thanks for helping. This is a simulated test of a student hackathon prototype called FirstWords. There are no real patients. We record only how long things take, which facts you got, and your survey answers, under a code, not your name. This tests the tool, not you. You can stop at any time. Is that OK?"
2. **Tester code.** Initials or a number (for example E1). Never a full name.
3. **Briefing (2 minutes, same for everyone).**
   > "You are first on scene. The patient does not speak English, or is Deaf. Do your assessment as you normally would until you would hand off to NOEMS or transport. Say 'done' when you would hand off."

   Before the FirstWords run only, give a 60-second tour: the question list, Next question, the Conversation panel, the red flag banner, and Generate handoff. Before the usual run, say: "Use anything you would normally use, like your phone or gestures."
4. **Run 1.**
   - FirstWords: on `/drill`, pick the method and patient, press Prepare, open the patient window on the patient's screen, press Start drill. The EMT presses **Finish drill**.
   - Usual method: the facilitator presses **Start the clock**, taps each button the moment the EMT has that fact, then **stop the clock**. Ask the EMT for their handoff and enter only what they actually found out.
5. **Survey 1.** Hand the laptop to the EMT.
6. **Run 2,** with the other method and a different patient. Then survey 2.
7. **Debrief (5 minutes).** Write answers down word for word:
   1. "How do you handle a patient who doesn't speak English today? How often does it happen?"
   2. "Compared to that, what did FirstWords do better or worse?"
   3. "Was there a moment you didn't trust what it told you?"
   4. "Look at this handoff (open the ER window, or `/er`). Is this what NOEMS or the ED needs? What is missing?"
   5. "Would you want this on the truck? What would stop you?"
8. **Role-player debrief (1 minute):** "Could you answer everything you wanted to? Was anything confusing on the patient screen?"

## After the session

- `/drill/results` shows the comparison. Take a screenshot for the submission and slides. **Export CSV** and **Export JSON** and commit them to `testing/results/` (they contain codes, timings, and survey answers only).
- With permission only, take photos of the setup or of hands on the tablet, no faces unless they agree.
- Turn the numbers into the submission answers with `testing/results-to-submission.md`.

## Honest limits to state

- Small numbers, a pilot, not a study.
- Role-played patients, not real ones. Patients who know they are acting answer more clearly than a patient in pain.
- EMTs saw FirstWords for the first time. Real use would come after training.
- Translations are machine or unverified. If a native-speaker role-player says a translation was wrong, write it down: that is a finding.
- This is product feedback for a prototype, not human-subjects research. If the team wants to publish the results, it needs IRB review first.
