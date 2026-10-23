# FirstWords eval results

> **Demo mode: these numbers are against canned mock responses, not a model.** The model column replays answers written for these cases (`src/lib/mock/answers.ts`), so it shows that the pipeline, rules, and scoring work end to end. It does not measure model quality. The keyword baseline column is real. Rerun with `npm run eval -- --provider anthropic` or `npm run eval -- --provider ollama`, or `npm run eval:compare`.

Run 2026-10-23 21:17 UTC. 10 cases. Scoring: chart fields against a gold chart, medications by drug class, allergies by category, red flags by rule id.

Skipped ollama: qwen3:1.7b is not pulled (run: ollama pull qwen3:1.7b).

Skipped anthropic: ANTHROPIC_API_KEY is not set.

## Summary

| Metric | Keyword baseline | Demo mocks (canned) |
|---|---:|---:|
| Field accuracy | 59% | 100% |
| Red flag recall | 45% | 100% |
| Red flag precision | 71% | 100% |
| Medication class accuracy | 86% | 100% |
| Allergy category accuracy | 100% | 100% |
| Average seconds per AI call | <0.01 | <0.01 |

Across 10 cases in Spanish, Vietnamese, Mandarin, Arabic, Hindi, English, and ASL, keyword matching found 59% of the gold chart fields and 45% of the red flags (precision 71%), while Demo mocks (canned) found 100% of the fields and 100% of the red flags (precision 100%). The baseline missed red flags in 6 cases (Spanish: chest pain (demo); Mandarin: dizziness on insulin; Hindi: fall on the stairs, blood thinner without a name; Arabic: tearing chest pain to the back; Spanish: belly pain in pregnancy; Mandarin: chest tightness, denies then reports an aspirin allergy), almost always because the chief complaint or the medicine was said in everyday words rather than a listed label or drug name. It also raised 2 false alarms: with the complaint unread, high pain looked like "severe pain, unknown cause". Red flags always come from the same deterministic rules; the only difference between the columns is how well free answers are turned into chart fields. That is what the product would lose without AI.

## Cases

| Case | Language | Fields, baseline | Fields, Demo mocks (canned) | Gold flags | Baseline flags | Demo mocks (canned) flags |
|---|---|---:|---:|---|---|---|
| Spanish, chest pain (demo) | Spanish | 3/4 | 4/4 | R3 | none (miss) | R3 |
| ASL, fall on blood thinner (demo) | ASL | 3/3 | 3/3 | R1 | R1 | R1 |
| Picture board, stroke (demo) | English | 3/3 | 3/3 | R2 | R2 | R2 |
| Spanish, fall in the bathroom, Xarelto described colloquially | Spanish | 1/2 | 2/2 | R1 | R1 | R1 |
| Mandarin, dizziness on insulin | Mandarin Chinese | 1/2 | 2/2 | R6 | none (miss) | R6 |
| Hindi, fall on the stairs, blood thinner without a name | Hindi | 2/3 | 3/3 | R1 | none (miss) | R1 |
| Vietnamese, trouble breathing with a penicillin-class allergy | Vietnamese | 0/1 | 1/1 | R5 | R5 | R5 |
| Arabic, tearing chest pain to the back | Arabic | 1/4 | 4/4 | R4 | R8 (miss) | R4 |
| Spanish, belly pain in pregnancy | Spanish | 2/3 | 3/3 | R7 | R8 (miss) | R7 |
| Mandarin, chest tightness, denies then reports an aspirin allergy | Mandarin Chinese | 0/2 | 2/2 | R3, R9 | R9 (miss) | R3, R9 |

R1 blood thinner with fall or head strike, R2 stroke alert, R3 chest pain with aspirin or NSAID allergy, R4 torn aorta, R5 allergic reaction, R6 check blood sugar, R7 pregnancy with belly pain or bleeding, R8 severe pain with unknown cause, R9 conflicting allergy or medication answers.

Cases live in `eval/scenarios/`. Each has scripted answers in the patient's language (mostly free answers, many colloquial) and a gold chart with gold red flags.
