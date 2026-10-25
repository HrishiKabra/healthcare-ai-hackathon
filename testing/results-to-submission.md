# From field-test results to the submission

Open `/drill/results` after the session. Fill in the blanks from the table, keep the caveats, and paste.

## Build evidence (question 3)

Check: working prototype; tested on sample data; spoke with clinicians or experts (the EMTs).

> We tested FirstWords with [N] Tulane EMS EMTs on [date]. Each EMT ran two role-played patients (Spanish, Vietnamese, Hindi, Portuguese, or ASL), one with FirstWords and one with their usual method, in alternating order. We also ran 13 scripted eval cases through the full pipeline in all six languages and ASL, comparing the AI with keyword matching (`eval/results.md`).

## Assumptions tested (finalist criterion 4)

> **Assumption: today, key facts come out slowly or wrong with a patient who does not speak English.** In usual-method runs, EMTs got [X]% of the key facts right and found the red flag in [Y] of [N] runs. [Z] of [N] said they would have needed an interpreter. Median time to the allergy list: [time], or not obtained in [k] runs.
>
> **Assumption: FirstWords gets the facts faster and more accurately.** With FirstWords, EMTs got [X2]% of the key facts right, found the red flag in [Y2] of [N] runs, and reached the allergy list in a median [time2].
>
> **Assumption: confirm-back catches mistakes.** Patients rejected [R] answers on the confirm screen across [N] runs. Each was a misunderstanding that would otherwise have gone into the chart.
>
> **Assumption: EMTs would use it.** Mean usability score (SUS) [S] out of 100 (68 is average for software). [W] of [N] said they would use it on a real call. In their words: "[quote]".
>
> **What we changed because of it:** [one or two changes from the debrief].
>
> **Limits:** a small pilot with role-played patients, not a study. EMTs saw the tool for the first time. Translations are unverified until native speakers review them.

## Feasibility (question 4)

> **First user:** Tulane EMS, a student-run basic life support service on the Uptown campus (about 775 calls a year) that is often first on scene before NOEMS paramedics. Tulane's international students come largely from India, Vietnam, China, Mexico, and Brazil: the languages FirstWords speaks. **Payer:** Student Health already funds TEMS through the student fee; next, municipal EMS agencies and hospital systems, which carry language-access obligations. **Biggest risk:** a wrong translation in a clinical moment. **Plan:** the patient confirms every answer, red flags come from fixed rules rather than AI judgment, low confidence prompts a human interpreter, translations get native-speaker review, and the on-device mode keeps patient data off the network.
